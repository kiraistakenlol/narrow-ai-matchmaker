# Test Data Generator (Located in `generator/`)

Generates synthetic user profiles and evaluates expected matches using the Anthropic API.

## Setup

1.  Ensure you are in the `generator` directory: `cd matching/playground/test_data/generator`
2.  `npm install`
3.  Create `.env` file in *this* directory (`generator/`) with `ANTHROPIC_API_KEY='your_key_here'`
    *   (Ensure `matching/playground/test_data/generator/.env` is in root `.gitignore`)

## Usage

Run from within this directory (`matching/playground/test_data/generator/`):

```bash
# Example generating 20 profiles for a 'Tech Conference' context with specific parameters:
npm run generate -- \
  --numProfiles 20 \
  --output ../conference_data.json \
  --avgMatches 4 \
  --diversity 7 \
  --verbosity 6 \
  --context "Tech Conference 2025" \
  --prompt "Briefly introduce yourself, your main area of expertise, and what connections you hope to make at this conference." 
```

### Command-line Options

| Option                         | Description                                                                    | Default                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `-n, --numProfiles <number>` | Specifies the number of user profiles to generate.                           | `10`                                                                             |
| `-o, --output <path>`        | Sets the path for the output JSON file (relative to this `generator` dir).   | `../generated_test_data.json`                                                  |
| `-a, --avgMatches <number>`  | Target average number of generated matches per profile (approximate).        | `3`                                                                              |
| `-d, --diversity <number>`   | Controls profile variation (0=low, 10=high). *Influences LLM params.*       | `5`                                                                              |
| `-v, --verbosity <number>`   | Controls profile length/detail (0=brief, 10=detailed). *Influences LLM.*      | `5`                                                                              |
| `-c, --context <string>`     | The context/setting for profile generation (e.g., conference, hackathon).    | `general networking`                                                             |
| `-p, --prompt <string>`      | The prompt/instruction given to users for their introduction.                  | `Introduce yourself, mention your skills, goals, and what you are looking for.` |

**Note:** Requires API key in `./.env` and may incur costs. 