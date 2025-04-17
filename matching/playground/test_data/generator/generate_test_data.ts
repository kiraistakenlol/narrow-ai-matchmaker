import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { Command } from 'commander';

// Load .env file from the script's directory
dotenv.config(); 

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

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

// --- Placeholder Functions --- (Implement actual API calls here)

// TODO: Update generateProfiles to accept and use ALL parameters
async function generateProfiles(
    count: number, 
    context: string, 
    promptInstruction: string, 
    diversity: number, 
    verbosity: number
): Promise<UserProfile[]> {
    console.log(`Generating ${count} profiles for context: '${context}' with prompt: '${promptInstruction}'...`);
    // TODO: Implement Anthropic API call to generate diverse profile texts
    //       Prompt structure example:
    //       "You are generating a profile for a user participating in [context]. 
    //        The user was asked: '[promptInstruction]'. 
    //        Generate a realistic user introduction based on this. 
    //        Desired diversity/creativity level: [diversity]/10.
    //        Desired length/detail level: [verbosity]/10."
    //       Generate 'count' variations, perhaps based on archetypes from example_match_scenarios.md
    //       Parse response and assign unique IDs
    
    // Example placeholder data:
    const profiles: UserProfile[] = [];
    for (let i = 1; i <= count; i++) {
        profiles.push({
            user_id: `user_${String(i).padStart(3, '0')}`,
            input_text: `Placeholder profile for ${context} user ${i}. Prompt: ${promptInstruction}. Skills: skill${i}. Goal: goal${i}.`
        });
    }
    return profiles;
}

// TODO: Update evaluateMatch to potentially use context/prompt/avgMatches target
async function evaluateMatch(
    profileA: UserProfile, 
    profileB: UserProfile, 
    context: string, 
    promptInstruction: string
    /*, avgMatchesTarget: number */
): Promise<ExpectedMatch | null> {
    // console.log(`Evaluating match between ${profileA.user_id} and ${profileB.user_id} in context: ${context}...`);
    // TODO: Implement Anthropic API call to evaluate match strength and reason
    //       Prompt: "Given Profile A [text A] and Profile B [text B], both generated for the context '[context]' based on the instruction '[promptInstruction]', 
    //                rate their expected match strength (High/Medium/Low/None) considering potential complementarity or shared goals relevant to the context.
    //                Provide a one-sentence reason."
    //       Parse the response carefully.
    // TODO: Potentially adjust logic or thresholds slightly based on avgMatchesTarget, though this is complex

    // Example placeholder logic (replace with actual LLM call):
    const strengthRoll = Math.random();
    let strength: ExpectedMatch['expected_match_strength'] = 'None';
    if (strengthRoll > 0.8) strength = 'High'; 
    else if (strengthRoll > 0.5) strength = 'Medium';
    else if (strengthRoll > 0.2) strength = 'Low';

    if (strength !== 'None') {
        return {
            user_a_id: profileA.user_id,
            user_b_id: profileB.user_id,
            expected_match_strength: strength,
            reason: `Placeholder reason for ${strength} match in context ${context}.`
        };
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
        .option('-d, --diversity <number>', 'Profile diversity (0-10, affects generation variation)', '5')
        .option('-v, --verbosity <number>', 'Profile verbosity (0-10, affects generation length/detail)', '5')
        .option('-c, --context <string>', 'The context/setting for profile generation (e.g., conference, hackathon)', 'general networking')
        .option('-p, --prompt <string>', 'The prompt given to users for their intro', 'Introduce yourself, mention your skills, goals, and what you are looking for.');

    program.parse(process.argv);
    const options = program.opts();

    const numProfiles = parseInt(options.numProfiles, 10);
    const avgMatchesTarget = parseInt(options.avgMatches, 10); 
    const diversity = parseInt(options.diversity, 10);
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
     if (isNaN(diversity) || diversity < 0 || diversity > 10) {
        console.error('Invalid diversity specified (must be 0-10).');
        process.exit(1);
    }
    if (isNaN(verbosity) || verbosity < 0 || verbosity > 10) {
        console.error('Invalid verbosity specified (must be 0-10).');
        process.exit(1);
    }

    console.log(`Generating test data: Profiles=${numProfiles}, Context='${context}', Prompt='${promptInstruction}', AvgMatches~=${avgMatchesTarget}, Diversity=${diversity}, Verbosity=${verbosity}`);

    // Pass parameters (or make available) to generation/evaluation functions
    const profiles = await generateProfiles(numProfiles, context, promptInstruction, diversity, verbosity);

    console.log('Evaluating potential matches...');
    const expected_matches: ExpectedMatch[] = [];
    // Iterate through unique pairs
    for (let i = 0; i < profiles.length; i++) {
        for (let j = i + 1; j < profiles.length; j++) {
            // Pass parameters if needed by evaluation logic
            const matchResult = await evaluateMatch(profiles[i], profiles[j], context, promptInstruction /*, avgMatchesTarget */);
            if (matchResult) {
                expected_matches.push(matchResult);
            }
        }
    }
    console.log(`Generated ${expected_matches.length} potential matches.`);

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
