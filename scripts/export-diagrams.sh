#!/bin/bash

# Bash script to export Mermaid diagrams as images
# Requires: npm install -g @mermaid-js/mermaid-cli

echo "Exporting Mermaid diagrams to images..."

# Check if mermaid-cli is installed
if ! command -v mmdc &> /dev/null; then
    echo "Mermaid CLI not found. Installing..."
    npm install -g @mermaid-js/mermaid-cli
fi

# Create output directory
OUTPUT_DIR="docs/diagrams"
mkdir -p "$OUTPUT_DIR"

# Extract and export diagrams from SYSTEM_DESIGN.md
MARKDOWN_FILE="docs/SYSTEM_DESIGN.md"

# Extract mermaid code blocks and export them
diagram_count=0
in_mermaid=false
diagram_code=""
temp_file=""

while IFS= read -r line; do
    if [[ $line == '```mermaid' ]]; then
        in_mermaid=true
        diagram_code=""
        ((diagram_count++))
        temp_file="temp_diagram_${diagram_count}.mmd"
    elif [[ $line == '```' && $in_mermaid == true ]]; then
        in_mermaid=false
        echo "$diagram_code" > "$temp_file"
        
        # Export as PNG
        output_file="${OUTPUT_DIR}/diagram_${diagram_count}.png"
        echo "Exporting diagram $diagram_count to $output_file..."
        mmdc -i "$temp_file" -o "$output_file" -w 1920 -H 1080 -b transparent
        
        # Export as SVG
        output_file_svg="${OUTPUT_DIR}/diagram_${diagram_count}.svg"
        echo "Exporting diagram $diagram_count to $output_file_svg..."
        mmdc -i "$temp_file" -o "$output_file_svg" -b transparent
        
        # Clean up temp file
        rm "$temp_file"
    elif [[ $in_mermaid == true ]]; then
        diagram_code+="$line"$'\n'
    fi
done < "$MARKDOWN_FILE"

echo ""
echo "Exported $diagram_count diagrams to $OUTPUT_DIR"
echo "Files:"
ls -lh "$OUTPUT_DIR"


