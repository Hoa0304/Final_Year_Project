#!/usr/bin/env python3
"""
Convert SYSTEM_DESIGN.md to HTML with Mermaid.js support
"""
import re
import os

def markdown_to_html(md_file, html_file):
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # HTML template
    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HMall System Design Documentation</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }}
        h1 {{
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #34495e;
            margin-top: 40px;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 5px;
        }}
        h3 {{
            color: #555;
            margin-top: 30px;
        }}
        h4 {{
            color: #666;
            margin-top: 20px;
        }}
        .diagram-container {{
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            page-break-inside: avoid;
            overflow-x: auto;
        }}
        .diagram-title {{
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 15px;
            color: #2c3e50;
        }}
        .mermaid {{
            text-align: center;
            background: white;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background-color: #3498db;
            color: white;
        }}
        tr:nth-child(even) {{
            background-color: #f2f2f2;
        }}
        .toc {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }}
        .toc ul {{
            list-style-type: none;
            padding-left: 0;
        }}
        .toc li {{
            margin: 8px 0;
        }}
        .toc a {{
            color: #3498db;
            text-decoration: none;
        }}
        .toc a:hover {{
            text-decoration: underline;
        }}
        code {{
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }}
        pre {{
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }}
        pre code {{
            background: none;
            padding: 0;
        }}
        ul, ol {{
            margin: 10px 0;
            padding-left: 30px;
        }}
        li {{
            margin: 5px 0;
        }}
        @media print {{
            .diagram-container {{
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
    {content}
    
    <script>
        mermaid.initialize({{ 
            startOnLoad: true,
            theme: 'default',
            flowchart: {{
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            }},
            sequence: {{
                diagramMarginX: 50,
                diagramMarginY: 10,
                actorMargin: 50,
                width: 150,
                height: 65,
                boxMargin: 10,
                boxTextMargin: 5,
                noteMargin: 10,
                messageMargin: 35
            }},
            er: {{
                fontSize: 12
            }}
        }});
    </script>
</body>
</html>"""
    
    # Convert markdown to HTML
    html_content = convert_markdown(content)
    
    # Write HTML file
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html_template.format(content=html_content))
    
    print(f"Converted {md_file} to {html_file}")

def convert_markdown(content):
    # Remove frontmatter if exists
    content = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, flags=re.DOTALL)
    
    # Convert headers
    content = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', content, flags=re.MULTILINE)
    content = re.sub(r'^## (.*?)$', r'<h2 id="\1">\1</h2>', content, flags=re.MULTILINE)
    content = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
    content = re.sub(r'^#### (.*?)$', r'<h4>\1</h4>', content, flags=re.MULTILINE)
    
    # Convert code blocks (mermaid)
    def replace_mermaid(match):
        diagram_code = match.group(1).strip()
        return f'<div class="diagram-container"><div class="mermaid">\n{diagram_code}\n</div></div>'
    
    content = re.sub(r'```mermaid\n(.*?)\n```', replace_mermaid, content, flags=re.DOTALL)
    
    # Convert code blocks (regular) - but skip mermaid
    def replace_code(match):
        if not match:
            return match.group(0) if hasattr(match, 'group') else ''
        lang = match.group(1) or ''
        code = match.group(2) if match.lastindex >= 2 else match.group(0)
        if lang == 'mermaid':
            return match.group(0)  # Keep mermaid blocks as is
        return f'<pre><code class="language-{lang}">{code}</code></pre>'
    
    # First handle mermaid, then other code blocks
    content = re.sub(r'```(\w+)?\n(.*?)\n```', replace_code, content, flags=re.DOTALL)
    
    # Convert inline code
    content = re.sub(r'`([^`]+)`', r'<code>\1</code>', content)
    
    # Convert bold
    content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', content)
    
    # Convert italic
    content = re.sub(r'\*(.*?)\*', r'<em>\1</em>', content)
    
    # Convert lists
    lines = content.split('\n')
    in_list = False
    list_type = None
    result = []
    
    for line in lines:
        # Check for unordered list
        if re.match(r'^[-*]\s+(.*)$', line):
            if not in_list or list_type != 'ul':
                if in_list:
                    result.append(f'</{list_type}>')
                result.append('<ul>')
                in_list = True
                list_type = 'ul'
            item = re.match(r'^[-*]\s+(.*)$', line).group(1)
            result.append(f'<li>{item}</li>')
        # Check for ordered list
        elif re.match(r'^\d+\.\s+(.*)$', line):
            if not in_list or list_type != 'ol':
                if in_list:
                    result.append(f'</{list_type}>')
                result.append('<ol>')
                in_list = True
                list_type = 'ol'
            item = re.match(r'^\d+\.\s+(.*)$', line).group(1)
            result.append(f'<li>{item}</li>')
        else:
            if in_list:
                result.append(f'</{list_type}>')
                in_list = False
                list_type = None
            if line.strip() and not line.startswith('<'):
                result.append(f'<p>{line}</p>')
            elif line.strip():
                result.append(line)
    
    if in_list:
        result.append(f'</{list_type}>')
    
    return '\n'.join(result)

if __name__ == '__main__':
    md_file = 'docs/SYSTEM_DESIGN.md'
    html_file = 'docs/SYSTEM_DESIGN.html'
    
    if not os.path.exists(md_file):
        print(f"Error: {md_file} not found")
        exit(1)
    
    markdown_to_html(md_file, html_file)
    print("Done!")


