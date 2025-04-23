import { Injectable, InternalServerErrorException, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FullProfile, FullProfilesData } from '../../../common/src/types/full-profile.types';
import { MatchScenario, MatchScenarioCategories } from '../../../common/src/types/match-scenarios.types';

// Helper function to slugify strings
function slugify(text: string): string {
  if (!text) return ''; // Handle null/undefined/empty input
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')           // Replace spaces with _
    .replace(/[^a-z0-9_]+/g, '')   // Remove all non-alphanumeric or underscore chars
    .replace(/__+/g, '_')           // Replace multiple underscores with single _
    .replace(/^_+/, '')             // Trim _ from start of text
    .replace(/_+$/, '');            // Trim _ from end of text
}

// Define the Anthropic model name as a constant
// IMPORTANT: Do not update this model name without careful consideration and testing,
// as prompt structures and expected outputs may be tailored to this specific model.
const ANTHROPIC_MODEL_NAME = 'claude-3-7-sonnet-20250219';

@Injectable()
export class TestDataService implements OnModuleInit {
  private readonly logger = new Logger(TestDataService.name);
  private anthropic: Anthropic | null = null;
  private apiKey: string | undefined;
  private profileSchemaStringified: string; // Store the cleaned, stringified schema
  private matchScenarios: string;
  private parsedMatchScenarios: MatchScenarioCategories;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // 1. Initialize API Key and Client
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not found in environment variables. Test data generation will be disabled.');
      this.anthropic = null; // Ensure client is null if no key
    } else {
      this.logger.log(`Found Anthropic API key. Initializing client...`);
      this.anthropic = new Anthropic({ apiKey: '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' });
      this.logger.log(`Anthropic client initialized.`, this.apiKey);
    }

    // 2. Load schema and scenarios (only if client initialized successfully)
    if (this.anthropic) {
      try {
        // Load the finalized schema file directly
        const schemaPath = path.join(__dirname, '../../../../../profile/profile_schema.json');
        const rawSchemaContent = await fs.readFile(schemaPath, 'utf-8');
        // Validate it's parseable JSON and store as string for the prompt
        const parsedSchema = JSON.parse(rawSchemaContent);
        this.profileSchemaStringified = JSON.stringify(parsedSchema, null, 2);
        this.logger.log(`Loaded profile schema for prompt from ${schemaPath}`);
      } catch (error) {
        this.logger.error(`Failed to load or parse profile_schema.json: ${error.message}`, error.stack);
        throw new InternalServerErrorException(`Failed to load/parse profile schema from matching/profile/profile_schema.json`);
      }

      try {
        const scenariosPath = path.join(__dirname, '../../../../../match_scenarios.json');
        this.matchScenarios = await fs.readFile(scenariosPath, 'utf-8');
        this.parsedMatchScenarios = JSON.parse(this.matchScenarios);
        this.logger.log(`Loaded and parsed match scenarios from ${scenariosPath}`);
      } catch (error) {
        this.logger.error(`Failed to load or parse match scenarios: ${error.message}`, error.stack);
        throw new InternalServerErrorException(`Failed to load/parse match scenarios from matching/match_scenarios.json`);
      }
    } else {
      this.logger.warn('Skipping schema/scenario loading as Anthropic client is not initialized.');
    }
  }

  /**
   * Reads the base audience profiles from the JSON file.
   * @returns Promise<FullProfile[]>
   */
  async getBaseAudienceProfiles(): Promise<FullProfile[]> {
    const baseAudiencePath = path.join(__dirname, '../../../../test_cases/base_audience.json');
    this.logger.log(`Attempting to read base audience from: ${baseAudiencePath}`);
    try {
      const fileContent = await fs.readFile(baseAudiencePath, 'utf-8');
      const parsedData: FullProfilesData = JSON.parse(fileContent);
      if (!parsedData || !Array.isArray(parsedData.profiles)) {
        throw new Error('Invalid format in base_audience.json: "profiles" array not found or invalid.');
      }
      this.logger.log(`Successfully read and parsed ${parsedData.profiles.length} profiles from base audience.`);
      return parsedData.profiles;
    } catch (error) {
      this.logger.error(`Failed to read or parse base_audience.json: ${error.message}`, error.stack);
      // Distinguish between file not found and other errors if needed
      if (error.code === 'ENOENT') {
          throw new NotFoundException(`Base audience file not found at ${baseAudiencePath}. Generate it first?`);
      }
      throw new InternalServerErrorException(`Failed to load/parse base audience file: ${error.message}`);
    }
  }

  async generateAndSaveBaseSet(count: number): Promise<{ count: number; filePath: string }> {
    if (!this.anthropic) {
      throw new InternalServerErrorException('Anthropic client not initialized. Missing API key?');
    }
    if (!this.profileSchemaStringified || !this.matchScenarios) {
      throw new InternalServerErrorException('Profile schema or match scenarios not loaded. Check initialization logs.');
    }

    this.logger.log(`Generating ${count} base set profiles using full schema...`);

    const prompt = `
      You are an assistant tasked with generating synthetic data for testing a professional matchmaking system.
      The system aims to connect people at conferences or events based on rich profiles.
      Your goal is to generate a BASE SET of ${count} user profiles.

      **CRITICAL INSTRUCTIONS:**
      1.  **Output Format:** Generate a single JSON array containing exactly ${count} profile objects. Each object MUST strictly adhere to the following JSON schema:
          \`\`\`json
          ${this.profileSchemaStringified}
          \`\`\`
      2.  **Content - Generic Profiles:** These profiles represent the background population at a typical tech conference. They should be DIVERSE but GENERIC. Fill in the fields appropriately for common roles (developers, designers, managers, students, etc.), common skills (web dev, AI, cloud, project management), and typical goals (networking, learning, finding jobs/talent). AVOID highly specific, niche, or unusual details. Keep text inputs like highlights or raw_input brief.
      3.  **Content - Scenario Context:** The generated profiles MUST NOT strongly align with any specific matching scenario listed below. They should serve as a neutral background against which specific "signal" profiles (designed for these scenarios) can be tested later. Review these scenarios to understand what to AVOID making profiles too specific about:
          \`\`\`json
          ${this.matchScenarios}
          \`\`\`
      4.  **Output Purity:** Your response MUST contain ONLY the JSON array, starting with '[' and ending with ']'. Do not include any introductory text, explanations, markdown formatting, or anything else outside the JSON array.
    `;

    const estimatedTokensPerProfile = 1500;
    const maxTokens = estimatedTokensPerProfile * count + 2000;
    this.logger.log(`Estimated max_tokens for Anthropic call: ${maxTokens}`);

    this.logger.debug(`Sending base set prompt to Anthropic using model: ${ANTHROPIC_MODEL_NAME}...`);

    try {
      const startTime = Date.now();
      const response = await this.anthropic.messages.create({
        model: ANTHROPIC_MODEL_NAME,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      const generationTime = Date.now() - startTime;
      this.logger.log(`Anthropic response received in ${generationTime}ms.`);

      if (!response.content || response.content.length === 0 || response.content[0].type !== 'text') {
        throw new Error('Invalid response format from Anthropic API');
      }

      let rawJsonText = response.content[0].text.trim();
      const jsonMatch = rawJsonText.match(/^[\\s\\S]*?(\\[[\\s\\S]*\\])[\\s\\S]*$/);
      const finalJsonString = jsonMatch ? jsonMatch[1] : rawJsonText;

      this.logger.debug(`Attempting to parse JSON (first 200 chars): ${finalJsonString.substring(0, 200)}...`);

      let generatedProfilesUntyped: any[];
      try {
        generatedProfilesUntyped = JSON.parse(finalJsonString);
        if (!Array.isArray(generatedProfilesUntyped)) {
          throw new Error('Parsed response is not an array.');
        }
        this.logger.log(`Successfully parsed ${generatedProfilesUntyped.length} potential profiles from JSON response.`);
        if (generatedProfilesUntyped.length !== count) {
          this.logger.warn(`Requested ${count} profiles, but received ${generatedProfilesUntyped.length}.`);
        }
      } catch (parseError) {
        this.logger.error(`Failed to parse JSON response: ${parseError.message}. Raw text length: ${rawJsonText.length}. Start: ${rawJsonText.substring(0,100)}, End: ${rawJsonText.substring(rawJsonText.length-100)}`);
        throw new Error('Failed to parse JSON from Anthropic response');
      }

      // Assign IDs and cast to FullProfile[]
      const profiles: FullProfile[] = generatedProfilesUntyped.map((profileData, index) => ({
        id: `base-set-${index + 1}`,
        ...profileData,
      } as FullProfile));

      // Prepare data for saving using the FullProfilesData structure
      const dataToSave: FullProfilesData = { profiles: profiles };

      const outputDir = path.join(__dirname, '../../../../test_cases');
      const filePath = path.join(outputDir, 'base_audience.json');

      this.logger.log(`Saving ${profiles.length} FullProfile objects to ${filePath}...`);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
      this.logger.log(`Successfully saved base audience profiles.`);

      return { count: profiles.length, filePath };
    } catch (error) {
      this.logger.error(`Error during base set generation: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to generate or save base set: ${error.message}`);
    }
  }

  /**
   * Generates and saves a test case bundle with two "signal" profiles for a specific match scenario.
   * @param scenarioId The ID of the scenario from match_scenarios.json (e.g., "A1").
   * @returns Promise<{ filePath: string; profilesGenerated: number }>
   */
  async generateAndSaveScenarioBundle(scenarioId: string): Promise<{ filePath: string; profilesGenerated: number }> {
    if (!this.anthropic) {
      throw new InternalServerErrorException('Anthropic client not initialized. Missing API key?');
    }
    if (!this.profileSchemaStringified || !this.parsedMatchScenarios) {
      throw new InternalServerErrorException('Profile schema or match scenarios not loaded/parsed. Check initialization logs.');
    }

    // 1. Find Scenario Details
    let targetScenario: MatchScenario | null = null;
    let categoryName: string | null = null;
    for (const [catName, scenariosUntyped] of Object.entries(this.parsedMatchScenarios)) {
      // Explicitly type scenariosUntyped as an array of MatchScenario
      const scenarios = scenariosUntyped as MatchScenario[]; 
      const found = scenarios.find(s => s.id === scenarioId);
      if (found) {
        targetScenario = found;
        categoryName = catName;
        break;
      }
    }

    if (!targetScenario || !categoryName) {
      throw new NotFoundException(`Scenario with ID "${scenarioId}" not found in match_scenarios.json`);
    }
    this.logger.log(`Found target scenario: [${categoryName}] ${targetScenario.id} - ${targetScenario.scenario}`);

    // 2. Load Base Audience
    let baseAudienceContentString: string;
    const baseAudiencePath = path.join(__dirname, '../../../../test_cases/base_audience.json');
    try {
      baseAudienceContentString = await fs.readFile(baseAudiencePath, 'utf-8');
      this.logger.log(`Loaded base audience from ${baseAudiencePath}`);
    } catch (error) {
      this.logger.error(`Failed to load base_audience.json: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to load base_audience.json. Generate it first.`);
    }

    // 3. Construct Prompt
    const prompt = `
      You are an assistant tasked with generating synthetic data for testing a professional matchmaking system.
      Your goal is to generate a specific TEST CASE BUNDLE consisting of exactly TWO "signal" user profiles for a predefined matching scenario. 
      These signal profiles will be added to a larger "base set" of generic profiles to test if the matchmaking system can identify the intended match.

      **TARGET SCENARIO DETAILS:**
      *   **ID:** ${targetScenario.id}
      *   **Scenario Name:** ${targetScenario.scenario}
      *   **Match Description:** ${targetScenario.match_description}

      **CRITICAL INSTRUCTIONS:**
      1.  **Output Format:** Generate a single JSON array containing exactly TWO profile objects. Each object MUST strictly adhere to the following JSON schema:
          \`\`\`json
          ${this.profileSchemaStringified}
          \`\`\`
      2.  **Content - Signal Profiles:** These two profiles MUST be designed to be a **strong and obvious match** for each other based *specifically* on the **TARGET SCENARIO DETAILS** provided above. They should clearly embody the roles and needs described in the "Match Description". For example, if the scenario is "Founder ⇄ CTO", one profile should be a non-technical founder looking for a technical co-founder, and the other should be a skilled engineer open to joining an early-stage startup.
      3.  **Content - Contrast with Base Set:** Critically, these two signal profiles MUST **stand out significantly** from the general profiles in the provided "Base Set". They need to contain specific details, skills, goals, or attributes directly related to the target scenario that are unlikely to be found or strongly represented in the Base Set. Review the Base Set carefully to ensure your generated profiles are distinct and create a clear signal. Avoid generic goals like 'networking' unless directly relevant to the scenario; focus on the specific collaboration or interaction defined.
          **BASE SET PROFILES (for context only, do not replicate):**
          \`\`\`json
          ${baseAudienceContentString}
          \`\`\`
      4.  **Content - Realism:** While specific to the scenario, the profiles should still be realistic representations of individuals one might encounter at a professional event. Fill fields appropriately and plausibly. Keep text inputs concise but informative.
      5.  **Output Purity:** Your response MUST contain ONLY the JSON array, starting with '[' and ending with ']'. Do not include any introductory text, explanations, markdown formatting, code block indicators (\`\`\`json), or anything else outside the JSON array.
    `;

    // Estimate tokens: Base audience size + 2 profiles (~3000 tokens) + prompt overhead
    // Need to parse baseAudienceContentString to get actual size, but string length is a proxy
    const estimatedBaseTokens = Math.ceil(baseAudienceContentString.length / 3); // Rough estimate
    const estimatedProfileTokens = 1500 * 2;
    const maxTokens = estimatedBaseTokens + estimatedProfileTokens + 3000; // Add buffer
    this.logger.log(`Estimated max_tokens for Anthropic scenario call: ${maxTokens}`);

    this.logger.debug(`Sending scenario [${scenarioId}] prompt to Anthropic using model: ${ANTHROPIC_MODEL_NAME}...`);

    // 4. Call Anthropic API
    try {
      const startTime = Date.now();
      const response = await this.anthropic.messages.create({
        model: ANTHROPIC_MODEL_NAME,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      const generationTime = Date.now() - startTime;
      this.logger.log(`Anthropic response received for scenario [${scenarioId}] in ${generationTime}ms.`);

      if (!response.content || response.content.length === 0 || response.content[0].type !== 'text') {
        throw new Error('Invalid response format from Anthropic API');
      }

      let rawJsonText = response.content[0].text.trim();
      const jsonMatch = rawJsonText.match(/^[\\s\\S]*?(\\[[\\s\\S]*\\])[\\s\\S]*$/);
      const finalJsonString = jsonMatch ? jsonMatch[1] : rawJsonText;

      this.logger.debug(`Attempting to parse JSON for scenario [${scenarioId}] (first 200 chars): ${finalJsonString.substring(0, 200)}...`);

      let generatedProfilesUntyped: any[];
      try {
        generatedProfilesUntyped = JSON.parse(finalJsonString);
        if (!Array.isArray(generatedProfilesUntyped)) {
          throw new Error('Parsed response is not an array.');
        }
        if (generatedProfilesUntyped.length !== 2) {
          this.logger.warn(`Requested 2 profiles for scenario ${scenarioId}, but received ${generatedProfilesUntyped.length}.`);
          if (generatedProfilesUntyped.length === 0) throw new Error('Received zero profiles.');
        } else {
          this.logger.log(`Successfully parsed ${generatedProfilesUntyped.length} signal profiles from JSON response for scenario ${scenarioId}.`);
        }
      } catch (parseError) {
        this.logger.error(`Failed to parse JSON response for scenario ${scenarioId}: ${parseError.message}. Raw text length: ${rawJsonText.length}. Start: ${rawJsonText.substring(0,100)}, End: ${rawJsonText.substring(rawJsonText.length-100)}`);
        throw new Error(`Failed to parse JSON from Anthropic response for scenario ${scenarioId}`);
      }

      // Assign IDs and cast to FullProfile[]
      const profiles: FullProfile[] = generatedProfilesUntyped.slice(0, 2).map((profileData, index) => ({
        id: `signal-${scenarioId}-${index + 1}`,
        ...profileData,
      } as FullProfile));

      // 5. Construct Final Output JSON
      const outputData = {
        id: targetScenario.id,
        scenario: targetScenario.scenario,
        match_description: targetScenario.match_description,
        profiles: profiles,
      };

      // 6. Determine Output Path and Save
      const categorySlug = slugify(categoryName);
      const scenarioFileSlug = slugify(`${targetScenario.id}_${targetScenario.scenario}`);
      const outputDir = path.join(__dirname, '../../../../test_cases', categorySlug);
      const filePath = path.join(outputDir, `${scenarioFileSlug}.json`);

      this.logger.log(`Saving scenario bundle [${scenarioId}] to ${filePath}...`);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(outputData, null, 2));
      this.logger.log(`Successfully saved scenario bundle for ${scenarioId}.`);

      return { filePath, profilesGenerated: profiles.length };
    } catch (error) {
      this.logger.error(`Error generating scenario bundle for ID ${scenarioId}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(`Failed to generate/save scenario bundle ${scenarioId}: ${error.message}`);
    }
  }

  /**
   * Returns the parsed match scenarios object.
   */
  getMatchScenarios(): MatchScenarioCategories {
    if (!this.parsedMatchScenarios) {
      this.logger.warn('Match scenarios requested but not loaded/parsed. Client initialized?')
      throw new InternalServerErrorException('Match scenarios are not available.')
    }
    return this.parsedMatchScenarios;
  }
} 