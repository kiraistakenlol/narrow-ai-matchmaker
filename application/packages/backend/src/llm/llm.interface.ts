export interface LlmStructuredDataResult {
    extractedData: object; // The JSON object matching the requested schema
    modelUsed?: string; // Optional: Identify the specific model that processed the request
}

export interface ILlmService {
    /**
     * Extracts structured data (JSON) from a given text based on a target schema and instructions.
     *
     * @param text The input text to process.
     * @param targetSchema A JSON schema object defining the desired output structure.
     * @param instructions Natural language instructions guiding the LLM on what/how to extract.
     * @returns A promise resolving to the extracted structured data.
     * @throws Error if the LLM fails to extract data or follow the schema.
     */
    extractStructuredData(
        text: string,
        targetSchema: object,
        instructions: string
    ): Promise<LlmStructuredDataResult>;

    // Add other potential methods later, e.g.:
    // generateEmbedding(text: string): Promise<number[]>;
    // classifyText(text: string, categories: string[]): Promise<string>;
}

export const ILlmService = Symbol('ILlmService'); 