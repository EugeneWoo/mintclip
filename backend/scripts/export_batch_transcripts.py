"""
Batch Transcript Export Utility

Export batch transcript results in the same formats as single transcripts: TXT, PDF, MD

This script mirrors the export functionality from SummaryTab.tsx:
- export-text: Plain text format (.txt)
- export-pdf: PDF document with proper formatting (.pdf)
- export-markdown: Markdown format (.md)

Usage:
    python scripts/export_batch_transcripts.py --job-id JOB_ID --format txt               # Plain text (default)
    python scripts/export_batch_transcripts.py --job-id JOB_ID --format pdf              # PDF document
    python scripts/export_batch_transcripts.py --job-id JOB_ID --format md               # Markdown
    python scripts/export_batch_transcripts.py --job-id JOB_ID --format txt --zip        # ZIP with individual files

Default: Plain text (TXT)
"""

import requests
import json
import argparse
import re
import zipfile
from typing import List, Dict


def remove_timestamps(text: str) -> str:
    """
    Remove timestamp links from text (mirrors SummaryTab.tsx removeTimestamps function)

    Removes markdown timestamp links like: [text](https://www.youtube.com/watch?v=...&t=...)
    and cleans up any multiple spaces left behind.
    """
    cleaned = text

    # Remove markdown timestamp links
    cleaned = re.sub(
        r'\s?\[[^\]]+\]\(https://www\.youtube\.com/watch\?v=[^&]+&t=[^)]+\)',
        '',
        cleaned
    )

    # Clean up multiple spaces while preserving newlines
    cleaned = re.sub(r'[ \t]+(?=[.,;:!?])', ' ', cleaned)

    # Clean up double spaces while preserving line breaks
    cleaned = re.sub(r' {2,}', ' ', cleaned)
    cleaned = cleaned.replace(' \n', '\n')

    return cleaned


def remove_emojis_and_special_chars(text: str) -> str:
    """
    Remove emojis and special characters from text

    Keeps only standard ASCII characters, numbers, and basic punctuation
    that are commonly used in normal text. Also cleans up surrounding
    spaces and brackets left after removal.
    """
    # Define emoji and special character patterns to remove
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        u"\U0001f926-\U0001f937"
        u"\u2600-\u2B55"
        u"\u200d"
        u"\u23cf"
        u"\u23e9"
        u"\u231a"
        u"\ufe0f"  # dingbats
        u"\u3030"
        "]+", flags=re.UNICODE)

    # Remove emojis
    cleaned = emoji_pattern.sub(r'', text)

    # Remove specific musical note characters and other special symbols
    cleaned = re.sub(r'[\u266A\u266B\u266C]', '', cleaned)  # Music notes
    cleaned = re.sub(r'[\u2600-\u26FF]', '', cleaned)  # Miscellaneous symbols
    cleaned = re.sub(r'[\u2700-\u27BF]', '', cleaned)  # Dingbats

    # Clean up leftover brackets and spaces around removed emojis/special chars
    # Pattern: "text ♪ " -> "text", " text " -> "text"
    cleaned = re.sub(r'\s*[♪♫♬♩♭♮♯]\s*', ' ', cleaned)
    cleaned = re.sub(r'\s*\[\s*\]', '', cleaned)  # Empty brackets []
    cleaned = re.sub(r'\(\s*\)', '', cleaned)  # Empty parentheses ()

    # Clean up any double spaces left after removing emojis
    cleaned = re.sub(r' {2,}', ' ', cleaned)
    cleaned = cleaned.replace(' \n', '\n')

    # Clean up spaces before punctuation
    cleaned = re.sub(r'\s+([.,!?;:])', r'\1', cleaned)

    return cleaned.strip()


def format_filename(title: str, extension: str) -> str:
    """
    Format filename similar to SummaryTab.tsx formatFilename function

    Converts title to lowercase with underscores for safe filenames
    """
    # Convert title to lowercase with underscores (Python version)
    formatted = re.sub(r'[^a-z0-9]+', '_', title.lower())
    formatted = re.sub(r'^_+|_+$', '', formatted)
    return formatted if formatted else f'transcript.{extension}'


