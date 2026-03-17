
import sys

def check_brackets(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    pairs = {'{': '}', '(': ')', '[': ']'}
    for i, char in enumerate(content):
        if char in pairs:
            stack.append((char, i))
        elif char in pairs.values():
            if not stack:
                print(f"Extra closing bracket '{char}' at index {i}")
                return
            opening, pos = stack.pop()
            if pairs[opening] != char:
                print(f"Mismatched bracket '{char}' at index {i}, expected closing for '{opening}' from index {pos}")
                return
    
    if stack:
        for char, pos in stack:
            print(f"Unclosed bracket '{char}' at index {pos}")
    else:
        print("All brackets are balanced.")

if __name__ == '__main__':
    check_brackets(sys.argv[1])
