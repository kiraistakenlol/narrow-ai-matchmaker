# D2 Diagram Examples

This directory contains example diagrams for the Narrow AI Matchmaker project using [D2](https://d2lang.com/), a modern diagramming language with a simple, flexible syntax.

## Getting Started

### Installation

```bash
# Install D2 (macOS)
brew install d2
```

### Rendering Diagrams

```bash
# Basic rendering
d2 d2-example.d2 d2-output.svg

# Live preview with auto-updates
d2 --watch d2-example.d2
```

## D2 Capabilities

D2 is ideal for creating:
- System architecture diagrams
- Flowcharts
- Component diagrams
- Sequence diagrams
- Quick visual explanations

### Key Features

- **Clean, modern syntax** - Simple and intuitive
- **Live preview** - See changes instantly with `--watch`
- **Styling options** - Customize shapes, colors, and connections
- **Nested containers** - Create hierarchical diagrams
- **Markdown support** - Add formatted text and explanations
- **Style classes** - Reuse styling across elements

## GitHub Integration

To embed D2 diagrams in GitHub:

1. **SVG Export + Direct Embedding**:
   - Render to SVG: `d2 diagram.d2 diagram.svg`
   - Reference in markdown: `![Diagram Description](./path/to/diagram.svg)`

2. **D2 GitHub Action**:
   ```yaml
   name: Render D2 Diagrams
   on: [push]
   jobs:
     render:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: terrastruct/d2-action@v1
         - run: git config user.name github-actions && git config user.email github-actions@github.com
         - run: git add . && git commit -m "Render diagrams" && git push
   ```

3. **D2 + Mermaid Compatibility**:
   - Convert D2 to Mermaid (which GitHub natively renders)
   - Use the d2-to-mermaid converter 