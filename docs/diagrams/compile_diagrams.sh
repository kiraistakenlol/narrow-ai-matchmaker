#!/bin/bash

# Script to compile specified .dot/.mmd/.d2 file or all files in this directory to SVG
# Output files will be placed in a 'compiled' subdirectory.

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
OUTPUT_DIR="${SCRIPT_DIR}/compiled"

# Create the output directory if it doesn't exist
mkdir -p "${OUTPUT_DIR}"

# --- Function to compile a single file ---
compile_single_file() {
    local input_file="$1"
    local filename=$(basename "$input_file")
    local extension="${filename##*.}"
    local base_filename="${filename%.*}"
    local output_svg="${OUTPUT_DIR}/${base_filename}.svg"

    echo "Compiling single file: $input_file"

    case "$extension" in
        dot)
            if ! command -v dot &> /dev/null; then
                echo "Error: Graphviz 'dot' command not found." >&2
                return 1
            fi
            echo " - Compiling ${filename} to ${base_filename}.svg..."
            dot -Tsvg "$input_file" -o "$output_svg"
            if [ $? -ne 0 ]; then echo "   Error compiling ${filename}" >&2; return 1; fi
            ;;
        mmd)
            if ! command -v mmdc &> /dev/null; then
                echo "Error: Mermaid CLI 'mmdc' command not found." >&2
                echo "Install via: npm install -g @mermaid-js/mermaid-cli" >&2
                return 1
            fi
            echo " - Compiling ${filename} to ${base_filename}.svg..."
            mmdc -i "$input_file" -o "$output_svg" -w 1024 # Set width
            if [ $? -ne 0 ]; then echo "   Error compiling ${filename}" >&2; return 1; fi
            ;;
        d2)
            if ! command -v d2 &> /dev/null; then
                echo "Error: D2 CLI 'd2' command not found." >&2
                echo "Install via: curl -fsSL https://d2lang.com/install.sh | sh -s --" >&2
                return 1
            fi
            echo " - Compiling ${filename} to ${base_filename}.svg..."
            d2 "$input_file" "$output_svg"
            if [ $? -ne 0 ]; then echo "   Error compiling ${filename}" >&2; return 1; fi
            ;;
        *)
            echo "Error: Unsupported file type: .$extension (expected .dot, .mmd, or .d2)" >&2
            return 1
            ;;
    esac
    echo "Successfully created ${output_svg}"
    return 0
}

# --- Main Logic ---
if [ -n "$1" ]; then
    # Single file mode
    input_file="$1"
    if [ ! -f "$input_file" ]; then
        echo "Error: Input file not found: $input_file" >&2
        exit 1
    fi
    compile_single_file "$input_file"
    exit $?
else
    # Compile all mode
    # --- Compile Graphviz (.dot) files ---
    echo "Compiling Graphviz (.dot) diagrams..."
    if ! command -v dot &> /dev/null; then
        echo "Graphviz 'dot' command not found. Skipping .dot compilation." >&2
    else
        find "${SCRIPT_DIR}" -maxdepth 1 -name '*.dot' | while read -r dotfile; do
            if [ -f "$dotfile" ]; then compile_single_file "$dotfile"; fi
        done
    fi

    # --- Compile Mermaid (.mmd) files ---
    echo "Compiling Mermaid (.mmd) diagrams..."
    if ! command -v mmdc &> /dev/null; then
        echo "Mermaid CLI 'mmdc' command not found. Skipping .mmd compilation." >&2
        echo "Install via: npm install -g @mermaid-js/mermaid-cli" >&2
    else
        find "${SCRIPT_DIR}" -maxdepth 1 -name '*.mmd' | while read -r mmdfile; do
            if [ -f "$mmdfile" ]; then compile_single_file "$mmdfile"; fi
        done
    fi

    # --- Compile D2 (.d2) files ---
    echo "Compiling D2 (.d2) diagrams..."
    if ! command -v d2 &> /dev/null; then
        echo "D2 CLI 'd2' command not found. Skipping .d2 compilation." >&2
        echo "Install via: curl -fsSL https://d2lang.com/install.sh | sh -s --" >&2
    else
        find "${SCRIPT_DIR}" -maxdepth 1 -name '*.d2' | while read -r d2file; do
            if [ -f "$d2file" ]; then compile_single_file "$d2file"; fi
        done
    fi

    echo "Diagram compilation finished."
    exit 0
fi 