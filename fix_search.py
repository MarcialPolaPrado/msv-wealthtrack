import re

with open('app.js', encoding='utf-8') as f:
    content = f.read()

# Find and fix the broken search results HTML block
# The broken version has spaces in tags: < div ... data - ticker ...
# Pattern: match the broken innerHTML assignments for search results

# Fix matches block
content = re.sub(
    r"elements\.searchResults\.innerHTML = matches\.map\(m => `\s*< div class=\"search-item\" data - ticker=\"\$\{m\.ticker\}\" data - name=\"\$\{m\.name\}\" >\s*<span class=\"ticker\">\$\{m\.ticker\}</span>\s*<span class=\"name\">\$\{m\.name\}</span>\s*< /div >\s*`\)\.join\(''\);",
    """elements.searchResults.innerHTML = matches.map(m => `
                    <div class="search-item" data-ticker="${m.ticker}" data-name="${m.name}">
                        <span class="ticker">${m.ticker}</span>
                        <span class="name">${m.name}</span>
                    </div>
                `).join('');""",
    content
)

# Fix no-results block
content = re.sub(
    r"elements\.searchResults\.innerHTML = `\s*< div class=\"search-item no-results\" style = \"cursor: default; opacity: 0\.7;\" >\s*No se encontraron resultados\.\s*< /div >\s*`;",
    """elements.searchResults.innerHTML = `
                    <div class="search-item no-results" style="cursor:default; opacity:0.7;">
                        No se encontraron resultados.
                    </div>
                `;""",
    content
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done. Verifying...')
# Confirm fix
if 'data - ticker' in content:
    print('WARNING: Still has broken data - ticker')
else:
    print('OK: data-ticker is clean')
if '< div class="search-item"' in content or '< div class=\\"search-item\\"' in content:
    print('WARNING: Still has broken < div')
else:
    print('OK: div tags are clean')
