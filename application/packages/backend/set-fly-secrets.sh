#!/bin/bash

# Sets Fly.io secrets from a .env-style file.

usage() {
    echo "Usage: $0 <path_to_env_file> [-a <fly_app_name>]"
    echo "  <path_to_env_file>  Path to the .env file containing secrets (e.g., .env.fly)"
    echo "  -a <fly_app_name>   (Optional) Specify the Fly.io application name."
    exit 1
}

if [ -z "$1" ]; then
    usage
fi

ENV_FILE_PATH="$1"
FLY_APP_NAME_ARG=""

if [ "$2" == "-a" ] && [ ! -z "$3" ]; then
    FLY_APP_NAME_ARG="-a $3"
elif [ ! -z "$2" ]; then
    echo "Error: Invalid arguments for -a flag."
    usage
fi

if [ ! -f "$ENV_FILE_PATH" ]; then
    echo "Error: Environment file not found at '$ENV_FILE_PATH'"
    exit 1
fi

echo "Reading secrets from: $ENV_FILE_PATH"
if [ ! -z "$FLY_APP_NAME_ARG" ]; then
    echo "Targeting Fly app: $3"
fi
echo "---IMPORTANT: Ensure '$ENV_FILE_PATH' is NOT committed to Git if it contains real secrets!---"
echo ""

while IFS= read -r line || [[ -n "$line" ]]; do
    trimmed_line=$(echo "$line" | xargs) # xargs trims whitespace effectively

    if [ -z "$trimmed_line" ] || [[ "$trimmed_line" == \#* ]]; then
        continue
    fi

    if [[ "$trimmed_line" =~ ^([^=]+)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"

        # Basic trim of surrounding quotes from value
        if [[ "$value" == \"*\" && "$value" == *\" ]]; then # Starts and ends with "
            value="${value:1:${#value}-2}"
        elif [[ "$value" == \'*\' && "$value" == *\' ]]; then # Starts and ends with '
            value="${value:1:${#value}-2}"
        fi
        
        echo "Setting secret: $key..."
        # shellcheck disable=SC2086 # FLY_APP_NAME_ARG is intentionally unquoted
        if flyctl secrets set "$key=$value" $FLY_APP_NAME_ARG; then
            echo "Secret '$key' set successfully."
        else
            echo "Error setting secret '$key'. Check flyctl output above."
        fi
        echo ""
    else
        echo "Warning: Skipping malformed line: '$trimmed_line'"
    fi
done < "$ENV_FILE_PATH"

echo "All secrets processed." 