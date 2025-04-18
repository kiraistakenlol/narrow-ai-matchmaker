# Test Data Generator (Located in `generator/`)

Generates synthetic user profiles and evaluates expected matches using the Anthropic API.

## Setup

1.  Ensure you are in the `generator` directory: `cd matching/playground/test_data/generator`
2.  `npm install`
3.  Create `.env` file in *this* directory (`generator/`) with `ANTHROPIC_API_KEY='your_key_here'`
    *   (Ensure `matching/playground/test_data/generator/.env` is in root `.gitignore`)

## Usage

First, configure your desired audience profile using the `index.html` page in this directory. Open it in your browser, adjust the settings (context, total profiles, attendee type distribution, response style examples), and use the "Generate Config File" button. Download the resulting `test_audience_config.json` file and save it in *this* directory (`generator/`).

Then, run the generator script from within this directory (`matching/playground/test_data/generator/`), providing the path to your config file (optional, defaults to `./test_audience_config.json`) and specifying the output file path:

```bash
# Example using the default config file name and specifying an output path:
npm run generate -- --output ../conference_data_v2.json

# Example explicitly specifying a different config file and output path:
npm run generate -- --config my_special_config.json --output ../my_special_data.json
```

### Command-line Options

| Option                         | Description                                                                                       | Default                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `-c, --config <path>`          | Path to the audience configuration JSON file.                                                    | `./test_audience_config.json`       |
| `-o, --output <path>`        | Sets the path for the output JSON file containing generated profiles (relative to this `generator` dir). | `../generated_profiles.json`     |


**Note:** Requires API key in `./.env` and may incur costs based on the number of profiles generated. 