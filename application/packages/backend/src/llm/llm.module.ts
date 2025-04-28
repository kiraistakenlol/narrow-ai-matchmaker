import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ILlmService } from './llm.interface';
import { GrokLlmService } from './grok-llm.service';

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
                    case 'grok':
                        return new GrokLlmService(configService);
                    // Add cases for 'anthropic', etc.
                    default:
                        throw new Error(`LLM provider '${provider}' not recognized. Please configure a valid provider.`);
                }
            },
            inject: [ConfigService],
        },
    ],
    exports: [ILlmService],
})
export class LlmModule {} 