def export_as_txt(results: List[Dict]) -> str:
    """
    Export as plain text - mirrors SummaryTab.tsx export-text functionality

    Creates clean text export with dividers between videos
    """
    lines = []

    for i, result in enumerate(results, 1):
        if result['status'] == 'completed':
            video_id = result['video_id']
            video_title = result.get('title', video_id)
            full_text = result.get('full_text', '')

            # Remove any timestamps (for consistency with SummaryTab)
            clean_text = remove_timestamps(full_text)

            # Remove emojis and special characters
            clean_text = remove_emojis_and_special_chars(clean_text)

            # Add header for each video (matching SummaryTab style)
            lines.append(f"{'='*60}")
            lines.append(f"Video {i}: {video_title} ({video_id})")
            lines.append(f"{'='*60}")
            lines.append("")
            lines.append(clean_text)
            lines.append("")

    return '\n'.join(lines)


def export_single_transcript(result: Dict, format_type: str) -> str:
    """
    Export a single transcript in the specified format

    Returns the content as a string for use in ZIP files
    """
    if format_type == 'txt':
        text = remove_timestamps(result.get('full_text', ''))
        return remove_emojis_and_special_chars(text)
    elif format_type == 'md':
        video_id = result['video_id']
        language = result.get('language', 'unknown')
        full_text = result.get('full_text', '')
        clean_text = remove_timestamps(full_text)
        clean_text = remove_emojis_and_special_chars(clean_text)

        lines = [
            f"# {video_id}",
            "",
            f"**Language:** {language}",
            "",
            "---",
            "",
            clean_text
        ]
        return '\n'.join(lines)
    elif format_type == 'pdf':
        # For PDF, we need to return bytes, but ZIP handles this differently
        # This will be handled in the export_as_zip function
        return None
    return ''


def export_as_zip(results: List[Dict], format_type: str, output_path: str):
    """
    Export as ZIP file with individual transcripts

    Creates a ZIP file containing individual files for each video,
    named using the video title (or video_id as fallback)
    """
    completed_count = 0
    used_filenames = {}  # Track duplicates: filename -> count

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for result in results:
            if result['status'] != 'completed':
                continue

            completed_count += 1
            video_id = result['video_id']

            # Get video title or use video_id as fallback
            video_title = result.get('title', video_id)

            # Format filename using the same logic as SummaryTab
            base_filename = format_filename(video_title, format_type)

            # Handle duplicate filenames
            if base_filename in used_filenames:
                used_filenames[base_filename] += 1
                count = used_filenames[base_filename]
                # Insert count before extension
                name_parts = base_filename.rsplit('.', 1)
                if len(name_parts) == 2:
                    filename = f"{name_parts[0]}_{count}.{name_parts[1]}"
                else:
                    filename = f"{base_filename}_{count}"
            else:
                used_filenames[base_filename] = 1
                filename = base_filename

            # Generate content based on format
            if format_type == 'pdf':
                # For PDF, we need to create a temporary file and add it to ZIP
                import tempfile
                import os

                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_pdf:
                    tmp_path = tmp_pdf.name

                try:
                    # Create single-video PDF
                    export_single_pdf(result, tmp_path)
                    # Add to ZIP
                    zipf.write(tmp_path, filename)
                finally:
                    # Clean up temp file
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)
            else:
                # For TXT and MD, create content in memory
                content = export_single_transcript(result, format_type)
                zipf.writestr(filename, content)

    return completed_count


