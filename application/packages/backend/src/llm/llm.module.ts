import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ILlmService } from './llm.interface';
import { MockLlmService } from './mock-llm.service';
import { GroqLlmService } from './groq-llm.service';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: ILlmService,
            useFactory: (configService: ConfigService, mockService: MockLlmService) => {
                const provider = configService.get<string>('llm.provider');
                const logger = new Logger('LlmModule');
                logger.log(`LLM provider selected: ${provider}`);

                switch (provider) {
                    case 'mock':
                        return mockService;
                    case 'groq':
                        return new GroqLlmService(configService);
                    // Add cases for 'anthropic', 'groq', etc.
                    default:
                        logger.error(`Invalid LLM_PROVIDER: ${provider}. Defaulting to mock.`);
                        return mockService;
                }
            },
            inject: [ConfigService, MockLlmService], // Inject dependencies needed by the factory AND the created services
        },
        // Provide the concrete services needed by the factory
        MockLlmService,
        // OpenAiLlmService, // Add when implemented
    ],
    exports: [ILlmService],
})
export class LlmModule {} 