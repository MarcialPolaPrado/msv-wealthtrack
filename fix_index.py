import os

path = r'c:\Users\marci\OneDrive\MSV\index.html'
with open(path, 'rb') as f:
    content = f.read()

# The broken block starts with <thead> and has 'nter;' in it.
# We want to replace it with a clean thead.
clean_thead = b'''<thead>
                                <tr style="border-bottom: 2px solid var(--primary); user-select: none;">
                                    <th style="text-align: left; cursor: pointer;" data-sort="date">Fecha <span class="sort-icon"></span></th>
                                    <th style="text-align: left; cursor: pointer;" data-sort="concept">Concepto <span class="sort-icon"></span></th>
                                    <th style="text-align: left; cursor: pointer;" data-sort="category">Categor\xeda <span class="sort-icon"></span></th>
                                    <th style="text-align: right; cursor: pointer;" data-sort="amount">Importe <span class="sort-icon"></span></th>
                                    <th style="text-align: center;">Acci\xf3n</th>
                                </tr>
                            </thead>'''

# Locate activityTable
table_start = content.find(b'id="activityTable"')
if table_start == -1:
    print("Could not find activityTable")
    exit(1)

# Find the next <thead> after activityTable start
thead_start = content.find(b'<thead>', table_start)
thead_end = content.find(b'</thead>', thead_start) + len(b'</thead>')

if thead_start != -1 and thead_end != -1:
    new_content = content[:thead_start] + clean_thead + content[thead_end:]
    with open(path, 'wb') as f:
        f.write(new_content)
    print("Fixed index.html activity table headers")
else:
    print("Could not find thead for activityTable")
