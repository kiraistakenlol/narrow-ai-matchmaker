import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { Command } from 'commander';

// Load .env file from the script's directory
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Log whether the key was found
if (ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY found in environment variables.', ANTHROPIC_API_KEY);
} else {
    console.error('Error: ANTHROPIC_API_KEY not found in environment variables. Make sure it is set in the .env file in the generator directory.');
    process.exit(1);
}

const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
});

// Model selection
const MODEL_NAME = 'claude-3-7-sonnet-20250219';

interface UserProfile {
    user_id: string;
    input_text: string;
}

interface ExpectedMatch {
    user_a_id: string;
    user_b_id: string;
    expected_match_strength: 'High' | 'Medium' | 'Low' | 'None';
    reason: string;
}

interface TestData {
    profiles: UserProfile[];
    expected_matches: ExpectedMatch[];
}

// Helper function to introduce delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateSingleProfile(
    index: number,
    context: string,
    promptInstruction: string,
    verbosity: number
): Promise<UserProfile | null> {
    const temperature = verbosity / 10; 

    const max_tokens = 800; 

    const systemPrompt = `You are an AI assistant generating synthetic user profile introductions for a matchmaking platform test dataset. Your output MUST be a valid JSON object containing a single key "input_text" with the generated user introduction string as its value. Do not include any other text, preamble, or explanation outside the JSON object. Adhere strictly to the persona and context provided in the user message.`;

    // Updated user message reflecting single verbosity parameter
    const userMessage = 
`Generate a realistic user introduction text for a synthetic profile, formatted as a JSON object with a single key "input_text".

Context: The user is in '${context}'.
Instruction given to user: '${promptInstruction}'

Desired characteristics based on 0-10 scale:
Verbosity level: ${verbosity}/10 (influences length, detail, and creativity/uniqueness. Higher means longer, more detailed, and potentially more unique phrasing).

--- Examples of different Verbosity levels ---
Verbosity 1 (very brief, direct): {"input_text": "Software dev here."}
Verbosity 5 (moderate length and detail): {"input_text": "Hi, I'm a software developer mainly working with Python and cloud services. Looking to connect with other tech folks. My main goal is exploring new collaboration opportunities."}
Verbosity 9 (very detailed, potentially more unique phrasing): {"input_text": "They call me the code whisperer... mostly Python, some Rust when I'm feeling spicy. Built APIs that handle more traffic than the M25. Here at ${context} to find fellow travellers on the path to elegantly solving ridiculously complex problems. Got a quirky idea? Let's chat. "}
--- End of Examples ---

Now, generate the JSON output for the requested profile based on the context, instruction, and desired verbosity level (affecting length and creativity).
Remember: ONLY output the JSON object like {"input_text": "...generated text..."}.`;

    try {
        console.log(`   - Generating profile ${index + 1} (Verbosity: ${verbosity}, Temp: ${temperature.toFixed(1)})...`); 
        const response = await anthropic.messages.create({
            model: MODEL_NAME,
            max_tokens: max_tokens,
            temperature: temperature,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userMessage },
            ],
        });

        let profileText = `Fallback: Generated profile for ${context} user ${index + 1}. Prompt: ${promptInstruction}.`; // Default fallback

        if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
            const rawText = response.content[0].text.trim();
            try {
                const parsedJson = JSON.parse(rawText);
                if (parsedJson && typeof parsedJson.input_text === 'string') {
                    profileText = parsedJson.input_text;
                } else {
                    console.warn(`   - Warning: JSON parsed for profile ${index + 1}, but 'input_text' key missing or not a string. Raw: ${rawText}`);
                }
            } catch (parseError) {
                console.warn(`   - Warning: Failed to parse JSON response for profile ${index + 1}. Using raw text. Error: ${parseError}. Raw: ${rawText}`);
            }
        } else {
            console.warn(`   - Warning: Could not extract text content from profile ${index + 1} response.`);
        }

        return {
            user_id: `user_${String(index + 1).padStart(3, '0')}`,
            input_text: profileText
        };

    } catch (error) {
        console.error(`   - Error generating profile ${index + 1}:`, error);
        return null; 
    }
}

async function generateProfiles(
    count: number,
    context: string,
    promptInstruction: string,
    verbosity: number
): Promise<UserProfile[]> {
    console.log(`Generating ${count} profiles for context: '${context}' with prompt: '${promptInstruction}'...`);
    
    const profiles: UserProfile[] = [];
    for (let i = 0; i < count; i++) {
        const profile = await generateSingleProfile(i, context, promptInstruction, verbosity);
        if (profile) {
            profiles.push(profile);
        }
        await delay(200); 
    }
    
    if (profiles.length !== count) {
         console.warn(`Warning: Only generated ${profiles.length} out of ${count} requested profiles due to errors.`);
    }
    return profiles;
}

