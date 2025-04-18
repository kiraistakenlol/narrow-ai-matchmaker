import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { Command } from 'commander';

// Load .env file from the script's directory
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Log whether the key was found
if (!ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY not found in environment variables. Make sure it is set in the .env file in the generator directory.');
    process.exit(1);
}

const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
});

// Model selection
const MODEL_NAME = 'claude-3-7-sonnet-20250219';
const GENERATION_TEMPERATURE = 0.75; // Fixed temperature for generation

interface UserProfile {
    user_id: string;
    input_text: string;
    // Potentially add assigned_type here if useful for debugging/analysis
    // assigned_type: string;
}

interface TestData {
    profiles: UserProfile[];
}

// Config file structure interfaces
interface AttendeeTypeDistribution {
    type: string;
    percentage: number;
}

interface ResponseExamples {
    short: string;
    long: string;
}

interface GenerationConfig {
    context: string;
    total_profiles: number;
    attendee_type_distribution: AttendeeTypeDistribution[];
    response_examples: ResponseExamples;
    // Add optional prompt instruction? For now, it's implicitly defined in generateSingleProfile
    // prompt_instruction?: string;
}

// Helper function to introduce delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Profile Generation Function ---

async function generateSingleProfile(
    index: number, // Overall profile index
    context: string,
    attendeeType: string, // The specific type for this profile
    responseExamples: ResponseExamples,
    verbosity: number // Random verbosity level (1-10)
): Promise<UserProfile | null> {
    const max_tokens = 800; // Keep max tokens relatively high

    const systemPrompt = `You are an AI assistant generating a SYNTHETIC user profile introduction for a matchmaking platform test dataset.
     Your output MUST be a valid JSON object containing ONLY a single key "input_text" with the generated user introduction string as its value. 
     Do not include any other text, preamble, or explanation outside the JSON object. Adhere strictly to the persona and context implied by the user message.`;

    // Construct user message based on config
    const userMessage = `Generate a realistic user introduction text for a synthetic profile, formatted as a JSON object with a single key "input_text".

**Context:** The user is at '${context}'.
**Attendee Type:** This person primarily identifies as a '${attendeeType}'.

**Desired Style:**
- Generate an introduction that reflects the likely background, skills, goals, and communication style of someone in the '${attendeeType}' role.
- The desired **Verbosity Level** for *this specific profile* is **${verbosity}/10**.
- Use the examples below as a guide for style and length at the extremes:
  - Verbosity **1** should be similar in style/length to the 'Short/Concise' example.
  - Verbosity **10** should be similar in style/length to the 'Long/Detailed' example.
- Adjust the length and detail appropriately for the requested verbosity level (${verbosity}/10) and the attendee type.
- Aim for variety across multiple profile generations.

--- Style Example (Short/Concise - Verbosity 1) ---
${responseExamples.short}

--- Style Example (Long/Detailed - Verbosity 10) ---
${responseExamples.long}

--- End of Examples ---

Now, generate ONLY the JSON output like {"input_text": "...generated text..."} for this specific attendee type ('${attendeeType}') within the given context, aiming for verbosity level ${verbosity}/10.`;

    try {
        console.log(`   - Generating profile ${index + 1} (Type: ${attendeeType}, Verbosity: ${verbosity}/10, Temp: ${GENERATION_TEMPERATURE})...`);
        const response = await anthropic.messages.create({
            model: MODEL_NAME,
            max_tokens: max_tokens,
            temperature: GENERATION_TEMPERATURE,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userMessage },
            ],
        });

        let profileText = `Fallback: Generated profile for ${context} - ${attendeeType} user ${index + 1}.`; // Default fallback

        if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
            const rawText = response.content[0].text.trim();
            try {
                // Attempt to find JSON within potentially larger text blocks
                const jsonMatch = rawText.match(/\{.*\}/s);
                if (jsonMatch) {
                    const parsedJson = JSON.parse(jsonMatch[0]);
                    if (parsedJson && typeof parsedJson.input_text === 'string' && parsedJson.input_text.trim() !== '') {
                        profileText = parsedJson.input_text.trim();
                    } else {
                        console.warn(`   - Warning: JSON parsed for profile ${index + 1}, but 'input_text' key missing, empty, or not a string. Raw JSON: ${jsonMatch[0]}`);
                    }
                } else {
                    console.warn(`   - Warning: No valid JSON object found in response for profile ${index + 1}. Using raw text as fallback (potential issue). Raw: ${rawText}`);
                    // Maybe use raw text if JSON fails completely?
                    // profileText = rawText; // Be cautious with this
                }
            } catch (parseError) {
                console.warn(`   - Warning: Failed to parse JSON response for profile ${index + 1}. Error: ${parseError}. Raw: ${rawText}`);
            }
        } else {
            console.warn(`   - Warning: Could not extract text content from profile ${index + 1} response.`);
        }

        return {
            user_id: `user_${String(index + 1).padStart(3, '0')}`,
            input_text: profileText
            // assigned_type: attendeeType // Uncomment to include type in output JSON
        };

    } catch (error) {
        console.error(`   - Error generating profile ${index + 1} (Type: ${attendeeType}):`, error);
        return null;
    }
}

// --- Quota Calculation Helper ---

