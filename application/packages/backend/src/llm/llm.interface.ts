export interface ILlmService {
    /**
     * Generates a response from the LLM based on user and system prompts.
     *
     * @param userPrompt The user's input prompt.
     * @param systemPrompt Optional system prompt to guide the LLM's behavior.
     * @returns A promise resolving to the LLM's response.
     * @throws Error if the LLM fails to generate a response.
     */
    generateResponse(
        userPrompt: string,
        systemPrompt?: string
    ): Promise<string>;
}

export const ILlmService = Symbol('ILlmService'); 