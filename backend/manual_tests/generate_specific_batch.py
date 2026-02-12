"""
Generate batch exports for specific YouTube videos

Video IDs:
- Ds7q3vGfyTg
- IfW1FMDkw4k
- 7Q8-FKWx-ls
- 82zF4BUqxkA
"""

import sys
import os

# Add parent directory to path to import export functions
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from scripts.export_batch_transcripts import export_as_txt, export_as_markdown, export_as_pdf

def main():
    # Create mock results for the 4 videos
    # In production, these would come from the batch API
    results = [
        {
            "video_id": "Ds7q3vGfyTg",
            "title": "Python Tutorial for Beginners",
            "status": "completed",
            "language": "en",
            "full_text": """Welcome to this Python tutorial for beginners.

In this video, we'll cover the basics of Python programming. Python is a high-level, interpreted programming language known for its clean syntax and readability.

We'll start with variables and data types. In Python, you don't need to declare variable types explicitly.

x = 5
name = "John"
is_learning = True

Next, we'll explore control structures like if statements and loops.

if x > 0:
    print("Positive number")

for i in range(5):
    print(i)

Functions are defined using the def keyword.

def greet(name):
    return f"Hello, {name}!"

Let's practice with some examples."""
        },
        {
            "video_id": "IfW1FMDkw4k",
            "title": "JavaScript Fundamentals",
            "status": "completed",
            "language": "en",
            "full_text": """JavaScript is the programming language of the web.

In this comprehensive tutorial, we'll cover JavaScript fundamentals from scratch.

Variables in JavaScript can be declared using let, const, or var.

let name = "Alice";
const pi = 3.14159;

Functions are first-class citizens in JavaScript.

function add(a, b) {
    return a + b;
}

We'll also cover arrays and objects.

const numbers = [1, 2, 3, 4, 5];
const person = {
    name: "Bob",
    age: 30
};

The DOM allows us to interact with web pages programmatically.

document.getElementById("demo").innerHTML = "Hello!";
"""
        },
        {
            "video_id": "7Q8-FKWx-ls",
            "title": "React JS Crash Course",
            "status": "completed",
            "language": "en",
            "full_text": """React is a JavaScript library for building user interfaces.

In this crash course, we'll learn React from the ground up.

Components are the building blocks of React applications.

function Welcome(props) {
    return <h1>Hello, {props.name}</h1>;
}

We'll use JSX, which looks like HTML but is actually JavaScript.

const element = <div>Hello, world!</div>;

State management is crucial in React. We'll use the useState hook.

const [count, setCount] = useState(0);

Props allow us to pass data between components.

<Card title="My Card" content="Some content" />

Let's build a complete application together."""
        },
        {
            "video_id": "82zF4BUqxkA",
            "title": "Machine Learning Basics",
            "status": "completed",
            "language": "en",
            "full_text": """Machine learning is a subset of artificial intelligence.

This video covers the fundamental concepts you need to get started.

Supervised learning uses labeled data for training.

# Example: Spam classification
emails = [
    {"text": "Win money now", "is_spam": true},
    {"text": "Meeting tomorrow", "is_spam": false}
]

Unsupervised learning finds patterns in unlabeled data.

# Customer segmentation
customers = [
    {"age": 25, "spending": 500},
    {"age": 45, "spending": 2000}
]

Neural networks are inspired by the human brain.

input_layer = [1, 0, 1]
hidden_layer = [0.5, 0.8, 0.2]
output_layer = [0.9]

We'll also discuss model evaluation and overfitting."""
        }
    ]

    # Output directory
    output_dir = os.path.join(os.path.dirname(__file__), 'batch_export_samples')
    os.makedirs(output_dir, exist_ok=True)

    print("Generating batch exports for 4 videos...")
    print(f"Output directory: {output_dir}")
    print()

    # Generate TXT export
    print("1. Generating TXT export...")
    txt_content = export_as_txt(results)
    txt_file = os.path.join(output_dir, 'batch_4_transcripts.txt')
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write(txt_content)
    print(f"   ✓ Created: {txt_file}")

    # Generate MD export
    print("2. Generating Markdown export...")
    md_content = export_as_markdown(results)
    md_file = os.path.join(output_dir, 'batch_4_transcripts.md')
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"   ✓ Created: {md_file}")

    # Generate PDF export
    print("3. Generating PDF export...")
    try:
        pdf_file = os.path.join(output_dir, 'batch_4_transcripts.pdf')
        export_as_pdf(results, pdf_file)
        print(f"   ✓ Created: {pdf_file}")
    except Exception as e:
        print(f"   ✗ PDF export failed: {e}")
        print("   (Install reportlab: pip install reportlab)")

    print()
    print("Batch exports generated successfully!")
    print()

    # Show file sizes
    print("File sizes:")
    for filename in sorted(os.listdir(output_dir)):
        if filename.startswith('batch_4'):
            filepath = os.path.join(output_dir, filename)
            size = os.path.getsize(filepath)
            print(f"  {filename}: {size:,} bytes")

    print()
    print("Videos included:")
    for i, result in enumerate(results, 1):
        print(f"  {i}. {result['title']} ({result['video_id']})")

if __name__ == "__main__":
    main()
