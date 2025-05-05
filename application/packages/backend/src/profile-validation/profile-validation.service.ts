import { Injectable, Logger } from '@nestjs/common';
import { ProfileData, ValidationRule, ProfileValidationResult } from '@narrow-ai-matchmaker/common';

@Injectable()
export class ProfileValidationService {
    private readonly logger = new Logger(ProfileValidationService.name);

    // Hardcoded rules for now - TODO: Make this configurable/injectable
    private readonly validationRules: ValidationRule[] = [
        {
            path: 'personal.name',
            checkType: 'existsAndNotEmptyString',
            hint: 'your name' // User requested hint
        },
        {
            path: 'roles',
            checkType: 'arrayNotEmpty',
            hint: 'project you\'re working on'
        }
        // Add more rules here
    ];

    /**
     * Safely gets a value from a nested object using a dot-separated path.
     * Returns undefined if the path is invalid or value doesn't exist.
     */
    private getValueByPath(obj: any, path: string): any {
        if (obj === null || typeof obj === 'undefined') {
            return undefined;
        }
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (current === null || typeof current !== 'object' || !(key in current)) {
                return undefined;
            }
            current = current[key];
        }
        return current;
    }

    /**
     * Validates a ProfileData object against the configured rules.
     */
    validateProfile(profileData: ProfileData | null): ProfileValidationResult {
        const failedHints: string[] = [];
        let isComplete = true;

        if (!profileData) {
            this.logger.log('Profile data is null, considering it incomplete.');
            // If profile is null, all rules effectively fail
            return {
                isComplete: false,
                hints: this.validationRules.map(rule => rule.hint)
            };
        }

        for (const rule of this.validationRules) {
            const value = this.getValueByPath(profileData, rule.path);
            let rulePassed = false;

            switch (rule.checkType) {
                case 'existsAndNotEmptyString':
                    rulePassed = typeof value === 'string' && value.trim().length > 0;
                    break;
                case 'arrayNotEmpty':
                    rulePassed = Array.isArray(value) && value.length > 0;
                    break;
                // Add more check types here
                default:
                    this.logger.warn(`Unknown validation checkType: ${rule.checkType} for path: ${rule.path}`);
                    // Treat unknown checks as passed to avoid blocking for unknown reasons
                    rulePassed = true; 
                    break;
            }

            if (!rulePassed) {
                this.logger.debug(`Validation failed for rule path: ${rule.path}, check: ${rule.checkType}, value: ${JSON.stringify(value)}`);
                failedHints.push(rule.hint);
                isComplete = false;
            }
        }

        this.logger.log(`Profile validation result: isComplete=${isComplete}, failedHints=${failedHints.length}`);
        return {
            isComplete,
            hints: failedHints
        };
    }
} 