def export_single_pdf(result: Dict, output_path: str):
    """
    Export a single transcript as PDF

    Used by ZIP export to create individual PDF files
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.enums import TA_LEFT
    except ImportError:
        raise Exception(
            "PDF export requires reportlab. Install with: pip install reportlab"
        )

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=20,
        textColor='#333333',
        alignment=TA_LEFT
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        alignment=TA_LEFT,
        spaceAfter=10,
        leading=14,
        textColor='#333333'
    )

    metadata_style = ParagraphStyle(
        'CustomMetadata',
        parent=styles['BodyText'],
        fontSize=10,
        alignment=TA_LEFT,
        spaceAfter=8,
        textColor='#666666'
    )

    # Video header
    video_id = result['video_id']
    story.append(Paragraph(f"Video: {video_id}", title_style))
    story.append(Spacer(1, 0.1 * inch))

    language = result.get('language', 'unknown')
    story.append(Paragraph(f"<b>Language:</b> {language}", metadata_style))
    story.append(Spacer(1, 0.2 * inch))

    # Content
    full_text = result.get('full_text', '')
    clean_text = remove_timestamps(full_text)

    # Process content line by line
    lines = clean_text.split('\n')

    for line in lines:
        if not line.strip():
            story.append(Spacer(1, 0.05 * inch))
            continue

        if line.startswith('###'):
            text = re.sub(r'^###\s*', '', line)
            story.append(Paragraph(text, ParagraphStyle(
                'H3', parent=title_style, fontSize=14
            )))
        elif line.startswith('##'):
            text = re.sub(r'^##\s*', '', line)
            story.append(Paragraph(text, ParagraphStyle(
                'H2', parent=title_style, fontSize=16
            )))
        elif line.startswith('#'):
            text = re.sub(r'^#\s*', '', line)
            story.append(Paragraph(text, title_style))
        else:
            text = re.sub(r'\*\*(.+?)\*\*', r'\1', line)
            safe_text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            safe_text = safe_text.replace('\n', '<br/>')
            story.append(Paragraph(safe_text, body_style))

    doc.build(story)


def export_as_markdown(results: List[Dict]) -> str:
    """
    Export as Markdown - mirrors SummaryTab.tsx export-markdown functionality

    Creates well-formatted markdown with headers and metadata
    """
    lines = []

    lines.append("# Batch Transcript Export")
    lines.append("")
    completed_count = len([r for r in results if r['status'] == 'completed'])
    lines.append(f"**Total Videos:** {completed_count}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for i, result in enumerate(results, 1):
        if result['status'] == 'completed':
            video_id = result['video_id']
            video_title = result.get('title', video_id)
            language = result.get('language', 'unknown')
            full_text = result.get('full_text', '')

            # Remove timestamps (mirrors SummaryTab behavior)
            clean_text = remove_timestamps(full_text)

            # Remove emojis and special characters
            clean_text = remove_emojis_and_special_chars(clean_text)

            lines.append(f"## Video {i}: {video_title} ({video_id})")
            lines.append("")
            lines.append(f"**Language:** {language}")
            lines.append("")
            lines.append("---")
            lines.append("")
            lines.append(clean_text)
            lines.append("")
            lines.append("---")
            lines.append("")

    return '\n'.join(lines)


def export_as_pdf(results: List[Dict], output_path: str):
    """
    Export as PDF using reportlab - mirrors SummaryTab.tsx exportAsPDF functionality

    Creates professional PDF with proper formatting, matching the single transcript export
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.enums import TA_LEFT
    except ImportError:
        raise Exception(
            "PDF export requires reportlab. Install with: pip install reportlab"
        )

    # Create PDF with A4 format (matching SummaryTab.js)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    story = []
    styles = getSampleStyleSheet()

    # Custom styles - matching SummaryTab.js PDF export
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=20,
        textColor='#333333',
        alignment=TA_LEFT
    )

    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        spaceBefore=16,
        textColor='#444444',
        alignment=TA_LEFT
    )

    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        alignment=TA_LEFT,
        spaceAfter=10,
        leading=14,
        textColor='#333333'
    )

    metadata_style = ParagraphStyle(
        'CustomMetadata',
        parent=styles['BodyText'],
        fontSize=10,
        alignment=TA_LEFT,
        spaceAfter=8,
        textColor='#666666'
    )

    # Title
    story.append(Paragraph("Batch Transcript Export", title_style))
    story.append(Spacer(1, 0.15 * inch))

    # Metadata
    completed_count = len([r for r in results if r['status'] == 'completed'])
    story.append(Paragraph(f"<b>Total Videos:</b> {completed_count}", metadata_style))
    story.append(Spacer(1, 0.25 * inch))

    # Each transcript
    video_num = 0
    for result in results:
        if result['status'] == 'completed':
            video_num += 1
            video_id = result['video_id']
            video_title = result.get('title', video_id)
            language = result.get('language', 'unknown')
            full_text = result.get('full_text', '')

            # Remove timestamps (mirrors SummaryTab behavior)
            clean_text = remove_timestamps(full_text)

            # Remove emojis and special characters
            clean_text = remove_emojis_and_special_chars(clean_text)

            # Video header
            story.append(Paragraph(f"Video {video_num}: {video_title} ({video_id})", heading_style))
            story.append(Paragraph(f"<b>Language:</b> {language}", metadata_style))
            story.append(Spacer(1, 0.1 * inch))

            # Process content line by line (matching SummaryTab.js logic)
            lines = clean_text.split('\n')

            for line in lines:
                if not line.strip():
                    # Empty line spacing
                    story.append(Spacer(1, 0.05 * inch))
                    continue

                if line.startswith('###'):
                    # H3 heading
                    text = re.sub(r'^###\s*', '', line)
                    story.append(Paragraph(text, ParagraphStyle(
                        'H3', parent=heading_style, fontSize=14
                    )))
                elif line.startswith('##'):
                    # H2 heading
                    text = re.sub(r'^##\s*', '', line)
                    story.append(Paragraph(text, heading_style))
                elif line.startswith('#'):
                    # H1 heading
                    text = re.sub(r'^#\s*', '', line)
                    story.append(Paragraph(text, ParagraphStyle(
                        'H1', parent=title_style, fontSize=18
                    )))
                else:
                    # Regular text - handle inline bold markers
                    text = re.sub(r'\*\*(.+?)\*\*', r'\1', line)
                    # Escape HTML entities
                    safe_text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    # Replace newlines with <br/> tags
                    safe_text = safe_text.replace('\n', '<br/>')
                    story.append(Paragraph(safe_text, body_style))

            # Page break between videos (except last)
            if video_num < completed_count:
                story.append(PageBreak())

    # Build PDF
    doc.build(story)