function calculateQuotas(totalProfiles: number, distribution: AttendeeTypeDistribution[]): Map<string, number> {
    const quotas = new Map<string, number>();
    let calculatedTotal = 0;
    const typeFractions: { type: string, fraction: number, exact: number }[] = [];

    // Calculate initial floor quotas and fractions
    distribution.forEach(item => {
        if (item.percentage > 0) {
            const exactCount = totalProfiles * (item.percentage / 100);
            const floorCount = Math.floor(exactCount);
            quotas.set(item.type, floorCount);
            calculatedTotal += floorCount;
            typeFractions.push({ type: item.type, fraction: exactCount - floorCount, exact: exactCount });
        }
    });

    // Distribute remaining profiles based on largest fractions
    let shortfall = totalProfiles - calculatedTotal;
    typeFractions.sort((a, b) => b.fraction - a.fraction); // Sort descending by fraction

    for (let i = 0; i < shortfall; i++) {
        const typeToIncrement = typeFractions[i % typeFractions.length].type; // Cycle if shortfall > types
        quotas.set(typeToIncrement, (quotas.get(typeToIncrement) || 0) + 1);
    }

    // Sanity check the total
    let finalTotal = 0;
    quotas.forEach(count => finalTotal += count);
    if (finalTotal !== totalProfiles) {
        console.warn(`Quota calculation mismatch: Expected ${totalProfiles}, got ${finalTotal}. Check percentages.`);
        // Adjust last type? Or throw error? For now, warn.
    }

    console.log("Calculated Quotas:", quotas);
    return quotas;
}

// --- Main Execution Logic ---

async function main() {
    const program = new Command();
    program
        .option('-c, --config <path>', 'Path to the generation config JSON file', './test_audience_config.json') // Default relative to cwd
        .option('-o, --output <path>', 'Output profiles JSON file path', '../generated_profiles.json'); // Default relative to cwd

    program.parse(process.argv);
    const options = program.opts();

    const configPath = path.resolve(options.config); // Resolve config path
    const outputFile = path.resolve(options.output); // Resolve output path

    // --- Load Configuration ---
    let config: GenerationConfig;
    try {
        console.log(`Loading configuration from: ${configPath}`);
        const configFileContent = await fs.readFile(configPath, 'utf-8');
        config = JSON.parse(configFileContent) as GenerationConfig;
        // Basic validation
        if (!config.context || config.total_profiles <= 0 || !config.attendee_type_distribution || !config.response_examples) {
            throw new Error('Config file is missing required fields.');
        }
        const totalPercentage = config.attendee_type_distribution.reduce((sum, t) => sum + t.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.1) { // Allow for small float errors
            console.warn(`Warning: Percentages in config add up to ${totalPercentage}%, not 100%.`);
            // Normalize percentages? For now, proceed but warn.
        }

    } catch (error) {
        console.error(`Error loading or parsing config file '${configPath}':`, error);
        process.exit(1);
    }

    const { context, total_profiles, attendee_type_distribution, response_examples } = config;

    console.log(`Generating ${total_profiles} profiles for context: '${context}'`);
    console.log(`Outputting to: ${outputFile}`);

    // --- Calculate and Track Quotas ---
    const profileQuotas = calculateQuotas(total_profiles, attendee_type_distribution);
    const remainingQuotas = new Map(profileQuotas);
    const generatedProfiles: UserProfile[] = [];

    // --- Generation Loop ---
    console.log(`Starting profile generation loop for ${total_profiles} profiles...`);
    for (let i = 0; i < total_profiles; i++) {
        // Get types that still need profiles
        const availableTypes = Array.from(remainingQuotas.entries())
            .filter(([_, count]) => count > 0)
            .map(([type, _]) => type);

        if (availableTypes.length === 0) {
            console.warn(`Warning: No available types with remaining quota at profile index ${i}. Stopping generation early.`);
            break; // Should not happen if quota calculation is correct
        }

        // Randomly select an available type
        const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];

        // Decrement quota for the selected type
        remainingQuotas.set(selectedType, (remainingQuotas.get(selectedType) || 0) - 1);

        // Generate a random verbosity level for this profile (1-10)
        const randomVerbosity = Math.floor(Math.random() * 10) + 1;

        // Generate the profile for this type
        const profile = await generateSingleProfile(
            i, // Pass overall index
            context,
            selectedType,
            response_examples,
            randomVerbosity // Pass the random verbosity
        );

        if (profile) {
            generatedProfiles.push(profile);
        }

        await delay(250); // Maintain delay between API calls (adjust as needed)
    }

    console.log(`Finished generation loop. Generated ${generatedProfiles.length} profiles.`);

    if (generatedProfiles.length !== total_profiles) {
        console.warn(`Warning: Expected ${total_profiles} profiles, but only generated ${generatedProfiles.length}.`);
    }

    // --- Output Results ---
    const testData: TestData = {
        profiles: generatedProfiles,
    };

    try {
        await fs.writeFile(outputFile, JSON.stringify(testData, null, 2));
        console.log(`Successfully wrote ${generatedProfiles.length} profiles to ${outputFile}`);
    } catch (error) {
        console.error(`Error writing test data to ${outputFile}:`, error);
        process.exit(1);
    }
}

main().catch(err => {
    console.error("Unhandled error during execution:", err);
    process.exit(1);
}); 