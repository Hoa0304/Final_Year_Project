# Diagram Viewing and Export Guide

This guide explains how to view and export the Mermaid diagrams from the System Design Documentation.

## Viewing Diagrams

### Option 1: GitHub/GitLab (Recommended)
- Push the documentation to GitHub or GitLab
- The Mermaid diagrams will render automatically in the markdown viewer
- View the file: `docs/SYSTEM_DESIGN.md`

### Option 2: VS Code with Mermaid Extension
1. Install the "Markdown Preview Mermaid Support" extension in VS Code
2. Open `docs/SYSTEM_DESIGN.md`
3. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac) to open preview
4. Diagrams will render automatically

### Option 3: Online Mermaid Editor
1. Go to https://mermaid.live/
2. Copy the Mermaid code from any diagram in `SYSTEM_DESIGN.md`
3. Paste into the editor
4. View and export as PNG/SVG

### Option 4: Mermaid CLI (For Exporting)
1. Install Mermaid CLI:
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   ```

2. Extract diagram code from `SYSTEM_DESIGN.md` (the code between ```mermaid and ```)

3. Save to a `.mmd` file

4. Export as PNG:
   ```bash
   mmdc -i diagram.mmd -o diagram.png
   ```

5. Export as SVG:
   ```bash
   mmdc -i diagram.mmd -o diagram.svg
   ```

## List of Diagrams in SYSTEM_DESIGN.md

1. **Use Case Diagram - User** (Line ~XXX)
2. **Use Case Diagram - Admin** (Line ~XXX)
3. **Use Case Diagram - Complete System** (Line ~XXX)
4. **Activity Diagram - Purchase Product** (Line ~XXX)
5. **Activity Diagram - Complete Task** (Line ~XXX)
6. **Activity Diagram - Stock Trading (Buy)** (Line ~XXX)
7. **Activity Diagram - Generate AI Recommendations** (Line ~XXX)
8. **Sequence Diagram - User Registration and Login** (Line ~XXX)
9. **Sequence Diagram - Purchase Product** (Line ~XXX)
10. **Sequence Diagram - Complete Task** (Line ~XXX)
11. **Sequence Diagram - Buy Stocks** (Line ~XXX)
12. **Sequence Diagram - Get AI Recommendations** (Line ~XXX)
13. **Sequence Diagram - Admin Grant Coins** (Line ~XXX)
14. **Component Diagram** (Line ~XXX)
15. **Deployment Diagram** (Line ~XXX)
16. **Entity Relationship Diagram (ERD)** (Line ~XXX)

## Quick Export Script

Create a script to extract and export all diagrams:

```bash
# extract-diagrams.sh
#!/bin/bash

# Extract all mermaid code blocks from SYSTEM_DESIGN.md
awk '/```mermaid/,/```/' docs/SYSTEM_DESIGN.md | \
  awk 'BEGIN{RS="```mermaid";FS="```"} NR>1{print $1 > "diagram"NR-1".mmd"}'

# Export all diagrams
for file in diagram*.mmd; do
    mmdc -i "$file" -o "${file%.mmd}.png"
done
```

## Alternative: Use Draw.io / Lucidchart

If you prefer traditional diagramming tools:
1. Use the Mermaid diagrams as reference
2. Recreate in Draw.io (https://app.diagrams.net/) or Lucidchart
3. Export as PNG/PDF for documentation

## Recommended Tools

- **VS Code**: Best for editing and previewing
- **Mermaid Live Editor**: Best for quick viewing and testing
- **Mermaid CLI**: Best for batch exporting
- **GitHub/GitLab**: Best for sharing and collaboration