def fetch_batch_results(job_id: str, base_url: str = "http://localhost:8000") -> List[Dict]:
    """Fetch batch transcript results from API"""
    url = f"{base_url}/api/transcript/batch/{job_id}/status"
    response = requests.get(url, timeout=10)

    if response.status_code == 404:
        raise Exception(f"Job {job_id} not found or expired (jobs expire after 24 hours)")
    elif response.status_code != 200:
        raise Exception(f"API error: {response.status_code} - {response.text}")

    data = response.json()

    if data['status'] not in ['complete', 'failed']:
        raise Exception(
            f"Job still processing. Status: {data['status']}, "
            f"Progress: {data['completed']}/{data['total']}"
        )

    return data['results']


def format_filename(title_or_job_id: str, format_type: str, custom_output: str = None) -> str:
    """
    Generate filename based on title (for individual files) or job_id (for batch files)

    For individual files: uses video title (lowercase with underscores)
    For batch files: uses job_id
    """
    if custom_output:
        return custom_output

    ext_map = {
        'txt': 'txt',
        'pdf': 'pdf',
        'md': 'md'
    }
    ext = ext_map.get(format_type, 'txt')

    # Check if this is a job_id (typically alphanumeric) or a title
    # Job IDs are usually simple alphanumeric strings
    if re.match(r'^[a-zA-Z0-9_-]+$', title_or_job_id) and len(title_or_job_id) < 50:
        # Likely a job_id
        return f"batch_{title_or_job_id}.{ext}"
    else:
        # Likely a title, format it
        formatted = re.sub(r'[^a-z0-9]+', '_', title_or_job_id.lower())
        formatted = re.sub(r'^_+|_+$', '', formatted)
        return formatted if formatted else f'transcript.{ext}'


def get_batch_filename(completed_count: int, format_type: str, custom_output: str = None) -> str:
    """
    Generate filename for batch exports

    Uses the new naming convention: batch_{count}_transcripts.{ext}
    """
    if custom_output:
        return custom_output

    ext_map = {
        'txt': 'txt',
        'pdf': 'pdf',
        'md': 'md',
        'zip': 'zip'
    }
    ext = ext_map.get(format_type, 'txt')
    return f"batch_{completed_count}_transcripts.{ext}"


