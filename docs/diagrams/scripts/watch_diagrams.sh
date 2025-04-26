#!/bin/bash

# Script to watch .dot, .mmd, and .d2 files in the raw/ directory using fswatch
# and trigger the compile_diagrams.sh script for the changed file.

DIAGRAMS_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
SOURCE_DIR="${DIAGRAMS_DIR}/../raw"
COMPILE_SCRIPT="${DIAGRAMS_DIR}/compile_diagrams.sh"

# Check if fswatch is installed
if ! command -v fswatch &> /dev/null; then
    echo "Error: fswatch command not found." >&2
    echo "Install it first (e.g., on macOS: brew install fswatch)" >&2
    exit 1
fi

# Check if compile script exists
if [ ! -f "$COMPILE_SCRIPT" ]; then
    echo "Error: Compile script not found at ${COMPILE_SCRIPT}" >&2
    exit 1
fi

echo "Watching for changes in ${SOURCE_DIR}/*.dot, ${SOURCE_DIR}/*.mmd, and ${SOURCE_DIR}/*.d2..."
echo "Press Ctrl+C to stop."

# Watch the raw directory, filter by extension, and execute compile script for each change
fswatch -r --event Created --event Updated --event Removed --event Renamed --latency 0.5 -e ".*" -i "\.dot$" -i "\.mmd$" -i "\.d2$" "${SOURCE_DIR}" | while read -r changed_file
do
    echo "----------------------------------------"
    echo "Change detected: ${changed_file}"
    # Check if file exists before compiling (it might have been deleted/renamed)
    if [ -f "$changed_file" ]; then
        # Call compile script with the specific file
        "$COMPILE_SCRIPT" "$changed_file"
    else 
        echo "File ${changed_file} no longer exists, skipping compilation."
        # Optionally, you could add logic here to remove the corresponding compiled file
        filename=$(basename "$changed_file")
        extension="${filename##*.}"
        base_filename="${filename%.*}"
        compiled_svg="${DIAGRAMS_DIR}/../compiled/${base_filename}.svg"
        if [ -f "$compiled_svg" ]; then rm "$compiled_svg"; echo "Removed ${compiled_svg}"; fi
    fi
done 