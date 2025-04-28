import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ILlmService } from '@backend/llm/llm.interface';
import { Inject } from '@nestjs/common';
import { ProfileData } from '@narrow-ai-matchmaker/common';

@Injectable()
export class ContentExtractionService {
    private readonly logger = new Logger(ContentExtractionService.name);

    private readonly prompt = `
You are a data extraction assistant. Your task is to extract structured information from text and format it according to a provided JSON schema.

INSTRUCTIONS:
1. Extract all relevant information from the text that matches the schema structure.
2. For enum fields, try to match the text to one of the predefined values in the schema.
3. If you cannot find a match for an enum field, you can suggest a new value, but you MUST include it in the "suggestedNewEnumValues" section of your response.
4. Ensure all required fields from the schema are filled if the information is available in the text.
5. Leave fields empty (null) if the information is not present in the text.
6. Return a valid JSON object that conforms to the schema structure.

RESPONSE FORMAT:
{
  "extractedData": { ... }, // The structured data conforming to the schema
  "suggestedNewEnumValues": {
    "fieldName": "suggestedValue",
    "anotherFieldName": "anotherSuggestedValue"
  }
}
    `;

    constructor(
        @Inject(ILlmService)
        private readonly llmService: ILlmService,
    ) { }

    /**
     * Extracts structured data from a given text transcript using an LLM.
     * @param transcriptText The text content to process.
     * @param schema The JSON schema for the desired output structure.
     * @returns The extracted structured data with any suggested new enum values.
     */
    async extractStructuredDataFromText<T>(transcriptText: string, schema: object): Promise<{
        extractedData: T;
        suggestedNewEnumValues: Record<string, string>;
    }> {
        this.logger.log(`Extracting structured data from text transcript.`);
        try {
            const userPrompt = `
                    TEXT TO ANALYZE:
                    ${transcriptText}

                    JSON SCHEMA:
                    ${JSON.stringify(schema, null, 2)}
            `;

            const response = await this.llmService.generateResponse(userPrompt, this.prompt);

            const parsedResponse = JSON.parse(response);
            this.logger.log('Successfully extracted structured data from text.');
            return parsedResponse;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown LLM error';
            this.logger.error(`Failed to extract structured data from text: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not extract structured data from text.');
        }
    }
} 