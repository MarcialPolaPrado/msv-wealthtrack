import sys

def check_quotes(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    status = 'normal'
    q = ''
    start_line = 1
    line = 1
    
    for i, c in enumerate(content):
        if c == '\n':
            line += 1
        
        if status == 'normal':
            if c in ["'", '"', '`']:
                status = 'quote'
                q = c
                start_line = line
            elif c == '/' and i + 1 < len(content):
                if content[i+1] == '/':
                    # Single line comment - skip to next newline
                    status = 'comment_line'
                elif content[i+1] == '*':
                    # Multi line comment
                    status = 'comment_multi'
        elif status == 'quote':
            if c == q and content[i-1] != '\\':
                status = 'normal'
        elif status == 'comment_line':
            if c == '\n':
                status = 'normal'
        elif status == 'comment_multi':
            if c == '*' and i + 1 < len(content) and content[i+1] == '/':
                status = 'normal'
                # We need to skip the '/' next iteration, but this simple loop is okay
                
    if status == 'quote':
        print(f"Error: unclosed {q} starting at line {start_line}")
    elif status == 'comment_multi':
        print(f"Error: unclosed multiline comment starting at line {start_line}")
    else:
        # Check braces
        stack = []
        for i, c in enumerate(content):
            # Very simple logic, doesn't account for quotes/comments but we already checked those
            # Actually we should reuse the loop
            pass
        
        # Rewrite the loop to be more robust
        status = 'normal'
        q = ''
        line = 1
        stack = []
        for i, c in enumerate(content):
            if c == '\n': line += 1
            if status == 'normal':
                if c in ["'", '"', '`']:
                    status = 'quote'
                    q = c
                elif c == '/' and i + 1 < len(content):
                    if content[i+1] == '/': status = 'comment_line'
                    elif content[i+1] == '*': status = 'comment_multi'
                elif c == '{': stack.append(('{', line))
                elif c == '}':
                    if not stack:
                        print(f"Error: unexpected }} at line {line}")
                        return
                    stack.pop()
            elif status == 'quote':
                if c == q and content[i-1] != '\\': status = 'normal'
            elif status == 'comment_line':
                if c == '\n': status = 'normal'
            elif status == 'comment_multi':
                if c == '*' and i + 1 < len(content) and content[i+1] == '/': status = 'normal'
        
        if stack:
            print(f"Error: unclosed {{ starting at line {stack[-1][1]}")
        else:
            print("Braces and quotes are balanced.")

if __name__ == "__main__":
    check_quotes(sys.argv[1])
