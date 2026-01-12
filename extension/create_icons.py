#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the YT Coach extension.
Requires: pip install pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    """Create a simple icon with YT text"""
    # Create image with red background
    img = Image.new('RGB', (size, size), color='#FF0000')
    draw = ImageDraw.Draw(img)

    # Add white "YT" text
    text = "YT"

    # Try to use a default font, fall back to default if not available
    try:
        font_size = int(size * 0.6)
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        font = ImageFont.load_default()

    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2

    # Draw the text
    draw.text((x, y), text, fill='white', font=font)

    # Save the image
    img.save(filename)
    print(f"Created {filename}")

# Create icons directory if it doesn't exist
assets_dir = os.path.dirname(os.path.abspath(__file__)) + '/assets'
os.makedirs(assets_dir, exist_ok=True)

# Create the three icon sizes
create_icon(16, os.path.join(assets_dir, 'icon-16.png'))
create_icon(48, os.path.join(assets_dir, 'icon-48.png'))
create_icon(128, os.path.join(assets_dir, 'icon-128.png'))

print("\n✓ All icons created successfully!")
print("You can now add the icon references back to manifest.json")
