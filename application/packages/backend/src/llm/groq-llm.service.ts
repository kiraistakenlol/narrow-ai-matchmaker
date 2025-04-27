import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { ILlmService, LlmStructuredDataResult } from './llm.interface';

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

    async extractStructuredData(
        text: string,
        targetSchema: object,
        instructions: string
    ): Promise<LlmStructuredDataResult> {
        this.logger.log(`Extracting structured data using Groq model: ${this.model}`);

        const schemaString = JSON.stringify(targetSchema, null, 2);
        const systemPrompt = `You are an expert data extraction assistant. Your task is to extract information from the provided text and format it precisely according to the following JSON schema. Only output a single valid JSON object that conforms to this schema. Do not include any other text, explanations, or markdown formatting. 

JSON Schema:
\`\`\`json
${schemaString}
\`\`\`

Extraction Instructions: ${instructions}`;

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: text,
                    },
                ],
                model: this.model,
                temperature: 0.1, // Lower temperature for more deterministic JSON output
                response_format: { type: "json_object" }, // Enable JSON mode
            });

            const responseContent = chatCompletion.choices[0]?.message?.content;
            if (!responseContent) {
                throw new Error('Groq API returned an empty response content.');
            }

            this.logger.debug(`Raw Groq response: ${responseContent}`);

            // Attempt to parse the JSON response
            let extractedData: object;
            try {
                extractedData = JSON.parse(responseContent);
            } catch (parseError) {
                this.logger.error('Failed to parse JSON response from Groq', parseError);
                this.logger.error(`Invalid JSON received: ${responseContent}`);
                throw new Error('LLM returned invalid JSON.');
            }

            // TODO: Add optional schema validation here using a library like AJV
            // if (!validate(extractedData)) { throw new Error('LLM output failed schema validation.'); }

            this.logger.log(`Successfully extracted structured data using Groq model: ${this.model}`);
            return {
                extractedData,
                modelUsed: this.model,
            };

        } catch (error) {
            this.logger.error(`Groq API call failed for model ${this.model}`, error);
            const message = error instanceof Error ? error.message : 'Unknown Groq API error';
            throw new InternalServerErrorException(`Failed to extract data using LLM: ${message}`);
        }
    }
} 