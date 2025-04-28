import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ILlmService } from './llm.interface';
import { GroqLlmService } from './groq-llm.service';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: ILlmService,
            useFactory: (configService: ConfigService) => {
                const provider = configService.get<string>('llm.provider');
                const logger = new Logger('LlmModule');
                logger.log(`LLM provider selected: ${provider}`);

                switch (provider) {
                    case 'groq':
                        return new GroqLlmService(configService);
                    // Add cases for 'anthropic', etc.
                    default:
                        logger.warn(`LLM provider '${provider}' not recognized. Defaulting to Groq.`);
                        return new GroqLlmService(configService);
                }
            },
            inject: [ConfigService],
        },
    ],
    exports: [ILlmService],
})
export class LlmModule {} 