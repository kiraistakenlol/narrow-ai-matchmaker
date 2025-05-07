import { Controller, Post, HttpCode, HttpStatus, Logger, Body, ValidationPipe } from '@nestjs/common';
import { DevService } from './dev.service';
import { OnboardFromTextDto } from './dto/onboard-from-text.dto';

@Controller('dev')
export class DevController {
    private readonly logger = new Logger(DevController.name);
    constructor(private readonly devService: DevService) {}

    @Post('cleanup-database')
    @HttpCode(HttpStatus.OK)
    async cleanupDatabase(): Promise<{ message: string, truncatedTables: string[] }> {
        this.logger.warn('[DEV] Received request to cleanup database.');
        // Note: The ApiResponseInterceptor will wrap this response
        return this.devService.cleanupDatabase(); 
    }

    @Post('reindex-all-profiles')
    @HttpCode(HttpStatus.OK)
    async reindexAllProfiles(): Promise<{ message: string, profilesReindexed: number, errorsEncountered: number }> {
        this.logger.warn('[DEV] Received request to re-index all profiles.');
        // The ApiResponseInterceptor will wrap this response
        return this.devService.reindexAllProfiles();
    }

    @Post('onboard-user-from-text')
    @HttpCode(HttpStatus.OK)
    async onboardUserFromText(
        @Body(new ValidationPipe({ whitelist: true })) dto: OnboardFromTextDto
    ): Promise<{ message: string, userId: string, profileId: string, validationStatus: string }> {
        this.logger.warn('[DEV] Received request to onboard user from text.');
        // Pass only the text to the service method
        return this.devService.onboardUserFromText(dto.text);
    }

    // Add other dev endpoints here later (e.g., for seeding data)
} 