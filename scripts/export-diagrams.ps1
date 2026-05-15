# PowerShell script to export Mermaid diagrams as images
# Requires: npm install -g @mermaid-js/mermaid-cli

Write-Host "Exporting Mermaid diagrams to images..." -ForegroundColor Green

# Check if mermaid-cli is installed
$mmdc = Get-Command mmdc -ErrorAction SilentlyContinue
if (-not $mmdc) {
    Write-Host "Mermaid CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g @mermaid-js/mermaid-cli
}

# Create output directory
$outputDir = "docs/diagrams"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Extract and export diagrams from SYSTEM_DESIGN.md
$markdownFile = "docs/SYSTEM_DESIGN.md"
$content = Get-Content $markdownFile -Raw

# Find all mermaid code blocks
$pattern = '```mermaid\s*\n(.*?)\n```'
$matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

$diagramCount = 0
foreach ($match in $matches) {
    $diagramCount++
    $diagramCode = $match.Groups[1].Value
    
    # Create temporary .mmd file
    $tempFile = "temp_diagram_$diagramCount.mmd"
    $diagramCode | Out-File -FilePath $tempFile -Encoding UTF8
    
    # Export as PNG with higher resolution for diagram 1
    $outputFile = "$outputDir/diagram_$diagramCount.png"
    Write-Host "Exporting diagram $diagramCount to $outputFile..." -ForegroundColor Cyan
    if ($diagramCount -eq 1) {
        # Higher resolution for diagram 1
        mmdc -i $tempFile -o $outputFile -w 2560 -H 1440 -b white -s 2
    } else {
        mmdc -i $tempFile -o $outputFile -w 1920 -H 1080 -b transparent
    }
    
    # Export as SVG
    $outputFileSvg = "$outputDir/diagram_$diagramCount.svg"
    Write-Host "Exporting diagram $diagramCount to $outputFileSvg..." -ForegroundColor Cyan
    mmdc -i $tempFile -o $outputFileSvg -b transparent
    
    # Clean up temp file
    Remove-Item $tempFile
}

Write-Host "`nExported $diagramCount diagrams to $outputDir" -ForegroundColor Green
Write-Host "Files:" -ForegroundColor Yellow
Get-ChildItem $outputDir | ForEach-Object {
    Write-Host "  - $($_.Name)" -ForegroundColor Gray
}


