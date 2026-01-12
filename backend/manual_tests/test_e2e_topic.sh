#!/bin/bash

# End-to-End Test: Extract Transcript → Generate By Topic Summary
# Usage: ./test_e2e_topic.sh [video_id]
# Example: ./test_e2e_topic.sh dQw4w9WgXcQ

VIDEO_ID=${1:-"dQw4w9WgXcQ"}  # Default to Rick Astley if no arg provided

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "End-to-End Test: Transcript → By Topic Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Video ID: $VIDEO_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Extract transcript
echo "Step 1: Extracting transcript..."
echo "-----------------------------------"

transcript_response=$(curl -s -X POST "http://localhost:8000/api/transcript/extract" \
  -H "Content-Type: application/json" \
  -d "{\"video_id\": \"$VIDEO_ID\"}")

# Check if transcript extraction was successful
success=$(echo "$transcript_response" | jq -r '.success')

if [ "$success" != "true" ]; then
    echo "❌ FAILED to extract transcript"
    echo "$transcript_response" | jq '.'
    exit 1
fi

echo "✅ Transcript extracted successfully"
echo ""

# Extract the transcript text (combine all segments)
transcript_text=$(echo "$transcript_response" | jq -r '.transcript | map(.text) | join(" ")')

# Preview first 200 chars of transcript
echo "Transcript preview:"
echo "$transcript_text" | head -c 200
echo "..."
echo ""

# Step 2: Generate By Topic summary
echo "Step 2: Generating By Topic summary..."
echo "-----------------------------------"

summary_response=$(curl -s -X POST "http://localhost:8000/api/summary/generate" \
  -H "Content-Type: application/json" \
  -d "{
    \"video_id\": \"$VIDEO_ID\",
    \"transcript\": $(echo "$transcript_text" | jq -R -s '.'),
    \"format\": \"topic\"
  }")

# Check if summary generation was successful
summary_success=$(echo "$summary_response" | jq -r '.success')

if [ "$summary_success" != "true" ]; then
    echo "❌ FAILED to generate summary"
    echo "$summary_response" | jq '.'
    exit 1
fi

echo "✅ By Topic summary generated successfully"
echo ""

# Display full summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "By Topic Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$summary_response" | jq -r '.summary'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Full Response:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$summary_response" | jq '.'
echo ""