async function evaluateMatch(
    profileA: UserProfile,
    profileB: UserProfile,
    context: string,
    promptInstruction: string
): Promise<ExpectedMatch | null> {
    
    const prompt = 
`Given the following two user profiles, generated for the context '${context}' based on the instruction '${promptInstruction}', evaluate their potential match strength.

Profile A (${profileA.user_id}):
"${profileA.input_text}"

Profile B (${profileB.user_id}):
"${profileB.input_text}"

Considering potential complementarity, shared goals, or shared interests relevant to the context, rate the expected match strength on this scale: High, Medium, Low, None.
Provide a concise, one-sentence reason for your rating.

Format your response exactly like this:
Strength: [High|Medium|Low|None]
Reason: [Your one-sentence reason here]`

    try {
        // console.log(`   - Evaluating match ${profileA.user_id} <-> ${profileB.user_id}...`);
        const response = await anthropic.messages.create({
            model: MODEL_NAME,
            max_tokens: 100, // Should be enough for strength + reason
            temperature: 0.2, // Lower temperature for more deterministic evaluation
            messages: [
                { role: 'user', content: prompt },
            ],
        });

        if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
            const responseText = response.content[0].text.trim();
            // Basic parsing - could be made more robust
            const strengthMatch = responseText.match(/Strength: (High|Medium|Low|None)/i);
            const reasonMatch = responseText.match(/Reason: (.*)/i);

            const strength = strengthMatch ? strengthMatch[1] as ExpectedMatch['expected_match_strength'] : null;
            const reason = reasonMatch ? reasonMatch[1].trim() : 'Reason parsing failed.';

            if (strength && strength !== 'None') {
                return {
                    user_a_id: profileA.user_id,
                    user_b_id: profileB.user_id,
                    expected_match_strength: strength,
                    reason: reason
                };
            }
        } else {
             console.warn(`   - Warning: Could not extract text from evaluation response for ${profileA.user_id} <-> ${profileB.user_id}.`);
        }

    } catch (error) {
        console.error(`   - Error evaluating match ${profileA.user_id} <-> ${profileB.user_id}:`, error);
    }

    return null;
}

// --- Main Execution Logic ---

async function main() {
    const program = new Command();
    program
        .option('-n, --numProfiles <number>', 'Number of profiles to generate', '10')
        .option('-o, --output <path>', 'Output JSON file path', '../generated_test_data.json') 
        .option('-a, --avgMatches <number>', 'Target average number of matches per profile (approximate)', '3')
        .option('-v, --verbosity <number>', 'Profile verbosity (0-10, affects length, detail, creativity)', '5')
        .option('-c, --context <string>', 'The context/setting for profile generation (e.g., conference, hackathon)', 'general networking')
        .option('-p, --prompt <string>', 'The prompt given to users for their intro', 'Introduce yourself, mention your skills, goals, and what you are looking for.');

    program.parse(process.argv);
    const options = program.opts();

    const numProfiles = parseInt(options.numProfiles, 10);
    const avgMatchesTarget = parseInt(options.avgMatches, 10); 
    const verbosity = parseInt(options.verbosity, 10);
    const context = options.context as string;
    const promptInstruction = options.prompt as string;
    const outputFile = path.resolve(options.output); 

    // Validate parameters
    if (isNaN(numProfiles) || numProfiles <= 0) {
        console.error('Invalid number of profiles specified.');
        process.exit(1);
    }
     if (isNaN(avgMatchesTarget) || avgMatchesTarget < 0) {
        console.error('Invalid average matches specified.');
        process.exit(1);
    }
    if (isNaN(verbosity) || verbosity < 0 || verbosity > 10) {
        console.error('Invalid verbosity specified (must be 0-10).');
        process.exit(1);
    }

    console.log(`Generating test data: Profiles=${numProfiles}, Context='${context}', Prompt='${promptInstruction}', AvgMatchesTarget~=${avgMatchesTarget}, Verbosity=${verbosity}`);

    const profiles = await generateProfiles(numProfiles, context, promptInstruction, verbosity);

    if (profiles.length === 0) {
        console.error('Failed to generate any profiles. Exiting.');
        process.exit(1);
    }

    console.log(`Generated ${profiles.length} profiles. Evaluating potential matches...`);
    const expected_matches: ExpectedMatch[] = [];
    let evaluatedPairs = 0;
    const totalPairs = (profiles.length * (profiles.length - 1)) / 2;

    // Iterate through unique pairs
    for (let i = 0; i < profiles.length; i++) {
        for (let j = i + 1; j < profiles.length; j++) {
            evaluatedPairs++;
            console.log(`  - Evaluating pair ${evaluatedPairs}/${totalPairs} (${profiles[i].user_id} <-> ${profiles[j].user_id})`);
            const matchResult = await evaluateMatch(profiles[i], profiles[j], context, promptInstruction);
            if (matchResult) {
                expected_matches.push(matchResult);
            }
            // Add delay between evaluations
            await delay(200); // 200ms delay
        }
    }
    console.log(`Finished evaluation. Found ${expected_matches.length} potential matches.`);

    const testData: TestData = {
        profiles,
        expected_matches
    };

    try {
        await fs.writeFile(outputFile, JSON.stringify(testData, null, 2));
        console.log(`Test data successfully written to ${outputFile}`);
    } catch (error) {
        console.error('Error writing test data file:', error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error('An error occurred:', error);
    process.exit(1);
});
