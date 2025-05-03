import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingSession, OnboardingStatus } from './entities/onboarding-session.entity';
import { S3AudioStorageService } from '@backend/audio-storage/s3-audio-storage.service';
import { InitiateOnboardingRequestDto, InitiateOnboardingResponseDto } from './dto/initiate-onboarding.dto';
import { UserService } from '@backend/users/users.service';
import { ProfileService } from '@backend/profiles/profiles.service';
import { EventService } from '@backend/events/events.service';
import { Profile } from '@backend/profiles/entities/profile.entity';
import { EventParticipation } from '@backend/events/entities/event-participation.entity';
import { AwsTranscribeService } from '@backend/transcription/aws-transcribe.service';
import { Event } from '@backend/events/entities/event.entity';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        private audioStorageService: S3AudioStorageService,
        @InjectRepository(OnboardingSession)
        private onboardingSessionRepository: Repository<OnboardingSession>,
        private readonly userService: UserService,
        private readonly profileService: ProfileService,
        private readonly eventService: EventService,
        private readonly transcriptionService: AwsTranscribeService,
    ) {}

    async initiate(request: InitiateOnboardingRequestDto): Promise<InitiateOnboardingResponseDto> {
        let event: Event | null;

        if (request.event_id) {
            this.logger.log(`Initiating onboarding for specific event: ${request.event_id}`);
            event = await this.eventService.findEventById(request.event_id);
            if (!event) {
                throw new NotFoundException(`Event with ID ${request.event_id} not found.`);
            }
        } else {
            this.logger.log(`Initiating onboarding without specific event_id, finding first available event.`);
            event = await this.eventService.findFirstAvailableEvent();
            if (!event) {
                this.logger.error('No events found in the database to use for default onboarding.');
                throw new NotFoundException('No available events found for onboarding.');
            }
            this.logger.log(`Using event ${event.id} (${event.name}) for onboarding.`);
        }

        try {
            // 1. Create User
            const newUser = await this.userService.createUnauthenticatedUser();
            this.logger.log(`Created new user: ${newUser.id}`);

            // 2. Create initial Profile
            const newProfile = await this.profileService.createInitialProfile(newUser.id);
            this.logger.log(`Created initial profile: ${newProfile.id}`);

            // 3. Create initial Event Participation (using the determined event.id)
            const newParticipation = await this.eventService.createInitialParticipation(newUser.id, event.id, '');
            this.logger.log(`Created initial event participation: ${newParticipation.id} for event ${event.id}`);

            // 4. Create the Onboarding Session
            const newOnboarding = await this.onboardingSessionRepository.save(
                this.onboardingSessionRepository.create({
                    eventId: event.id,
                    userId: newUser.id,
                    profileId: newProfile.id,
                    participationId: newParticipation.id,
                    status: OnboardingStatus.AWAITING_AUDIO
                })
            );
            this.logger.log(`Created onboarding session with ID: ${newOnboarding.id}`);

            // 5. Construct storage key
            const fileExtension = '.webm';
            const storageKey = `onboarding/${newOnboarding.id}/audio-initial${fileExtension}`;
            const contentType = 'audio/webm';

            // 6. Generate the presigned URL
            const { uploadUrl, storagePath } = await this.audioStorageService.generatePresignedUploadUrl(
                storageKey,
                contentType,
            );
            this.logger.log(`Generated pre-signed URL for session ${newOnboarding.id} at path: ${storagePath}`);

            // 7. Return response
            return {
                onboarding_id: newOnboarding.id,
                upload_url: uploadUrl,
                s3_key: storagePath,
            };

        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to initiate onboarding session for event ${event.id}: ${message}`, stack);
            throw new InternalServerErrorException('Failed to initiate onboarding session.');
        }
    }

    async processAudio(onboardingId: string, s3_key: string): Promise<OnboardingSession> {
        this.logger.log(`Processing audio for onboarding: ${onboardingId}`);
        
        const onboarding = await this.onboardingSessionRepository.findOne({
            where: { id: onboardingId },
            relations: ['profile', 'eventParticipation'],
        });

        if (!onboarding || !onboarding.profile || !onboarding.eventParticipation) {
            throw new Error(`Session ${onboardingId} or required relations not found.`);
        }

        try {
            this.logger.log(`Starting transcription for onboarding ${onboardingId}, key: ${s3_key}`);
            const transcriptText = await this.transcriptionService.transcribeAudio(s3_key);
            this.logger.log(`Transcription completed for onboarding ${onboardingId}, transcript length: ${transcriptText?.length || 0}`);

            // Delegate profile processing to ProfileService with TEXT
            await this.profileService.processProfileUpdate(onboarding.userId, transcriptText);
            
            // Delegate event participation processing to EventService with TEXT
            await this.eventService.processParticipationUpdate(onboarding.userId, onboarding.eventId, transcriptText);
            
            this.logger.log(`Updated profile and event participation data for onboarding ${onboardingId}`);
            
            onboarding.status = OnboardingStatus.COMPLETED;
            await this.onboardingSessionRepository.save(onboarding);
            
            this.logger.log(`Updated session ${onboardingId} status to ${onboarding.status}`);
            
            // Re-fetch to include potentially updated relations if needed by caller
            const updatedSession = await this.onboardingSessionRepository.findOne({
                where: { id: onboardingId }, 
                relations: ['profile', 'eventParticipation'] 
            });
            
            if (!updatedSession) {
                 throw new InternalServerErrorException('Failed to reload session after update.');
            }
            return updatedSession;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown processing error';
            this.logger.error(`Audio processing failed for session ${onboardingId}: ${message}`, error instanceof Error ? error.stack : undefined);
            
            // Attempt to update session status to failed
            try {
                 const currentSession = await this.onboardingSessionRepository.findOneBy({ id: onboardingId });
                 if (currentSession) {
                     currentSession.status = OnboardingStatus.FAILED;
                     await this.onboardingSessionRepository.save(currentSession);
                     this.logger.log(`Updated session ${onboardingId} status to ${OnboardingStatus.FAILED}`);
                 } 
            } catch (saveError) {
                 this.logger.error(`Failed to update session ${onboardingId} status to FAILED after processing error: ${saveError}`);
            }
            
            throw error; // Re-throw the original processing error
        }
    }

    private calculateProfileCompleteness(profile: Profile): number {
        // Simple implementation - can be enhanced based on requirements
        if (!profile.data) return 0;
        
        const data = profile.data as any;
        let completeness = 0;
        
        if (data.name) completeness += 50;
        if (data.interests && Array.isArray(data.interests) && data.interests.length > 0) completeness += 50;
        
        return completeness;
    }

    private calculateEventCompleteness(eventParticipation: EventParticipation): number {
        // Simple implementation - can be enhanced based on requirements
        if (!eventParticipation.contextData) return 0;
        
        const data = eventParticipation.contextData as any;
        let completeness = 0;
        
        if (data.goals && Array.isArray(data.goals) && data.goals.length > 0) completeness += 70;
        if (data.availability) completeness += 30;
        
        return completeness;
    }

    private determineOnboardingStatus(profileCompleteness: number, eventCompleteness: number): OnboardingStatus {
        if (profileCompleteness >= 0.9 && eventCompleteness >= 0.9) {
            return OnboardingStatus.COMPLETED;
        } else if (profileCompleteness >= 0.7 && eventCompleteness >= 0.7) {
            return OnboardingStatus.READY_FOR_REVIEW;
        } else if (profileCompleteness >= 0.5 || eventCompleteness >= 0.5) {
            return OnboardingStatus.NEEDS_CLARIFICATION;
        } else {
            return OnboardingStatus.AWAITING_AUDIO;
        }
    }
}