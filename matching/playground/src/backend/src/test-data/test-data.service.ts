import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FullProfile, FullProfilesData } from '../../../common/src/types/full-profile.types';

@Injectable()
export class TestDataService implements OnModuleInit {
  private readonly logger = new Logger(TestDataService.name);
  private anthropic: Anthropic | null = null;
  private apiKey: string | undefined;
  private profileSchemaStringified: string; // Store the cleaned, stringified schema
  private matchScenarios: string;

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
        this.logger.log(`Loaded match scenarios from ${scenariosPath}`);
      } catch (error) {
        this.logger.error(`Failed to load match scenarios: ${error.message}`, error.stack);
        // Throw or handle error - prevents service usage if scenarios missing
        throw new InternalServerErrorException(`Failed to load match scenarios from matching/match_scenarios.json`);
      }
    } else {
      this.logger.warn('Skipping schema/scenario loading as Anthropic client is not initialized.');
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

    // Log the prompt at debug levelgenerateAndSaveBaseSet
    this.logger.debug(`Sending prompt to Anthropic...`); // Avoid logging potentially large schema/scenarios by default

    try {
      const startTime = Date.now();
      const response = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
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
        this.logger.error(`Failed to parse JSON response: ${parseError.message}. Raw text was: ${rawJsonText}`);
        throw new Error('Failed to parse JSON from Anthropic response');
      }

      // Assign IDs and cast to FullProfile[]
      const profiles: FullProfile[] = generatedProfilesUntyped.map((profileData, index) => ({
        ...profileData, // Spread the data parsed from JSON
        id: `base-set-${index + 1}`, // Add the unique ID
      } as FullProfile)); // Assert/cast that the resulting object matches FullProfile

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
} 