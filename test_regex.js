const text = "Here is some text [(01:35)](https://www.youtube.com/watch?v=zvsB7qBOaMw&t=95s) and more text.";
const linkPattern = /\*\*\[([^\]]+)\]\((https?:\/\/[^\)]+)\)\*\*|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;

console.log("Testing text:", text);

let match;
const matches = [];
while ((match = linkPattern.exec(text)) !== null) {
  matches.push({
    fullMatch: match[0],
    group1: match[1],
    group2: match[2],
    group3: match[3],
    group4: match[4],
    index: match.index
  });
}

console.log("Matches found:", JSON.stringify(matches, null, 2));
