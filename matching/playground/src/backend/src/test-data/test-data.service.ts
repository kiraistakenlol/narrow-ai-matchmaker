import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Profile } from 'narrow-ai-matchmaker-common'; // Assuming this path is correct

@Injectable()
export class TestDataService implements OnModuleInit {
  private readonly logger = new Logger(TestDataService.name);
  private readonly anthropic: Anthropic;
  private readonly apiKey: string;
  private profileSchemaStringified: string; // Store the cleaned, stringified schema
  private matchScenarios: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not found in environment variables.');
      this.anthropic = null; // Prevent usage if no key
    } else {
      this.anthropic = new Anthropic({ apiKey: this.apiKey });
    }
  }

  async onModuleInit() {
    // Load schema and scenarios during initialization
    try {
      const schemaPath = path.join(__dirname, '../../../../../profile/combined_profile_schema.json');
      const rawSchemaContent = await fs.readFile(schemaPath, 'utf-8');
      // Parse the JSON (which ignores comments) then re-stringify
      const parsedSchema = JSON.parse(rawSchemaContent);
      this.profileSchemaStringified = JSON.stringify(parsedSchema, null, 2);
      this.logger.log(`Loaded and processed profile schema from ${schemaPath}`);
    } catch (error) {
      this.logger.error(`Failed to load or parse profile schema: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to load/parse profile schema from matching/profile/combined_profile_schema.json`);
    }

    try {
      const scenariosPath = path.join(__dirname, '../../../../../match_scenarios.json');
      this.matchScenarios = await fs.readFile(scenariosPath, 'utf-8');
      this.logger.log(`Loaded match scenarios from ${scenariosPath}`);
    } catch (error) {
      this.logger.error(`Failed to load match scenarios: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to load match scenarios from matching/match_scenarios.json`);
    }
  }

  async generateAndSaveBaseSet(count: number): Promise<{ count: number; filePath: string }> {
    if (!this.anthropic) {
      throw new InternalServerErrorException('Anthropic client not initialized. Missing API key?');
    }
    if (!this.profileSchemaStringified || !this.matchScenarios) {
      // This check might be redundant if onModuleInit throws, but good practice
      throw new InternalServerErrorException('Schema or scenarios not loaded.');
    }

    this.logger.log(`Generating ${count} base set profiles using full schema...`);

    // Construct the new prompt with corrected escaping for backticks
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

    // Estimate necessary tokens
    const estimatedTokensPerProfile = 1500; // Adjust based on testing
    const maxTokens = estimatedTokensPerProfile * count + 2000; // Increased buffer for larger prompt
    this.logger.log(`Estimated max_tokens for Anthropic call: ${maxTokens}`);

    try {
      const startTime = Date.now();
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Start with Haiku, consider Sonnet if needed
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      const generationTime = Date.now() - startTime;
      this.logger.log(`Anthropic response received in ${generationTime}ms.`);

      if (!response.content || response.content.length === 0 || response.content[0].type !== 'text') {
        throw new Error('Invalid response format from Anthropic API');
      }

      let rawJsonText = response.content[0].text.trim();
      // Try to find JSON array within the text, robustly handling potential markdown fences
      const jsonMatch = rawJsonText.match(/^[\\s\\S]*?(\\[[\\s\\S]*\\])[\\s\\S]*$/);
      const finalJsonString = jsonMatch ? jsonMatch[1] : rawJsonText; // Extract the array part

      this.logger.debug(`Final JSON string (first 200 chars): ${finalJsonString.substring(0, 200)}...`);

      let generatedFullProfiles: any[];
      try {
        generatedFullProfiles = JSON.parse(finalJsonString);
        if (!Array.isArray(generatedFullProfiles)) {
          throw new Error('Parsed response is not an array.');
        }
        this.logger.log(`Successfully parsed ${generatedFullProfiles.length} profiles from JSON response.`);
        if (generatedFullProfiles.length !== count) {
          this.logger.warn(`Requested ${count} profiles, but received ${generatedFullProfiles.length}.`);
        }
      } catch (parseError) {
        this.logger.error(`Failed to parse JSON response: ${parseError.message}. Raw text was: ${rawJsonText}`);
        throw new Error('Failed to parse JSON from Anthropic response');
      }

      // Process into the simple {id, text} structure
      const profiles: Profile[] = generatedFullProfiles.map((fullProfile, index) => ({
        id: `base-set-${index + 1}`,
        text: JSON.stringify(fullProfile), // Store the full generated object as a string
      }));

      const outputDir = path.join(__dirname, '../../../../../test_cases');
      const filePath = path.join(outputDir, 'base_set.json');

      this.logger.log(`Saving ${profiles.length} processed profiles to ${filePath}...`);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify({ profiles }, null, 2));
      this.logger.log(`Successfully saved base set profiles.`);

      return { count: profiles.length, filePath };
    } catch (error) {
      this.logger.error(`Error during base set generation: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to generate or save base set: ${error.message}`);
    }
  }
} 