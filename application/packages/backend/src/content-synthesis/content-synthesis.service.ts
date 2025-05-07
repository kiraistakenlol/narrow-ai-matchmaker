import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ILlmService } from '@backend/llm/llm.interface';
import { Inject } from '@nestjs/common';
import { ProfileData } from '@narrow-ai-matchmaker/common';

@Injectable()
export class ContentSynthesisService {
    private readonly logger = new Logger(ContentSynthesisService.name);

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

    // New system prompt for merging
    private readonly mergingPrompt = `
You are an intelligent data merging assistant. Your task is to merge a JSON object containing "complementaryUpdates" into a "currentProfile" JSON object. The goal is to produce a single, consolidated JSON object that thoughtfully integrates the new information while preserving the integrity of the existing profile data.

GENERAL MERGING PRINCIPLES:
1.  **View as Augmentation**: Treat the "complementaryUpdates" as additional information or targeted refinements to the "currentProfile". The aim is to enrich, not necessarily to overwrite wholesale.
2.  **Preserve Existing Data**: If "complementaryUpdates" provides a null, empty, or less specific value for a field where "currentProfile" already has valid data, the information from "currentProfile" should generally be retained.
3.  **Selective Overwrite/Update**: 
    *   A field in "currentProfile" should only be overwritten by "complementaryUpdates" if the update provides a clearly newer, more specific, or definitively corrected non-empty value.
    *   For example, if 'currentProfile.personal.name' is "J. Doe" and 'complementaryUpdates.personal.name' is "Jane Doe", the update is likely a correction and should be used. If 'complementaryUpdates.personal.name' is null, "J. Doe" should be kept.
4.  **Combine Textual Fields Intelligently**:
    *   For fields like notes or descriptions: If "complementaryUpdates" contains new text, and "currentProfile" also has text, consider appending the new text (e.g., with a newline \\n), creating a combined narrative. If the update text is clearly a replacement or a more complete version, use that.
    *   For a field like 'raw_input', if 'complementaryUpdates.raw_input' is non-empty, it usually supersedes 'currentProfile.raw_input' as it represents a newer user submission.
5.  **Merge Arrays by Augmenting and Updating**:
    *   Combine elements from arrays in both "currentProfile" and "complementaryUpdates".
    *   **Add New Unique Items**: Prioritize adding new, unique items from "complementaryUpdates" to the arrays in "currentProfile".
    *   **Update Existing Items**: If an item in an array from "complementaryUpdates" clearly corresponds to an existing item in "currentProfile" (e.g., an object with the same 'name' or 'id'), and the update provides new or changed attributes for that item (like a skill level), then the existing item in "currentProfile" should be updated with these changes from "complementaryUpdates". Otherwise, if it's a distinct new item, add it.
    *   Ensure uniqueness in the final array based on the content or identifying keys of the elements.
6.  **Handle Missing Fields**: If a field is present in "complementaryUpdates" but not in "currentProfile", include it in the merged result with its value, assuming it's meaningful new information.
7.  **Recursive and Consistent Application**: Apply these merging principles consistently throughout all levels of the JSON structure, including nested objects.
8.  **Maintain Structural Integrity**: The merged output must be a valid JSON object that adheres to the structural conventions of the input profiles.
9.  **Use Common Sense**: The overarching goal is to produce the most accurate, complete, and coherent profile by intelligently integrating the complementary updates.

You will be provided with the "currentProfile" and "complementaryUpdates" JSON objects.
Respond ONLY with the merged JSON object. Do not include any other text, explanations, or markdown formatting.
`;

    private readonly matchReasonPrompt = `
You are an insightful assistant skilled at identifying potential connections between professional profiles. 
Your task is to analyze two profiles provided below (Profile A and Profile B) and generate a concise, compelling reason (1-2 sentences maximum) why these two individuals might be a good match for collaboration, networking, or shared interests. 

Focus on:
- Shared professional interests, industries, or fields.
- Complementary skills or experiences.
- Aligned goals or stated objectives if apparent.
- Relevant hobbies or extra-curricular activities if they create a strong connection point.

Avoid generic statements. Be specific if the data allows. If no strong connection is apparent, state that they have diverse backgrounds but could connect on general professional grounds.

Respond ONLY with the reason string. Do not include any other text, explanations, or markdown formatting.
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
    async extractStructuredDataFromText<T>(transcriptText: string, schema: object): Promise<{ extractedData: T }> {
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

    /**
     * Merges an 'updates' ProfileData object into a 'currentProfile' ProfileData object using an LLM.
     * @param currentProfile The current profile data.
     * @param updates The profile data containing updates.
     * @returns The merged ProfileData.
     */
    async mergeProfileData(currentProfile: ProfileData, updates: ProfileData): Promise<ProfileData> {
        this.logger.log(`Attempting to merge profile data using LLM.`);

        const userPrompt = `
CURRENT PROFILE:
${JSON.stringify(currentProfile, null, 2)}

COMPLEMENTARY UPDATES:
${JSON.stringify(updates, null, 2)}

MERGED PROFILE (JSON):
`;

        try {
            const responseJsonString = await this.llmService.generateResponse(userPrompt, this.mergingPrompt);
            const mergedProfile: ProfileData = JSON.parse(responseJsonString);

            this.logger.log('Successfully merged profile data using LLM.');
            return mergedProfile;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown LLM error during profile merging';
            this.logger.error(`Failed to merge profile data: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not merge profile data using LLM.');
        }
    }

    async generateMatchReason(myProfileData: ProfileData, matchedProfileData: ProfileData): Promise<string> {
        this.logger.log(`Generating match reason between two profiles.`);

        // Helper to extract key info for the prompt to keep it concise
        const extractKeyInfo = (profile: ProfileData) => {
            if (!profile) return "Profile data not available.";
            return JSON.stringify({
                name: profile.personal?.name,
                headline: profile.personal?.headline,
                roles: profile.roles?.map(r => ({ title: r.title, organization: r.organization?.name, active: r.active })).slice(0,2), // Current or recent roles
                skills: {
                    hard: profile.skills?.hard?.slice(0, 3).map(s => s.skill), // Top 3 hard skills
                    soft: profile.skills?.soft?.slice(0, 2).map(s => s.skill), // Top 2 soft skills
                },
                industries: profile.industries?.slice(0, 3), // Top 3 industries
                hobbies: profile.hobbies?.slice(0, 2), // Top 2 hobbies
                extra_notes_snippet: profile.extra_notes?.substring(0, 100) // Snippet of notes
            }, null, 2);
        }

        const userPrompt = `
PROFILE A (My Profile):
${extractKeyInfo(myProfileData)}

PROFILE B (Matched Profile):
${extractKeyInfo(matchedProfileData)}

REASON FOR MATCH (1-2 sentences):
`;

        try {
            const reason = await this.llmService.generateResponse(userPrompt, this.matchReasonPrompt);
            this.logger.log('Successfully generated match reason.');
            // Basic cleaning of the reason, LLMs might add quotes or newlines
            return reason.trim().replace(/^"|"$/g, ''); 
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown LLM error during match reason generation';
            this.logger.error(`Failed to generate match reason: ${message}`, error instanceof Error ? error.stack : undefined);
            // Return a fallback reason in case of error
            return "These profiles have potential for a connection based on their professional backgrounds."; 
        }
    }
} 