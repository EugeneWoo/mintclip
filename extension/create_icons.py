#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the Mintclip extension.
Requires: pip install pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename, background_color='#2D9E4E', grey=False, text="mc"):
    """Create an icon with lowercase cursive text"""
    # Use cloverleaf green for main icons, grey for disabled state
    if grey:
        bg_color = '#808080'  # Grey
    else:
        bg_color = background_color  # Cloverleaf green

    img = Image.new('RGB', (size, size), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Try to use cursive/script fonts, fall back to italic if not available
    font = None
    cursive_fonts = [
        "/System/Library/Fonts/Supplemental/Noteworthy.ttc",  # macOS cursive
        "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf",  # macOS handwriting
        "/System/Library/Fonts/HelveticaNeue.ttc",  # Fallback to italic Helvetica
    ]

    try:
        font_size = int(size * 0.6)  # Adjusted for two letters
        for font_path in cursive_fonts:
            try:
                font = ImageFont.truetype(font_path, font_size)
                break
            except:
                continue

        # If no cursive font found, use default italic
        if font is None:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        font = ImageFont.load_default()

    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]  # Adjust for baseline

    # Draw the text in white
    draw.text((x, y), text, fill='white', font=font)

    # Save the image
    img.save(filename)
    print(f"Created {filename}")

# Create icons directory if it doesn't exist
assets_dir = os.path.dirname(os.path.abspath(__file__)) + '/assets'
os.makedirs(assets_dir, exist_ok=True)

# Create the three icon sizes with cloverleaf green background
create_icon(16, os.path.join(assets_dir, 'icon-16.png'), background_color='#2D9E4E', grey=False)
create_icon(48, os.path.join(assets_dir, 'icon-48.png'), background_color='#2D9E4E', grey=False)
create_icon(128, os.path.join(assets_dir, 'icon-128.png'), background_color='#2D9E4E', grey=False)

# Create grey versions for disabled state
create_icon(16, os.path.join(assets_dir, 'icon-grey-16.png'), grey=True)
create_icon(48, os.path.join(assets_dir, 'icon-grey-48.png'), grey=True)
create_icon(128, os.path.join(assets_dir, 'icon-grey-128.png'), grey=True)

print("\n✓ All icons created successfully!")
print("Main icons: Cloverleaf green background with cursive lowercase 'mc'")
print("Grey icons: Grey background with cursive lowercase 'mc'")
