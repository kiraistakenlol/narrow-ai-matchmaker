import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ILlmService } from './llm.interface';

// Define error interface for API errors
interface ApiError extends Error {
    response?: {
        status: number;
        data: any;
    };
}

@Injectable()
export class GrokLlmService implements ILlmService {
    private readonly logger = new Logger(GrokLlmService.name);
    private readonly openai: OpenAI;
    private readonly model: string;

    constructor(private configService: ConfigService) {
        this.logger.log('Initializing GrokLlmService...');
        
        const apiKey = this.configService.get<string>('GROK_API_KEY');
        const model = this.configService.get<string>('GROK_MODEL_NAME');
        const baseURL = this.configService.get<string>('GROK_API_BASE_URL', 'https://api.x.ai/v1');
        
        this.logger.debug(`Configuration values - API Key: ${apiKey ? 'Present' : 'Missing'}, Model: ${model || 'Not set'}, BaseURL: ${baseURL}`);
        
        if (!apiKey) {
            this.logger.error('GROK_API_KEY is not configured');
            throw new Error('GROK_API_KEY is not configured.');
        }
        if (!model) {
            this.logger.error('GROK_MODEL_NAME is not configured');
            throw new Error('GROK_MODEL_NAME is not configured.');
        }
        
        this.model = model;
        
        const maskedKey = this.maskApiKey(apiKey);
        this.logger.log(`Grok service initialized with API key: ${maskedKey}`);
        
        try {
            this.openai = new OpenAI({
                apiKey: apiKey,
                baseURL: baseURL,
            });
            this.logger.log(`OpenAI client initialized with baseURL: ${baseURL}`);
        } catch (error: unknown) {
            const err = error as Error;
            this.logger.error(`Failed to initialize OpenAI client: ${err.message}`, err.stack);
            throw new Error(`Failed to initialize OpenAI client: ${err.message}`);
        }
        
        this.logger.log(`Grok service initialized with model: ${this.model}, BaseURL: ${baseURL}`);
    }
    
    /**
     * Masks an API key for logging purposes
     * Shows first 4 and last 4 characters, masks the rest
     */
    private maskApiKey(apiKey: string): string {
        if (!apiKey || apiKey.length < 8) {
            return '***';
        }
        
        const firstFour = apiKey.substring(0, 4);
        const lastFour = apiKey.substring(apiKey.length - 4);
        const maskedLength = apiKey.length - 8;
        const maskedPart = '*'.repeat(Math.min(maskedLength, 8));
        
        return `${firstFour}${maskedPart}${lastFour}`;
    }

    async generateResponse(
        userPrompt: string,
        systemPrompt?: string
    ): Promise<string> {
        this.logger.log(`Generating response using Grok model: ${this.model}`);
        this.logger.debug(`User prompt: ${userPrompt.substring(0, 100)}${userPrompt.length > 100 ? '...' : ''}`);
        if (systemPrompt) {
            this.logger.debug(`System prompt: ${systemPrompt.substring(0, 100)}${systemPrompt.length > 100 ? '...' : ''}`);
        }

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

            this.logger.debug(`Sending request to Grok API with ${messages.length} messages`);
            
            const startTime = Date.now();
            this.logger.log(`Using model: ${this.model}`);
            const response = await this.openai.chat.completions.create({
                messages,
                model: this.model,
                max_tokens: 1000,
                temperature: 0.7,
            });
            const endTime = Date.now();
            
            this.logger.debug(`Grok API response received in ${endTime - startTime}ms`);
            this.logger.debug(`Response structure: ${JSON.stringify({
                id: response.id,
                model: response.model,
                choices: response.choices?.length,
                usage: response.usage
            })}`);

            this.logger.debug(`Full raw Grok API response: ${JSON.stringify(response, null, 2)}`);

            const message = response.choices[0]?.message;
            const responseContent = message?.content || (message as any)?.reasoning_content;
            if (!responseContent) {
                this.logger.error('Grok API returned an empty response content and reasoning_content');
                throw new Error('Grok API returned an empty response content and reasoning_content.');
            }

            const usage = response.usage;
            this.logger.debug(`Raw Grok response: ${responseContent.substring(0, 100)}${responseContent.length > 100 ? '...' : ''}`);
            this.logger.log(`Successfully generated response using Grok model: ${this.model}. Tokens: In=${usage?.prompt_tokens}, Out=${usage?.completion_tokens}`);
            
            return responseContent;
        } catch (error: unknown) {
            this.logger.error(`Grok API call failed for model ${this.model}`, error);
            
            const apiError = error as ApiError;
            this.logger.error(`Error details: ${apiError.message}`, apiError.stack);
            
            // Log additional details if available
            if (apiError.response) {
                this.logger.error(`API response status: ${apiError.response.status}`);
                this.logger.error(`API response data: ${JSON.stringify(apiError.response.data)}`);
            }
            
            const message = apiError.message || 'Unknown Grok API error';
            throw new InternalServerErrorException(`Failed to generate response using LLM: ${message}`);
        }
    }
} 