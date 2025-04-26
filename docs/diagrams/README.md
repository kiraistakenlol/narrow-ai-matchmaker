# Diagrams: Graphviz, Mermaid & D2

This directory contains diagrams for the Narrow AI Matchmaker project using:
*   [Graphviz](https://graphviz.org/) (DOT language) for static architecture and data models (`raw/*.dot` files).
*   [Mermaid](https://mermaid.js.org/) for sequence diagrams (`raw/*.mmd` files).
*   [D2](https://d2lang.com/) for various diagrams, often with better layout (`raw/*.d2` files).

The source files reside in the `raw/` subdirectory, and compiled SVG versions are placed in the `compiled/` subdirectory by the provided scripts.

## Graphviz Diagrams (.dot files)

### Graphviz Installation

Graphviz is required to render the `.dot` files.

```bash
# Install Graphviz (macOS)
brew install graphviz

# Install Graphviz (Debian/Ubuntu)
sudo apt-get update && sudo apt-get install graphviz
```

Check the [official Graphviz download page](https://graphviz.org/download/) for other operating systems.

### Rendering Graphviz

Use the `dot` command to render diagrams. Example:

```bash
# Render a DOT file to SVG
dot -Tsvg -o compiled/some_diagram.svg raw/some_diagram.dot
```

## Mermaid Sequence Diagrams (.mmd files)

Sequence diagrams are defined using Mermaid syntax in `raw/*.mmd` files.

### Mermaid CLI Installation (mmdc)

The Mermaid CLI (`mmdc`) is needed to render `.mmd` files from the command line. It requires Node.js and npm.

1.  **Install Node.js:** If you don't have it, download from [https://nodejs.org/](https://nodejs.org/) (LTS recommended).
2.  **Install mmdc:**
    ```bash
    npm install -g @mermaid-js/mermaid-cli
    # or: sudo npm install -g @mermaid-js/mermaid-cli
    ```
3.  **Verify:**
    ```bash
    mmdc --version
    ```

### Rendering Mermaid

Use the `mmdc` command:

```bash
# Render async upload sequence to SVG
mmdc -i raw/sequence_option1_async_upload.mmd -o compiled/sequence_option1_async_upload.svg
```

## D2 Diagrams (.d2 files)

Diagrams are defined using D2 syntax in `raw/*.d2` files.

### D2 Installation

The D2 CLI is required to render `.d2` files.

```bash
# Install D2 via script (Linux/macOS - recommended)
curl -fsSL https://d2lang.com/install.sh | sh -s -- --version latest

# Install D2 (macOS via Homebrew)
brew install d2
```

Check the [official D2 installation guide](https://d2lang.com/tour/install) for other OS/methods.

### Rendering D2

Use the `d2` command:

```bash
# Render a D2 file to SVG (uses ELK layout via compile script)
d2 --layout=elk docs/diagrams/raw/backend_services.d2 docs/diagrams/compiled/backend_services.svg

# Render with a specific theme (e.g., Terminal theme) using ELK
d2 --layout=elk -t 8 docs/diagrams/raw/backend_services.d2 docs/diagrams/compiled/backend_services_terminal.svg
```

## Automatic Compilation (Watching for Changes)

To automatically recompile diagrams whenever you save changes to a file in the `raw/` directory (`.dot`, `.mmd`, or `.d2`), you can use the `scripts/watch_diagrams.sh` script. This script requires `fswatch`.

### fswatch Installation

```bash
# Install fswatch (macOS)
brew install fswatch

# Install fswatch (Debian/Ubuntu)
sudo apt-get update && sudo apt-get install fswatch
```

### Running the Watcher

1.  Make sure both scripts are executable:
    ```bash
    chmod +x scripts/compile_diagrams.sh
    chmod +x scripts/watch_diagrams.sh
    ```
2.  Run the watch script from the project root:
    ```bash
    ./docs/diagrams/scripts/watch_diagrams.sh
    ```
    This will monitor the `docs/diagrams/raw` directory and run `scripts/compile_diagrams.sh` for the specific file that was changed. Press `Ctrl+C` to stop the watcher.

## Diagram Types (Source in `raw/`)

### Graphviz (.dot)

Used for static architecture and data models.

*   `system_components.dot`: High-level system architecture.
*   `conceptual_data_model.dot`: Conceptual data model.
*   `aws_infrastructure.dot`: AWS infrastructure overview.
*   `backend_services_dot.dot`: Backend service interactions (alternative rendering).

### Mermaid (.mmd)

Used for sequence diagrams and potentially other dynamic flows.

*   `sequence_onboarding.mmd`: User onboarding flow.
*   `sequence_join_event.mmd`: Flow for joining an existing event.
*   `sequence_get_matches.mmd`: Flow for retrieving matches.
*   `onboarding_flow_highlevel.mmd`: Simplified onboarding overview.
*   `database_schema.mmd`: Database schema overview.

### D2 (.d2)

*   `backend_services.d2`: Backend service interactions (often preferred layout).

## GitHub Integration

*   **Source:** Commit the source files in the `raw/` directory.
*   **Compiled:** Commit the compiled SVG/PNG files in the `compiled/` directory. Reference these compiled images in Markdown files.
    ```markdown
    ![System Components](./compiled/system_components.svg)
    ```
    ```markdown
    ![Async Upload Sequence](./compiled/sequence_option1_async_upload.svg)
    ```
    ```markdown
    ![Backend Services (D2)](./compiled/backend_services.svg)
    ```
