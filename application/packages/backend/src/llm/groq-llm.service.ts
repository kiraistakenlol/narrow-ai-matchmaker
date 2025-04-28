import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { ILlmService } from './llm.interface';

@Injectable()
export class GroqLlmService implements ILlmService {
    private readonly logger = new Logger(GroqLlmService.name);
    private readonly groq: Groq;
    private readonly model: string;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('llm.groq.apiKey');
        this.model = this.configService.get<string>('llm.groq.modelName', 'llama3-8b-8192'); // Read from config, provide default

        if (!apiKey) {
            throw new Error('GROQ_API_KEY must be configured for GroqLlmService');
        }
        this.groq = new Groq({ apiKey });
        this.logger.log(`GroqLlmService initialized with model: ${this.model}`);
    }

    async generateResponse(
        userPrompt: string,
        systemPrompt?: string
    ): Promise<string> {
        this.logger.log(`Generating response using Groq model: ${this.model}`);

        try {
            const messages = [];
            
            // Add system prompt if provided
            if (systemPrompt) {
                messages.push({
                    role: "system",
                    content: systemPrompt,
                });
            }
            
            // Add user prompt
            messages.push({
                role: "user",
                content: userPrompt,
            });

            const chatCompletion = await this.groq.chat.completions.create({
                messages,
                model: this.model,
                temperature: 0.1, // Lower temperature for more deterministic output
            });

            const responseContent = chatCompletion.choices[0]?.message?.content;
            if (!responseContent) {
                throw new Error('Groq API returned an empty response content.');
            }

            this.logger.debug(`Raw Groq response: ${responseContent}`);
            this.logger.log(`Successfully generated response using Groq model: ${this.model}`);
            
            return responseContent;
        } catch (error) {
            this.logger.error(`Groq API call failed for model ${this.model}`, error);
            const message = error instanceof Error ? error.message : 'Unknown Groq API error';
            throw new InternalServerErrorException(`Failed to generate response using LLM: ${message}`);
        }
    }
} 