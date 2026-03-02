with open('app.js', encoding='utf-8') as f:
    lines = f.readlines()

# Print exact repr of lines around search results HTML (0-indexed: lines 1257-1271)
for i in range(1255, 1272):
    print(f"{i+1}: {repr(lines[i])}")