def print_export_summary(results: List[Dict], format_type: str, filename: str):
    """Print summary of export operation"""
    completed = sum(1 for r in results if r['status'] == 'completed')
    failed = sum(1 for r in results if r['status'] == 'failed')

    print(f"\n{'='*60}")
    print(f"Export Summary")
    print(f"{'='*60}")
    print(f"Format: {format_type.upper()}")
    print(f"Output file: {filename}")
    print(f"Total videos: {len(results)}")
    print(f"  ✓ Completed: {completed}")
    print(f"  ✗ Failed: {failed}")
    print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Export batch transcript results (same formats as single transcript)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Plain text (default):
    python scripts/export_batch_transcripts.py --job-id abc123

  Markdown:
    python scripts/export_batch_transcripts.py --job-id abc123 --format md

  PDF:
    python scripts/export_batch_transcripts.py --job-id abc123 --format pdf

  ZIP with individual files:
    python scripts/export_batch_transcripts.py --job-id abc123 --format txt --zip
    python scripts/export_batch_transcripts.py --job-id abc123 --format pdf --zip

  Custom output filename:
    python scripts/export_batch_transcripts.py --job-id abc123 --format pdf --output my_transcripts.pdf

  Verbose mode:
    python scripts/export_batch_transcripts.py --job-id abc123 --format md --verbose
        """
    )

    parser.add_argument("--job-id", required=True, help="Batch job ID")
    parser.add_argument(
        "--format",
        choices=["txt", "pdf", "md"],
        default="txt",
        help="Export format: txt (plain text), pdf (PDF document), md (Markdown)"
    )
    parser.add_argument(
        "--zip",
        action="store_true",
        help="Export as ZIP file with individual transcripts (one file per video)"
    )
    parser.add_argument(
        "--output",
        help="Output file path (optional, default: batch_{count}_transcripts.{ext or zip})"
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Backend API base URL (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose output with detailed progress information"
    )

    args = parser.parse_args()

    try:
        if args.verbose:
            print(f"[*] Connecting to backend: {args.base_url}")
            print(f"[*] Fetching batch results for job: {args.job_id}...")

        results = fetch_batch_results(args.job_id, args.base_url)

        # Count completed vs failed
        completed = sum(1 for r in results if r['status'] == 'completed')
        failed = sum(1 for r in results if r['status'] == 'failed')

        if args.verbose:
            print(f"[+] Found {len(results)} results: {completed} completed, {failed} failed")
        else:
            print(f"Found {len(results)} results: {completed} completed, {failed} failed")

        if completed == 0:
            print("❌ No completed transcripts to export.")
            return

        # Determine output filename and format
        if args.zip:
            # ZIP export uses .zip extension
            output_format = 'zip'
            filename = get_batch_filename(completed, output_format, args.output)
        else:
            # Single file export
            output_format = args.format
            filename = get_batch_filename(completed, output_format, args.output)

        # Export based on format
        if args.zip:
            # ZIP export with individual files
            if args.verbose:
                print(f"[*] Creating ZIP with individual {args.format.upper()} files...")

            export_as_zip(results, args.format, filename)
            print(f"✅ Exported to: {filename}")
            print(f"   Contains {completed} individual {args.format.upper()} files")

        elif args.format == "txt":
            if args.verbose:
                print(f"[*] Exporting as plain text...")
            output = export_as_txt(results)
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(output)
            print(f"✅ Exported to: {filename}")

        elif args.format == "md":
            if args.verbose:
                print(f"[*] Exporting as markdown...")
            output = export_as_markdown(results)
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(output)
            print(f"✅ Exported to: {filename}")

        elif args.format == "pdf":
            if args.verbose:
                print(f"[*] Exporting as PDF...")
            export_as_pdf(results, filename)
            print(f"✅ Exported to: {filename}")

        # Print summary
        if not args.zip:
            print_export_summary(results, output_format, filename)
        else:
            # Custom summary for ZIP exports
            print(f"\n{'='*60}")
            print(f"Export Summary")
            print(f"{'='*60}")
            print(f"Format: ZIP (individual {args.format.upper()} files)")
            print(f"Output file: {filename}")
            print(f"Total videos: {len(results)}")
            print(f"  ✓ Exported: {completed}")
            print(f"  ✗ Failed: {failed}")
            print(f"{'='*60}\n")

    except KeyboardInterrupt:
        print(f"\n❌ Export cancelled by user")
        exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()
