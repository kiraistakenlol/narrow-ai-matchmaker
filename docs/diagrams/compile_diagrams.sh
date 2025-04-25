#!/bin/bash

# Script to compile all .dot and .mmd files in this directory to SVG
# Output files will be placed in a 'compiled' subdirectory.

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
OUTPUT_DIR="${SCRIPT_DIR}/compiled"

# Create the output directory if it doesn't exist
mkdir -p "${OUTPUT_DIR}"

# --- Compile Graphviz (.dot) files ---
echo "Compiling Graphviz (.dot) diagrams..."
if ! command -v dot &> /dev/null; then
    echo "Graphviz 'dot' command not found. Skipping .dot compilation." >&2
else
    find "${SCRIPT_DIR}" -maxdepth 1 -name '*.dot' | while read -r dotfile; do
        if [ -f "$dotfile" ]; then
            filename=$(basename "$dotfile" .dot)
            output_svg="${OUTPUT_DIR}/${filename}.svg"
            echo " - Compiling ${filename}.dot to ${filename}.svg..."
            dot -Tsvg "$dotfile" -o "$output_svg"
            if [ $? -ne 0 ]; then
                echo "   Error compiling ${filename}.dot"
            fi
        fi
    done
fi

# --- Compile Mermaid (.mmd) files ---
echo "Compiling Mermaid (.mmd) diagrams..."
if ! command -v mmdc &> /dev/null; then
    echo "Mermaid CLI 'mmdc' command not found. Skipping .mmd compilation." >&2
    echo "Install via: npm install -g @mermaid-js/mermaid-cli" >&2
else
    find "${SCRIPT_DIR}" -maxdepth 1 -name '*.mmd' | while read -r mmdfile; do
        if [ -f "$mmdfile" ]; then
            filename=$(basename "$mmdfile" .mmd)
            output_svg="${OUTPUT_DIR}/${filename}.svg"
            echo " - Compiling ${filename}.mmd to ${filename}.svg..."
            mmdc -i "$mmdfile" -o "$output_svg" -w 1024 # Set width for better rendering
            if [ $? -ne 0 ]; then
                echo "   Error compiling ${filename}.mmd"
            fi
        fi
    done
fi

echo "Diagram compilation finished." 