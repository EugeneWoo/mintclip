#!/usr/bin/env python3
"""
Comparison Report Generator: Embeddings vs BM25

Generates a detailed markdown report comparing A/B test results.
"""

import sys
import os
import json
import argparse
from typing import Dict, Any, List


def load_results(input_file: str) -> Dict[str, Any]:
    """Load A/B test results from JSON file"""
    with open(input_file, "r") as f:
        return json.load(f)


def calculate_aggregate_metrics(results: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate aggregate metrics across all tests"""

    total_questions = 0
    embeddings_wins = 0
    bm25_wins = 0
    ties = 0
    failures = 0

    embeddings_latencies = []
    bm25_latencies = []
    embeddings_overlaps = []
    bm25_overlaps = []

    question_type_stats = {}

    for video in results.get("videos", []):
        for question in video.get("questions", []):
            total_questions += 1
            q_type = question.get("question_type", "unknown")

            # Initialize question type stats if needed
            if q_type not in question_type_stats:
                question_type_stats[q_type] = {
                    "total": 0,
                    "embeddings_wins": 0,
                    "bm25_wins": 0,
                    "ties": 0
                }

            question_type_stats[q_type]["total"] += 1

            # Get results
            emb_result = question.get("embeddings", {})
            bm25_result = question.get("bm25", {})
            winner = question.get("winner", "unknown")

            # Track wins
            if winner == "embeddings":
                embeddings_wins += 1
                question_type_stats[q_type]["embeddings_wins"] += 1
            elif winner == "bm25":
                bm25_wins += 1
                question_type_stats[q_type]["bm25_wins"] += 1
            elif winner == "tie":
                ties += 1
                question_type_stats[q_type]["ties"] += 1
            else:
                failures += 1

            # Collect metrics
            if emb_result.get("success"):
                embeddings_latencies.append(emb_result.get("latency_ms", 0))
                embeddings_overlaps.append(emb_result.get("overlap_score", 0))

            if bm25_result.get("success"):
                bm25_latencies.append(bm25_result.get("latency_ms", 0))
                bm25_overlaps.append(bm25_result.get("overlap_score", 0))

    # Calculate averages
    avg_emb_latency = sum(embeddings_latencies) / len(embeddings_latencies) if embeddings_latencies else 0
    avg_bm25_latency = sum(bm25_latencies) / len(bm25_latencies) if bm25_latencies else 0
    avg_emb_overlap = sum(embeddings_overlaps) / len(embeddings_overlaps) if embeddings_overlaps else 0
    avg_bm25_overlap = sum(bm25_overlaps) / len(bm25_overlaps) if bm25_overlaps else 0

    return {
        "total_questions": total_questions,
        "embeddings_wins": embeddings_wins,
        "bm25_wins": bm25_wins,
        "ties": ties,
        "failures": failures,
        "avg_embeddings_latency_ms": round(avg_emb_latency, 1),
        "avg_bm25_latency_ms": round(avg_bm25_latency, 1),
        "latency_speedup": round(avg_emb_latency / avg_bm25_latency, 1) if avg_bm25_latency > 0 else 0,
        "avg_embeddings_overlap": round(avg_emb_overlap, 3),
        "avg_bm25_overlap": round(avg_bm25_overlap, 3),
        "question_type_stats": question_type_stats
    }


def generate_markdown_report(results: Dict[str, Any], output_file: str):
    """Generate detailed markdown report"""

    metrics = calculate_aggregate_metrics(results)

    report = []
    report.append("# A/B Test Results: Embeddings vs BM25")
    report.append("")
    report.append(f"**Test Date**: {results.get('test_date', 'Unknown')}")
    report.append("")

    # Executive Summary
    report.append("## Executive Summary")
    report.append("")
    report.append(f"- **Total Questions Tested**: {metrics['total_questions']}")
    report.append(f"- **Embeddings Wins**: {metrics['embeddings_wins']} ({metrics['embeddings_wins']/metrics['total_questions']*100:.1f}%)")
    report.append(f"- **BM25 Wins**: {metrics['bm25_wins']} ({metrics['bm25_wins']/metrics['total_questions']*100:.1f}%)")
    report.append(f"- **Ties**: {metrics['ties']} ({metrics['ties']/metrics['total_questions']*100:.1f}%)")
    report.append("")

    # Performance Metrics
    report.append("## Performance Metrics")
    report.append("")
    report.append("### Latency")
    report.append("")
    report.append("| Method | Avg Latency | Speedup |")
    report.append("|--------|-------------|---------|")
    report.append(f"| Embeddings | {metrics['avg_embeddings_latency_ms']} ms | 1.0x |")
    report.append(f"| BM25 | {metrics['avg_bm25_latency_ms']} ms | **{metrics['latency_speedup']}x faster** |")
    report.append("")

    # Relevance (Overlap Score)
    report.append("### Relevance (Token Overlap Score)")
    report.append("")
    report.append("| Method | Avg Overlap | Difference |")
    report.append("|--------|-------------|------------|")
    overlap_diff = metrics['avg_bm25_overlap'] - metrics['avg_embeddings_overlap']
    diff_str = f"+{overlap_diff:.3f}" if overlap_diff >= 0 else f"{overlap_diff:.3f}"
    report.append(f"| Embeddings | {metrics['avg_embeddings_overlap']:.3f} | baseline |")
    report.append(f"| BM25 | {metrics['avg_bm25_overlap']:.3f} | **{diff_str}** |")
    report.append("")

    # Question Type Breakdown
    report.append("## Question Type Analysis")
    report.append("")
    report.append("| Question Type | Total | Embeddings | BM25 | Ties | BM25 Win Rate |")
    report.append("|----------------|-------|------------|------|------|---------------|")

    for q_type, stats in metrics['question_type_stats'].items():
        total = stats['total']
        emb_wins = stats['embeddings_wins']
        bm25_wins = stats['bm25_wins']
        ties_count = stats['ties']
        bm25_rate = (bm25_wins / total * 100) if total > 0 else 0
        report.append(f"| {q_type} | {total} | {emb_wins} | {bm25_wins} | {ties_count} | {bm25_rate:.0f}% |")

    report.append("")

    # Detailed Results by Video
    report.append("## Detailed Results by Video")
    report.append("")

    for video in results.get("videos", []):
        report.append(f"### {video['title']}")
        report.append(f"**Video ID**: `{video['video_id']}`")
        report.append("")

        for question in video.get("questions", []):
            report.append(f"#### Question: {question['question']}")
            report.append(f"**Type**: `{question['question_type']}`")
            report.append("")

            emb = question.get("embeddings", {})
            bm25 = question.get("bm25", {})

            # Metrics table
            report.append("| Metric | Embeddings | BM25 |")
            report.append("|--------|------------|------|")

            # Latency
            emb_lat = emb.get("latency_ms", "N/A")
            bm25_lat = bm25.get("latency_ms", "N/A")
            report.append(f"| Latency | {emb_lat} ms | {bm25_lat} ms |")

            # Overlap
            emb_overlap = emb.get("overlap_score", "N/A")
            bm25_overlap = bm25.get("overlap_score", "N/A")
            report.append(f"| Overlap Score | {emb_overlap} | {bm25_overlap} |")

            # Response length
            emb_len = emb.get("response_length", "N/A")
            bm25_len = bm25.get("response_length", "N/A")
            report.append(f"| Response Length | {emb_len} chars | {bm25_len} chars |")

            report.append("")

            # Winner
            winner = question.get("winner", "unknown")
            reasoning = question.get("reasoning", "N/A")
            winner_emoji = "🏆" if winner != "tie" else "🤝"
            report.append(f"**Winner**: {winner_emoji} **{winner.upper()}**")
            report.append(f"**Reasoning**: {reasoning}")
            report.append("")

            # Sample responses (for comparison)
            if emb.get("success") and bm25.get("success"):
                report.append("**Embeddings Response**:")
                report.append(f"> {emb.get('response', 'No response')[:300]}...")
                report.append("")
                report.append("**BM25 Response**:")
                report.append(f"> {bm25.get('response', 'No response')[:300]}...")
                report.append("")

        report.append("---")
        report.append("")

    # Recommendation
    report.append("## Recommendation")
    report.append("")

    # Calculate recommendation
    bm25_win_rate = metrics['bm25_wins'] / metrics['total_questions']
    latency_improvement = metrics['latency_speedup']
    relevance_diff = metrics['avg_bm25_overlap'] - metrics['avg_embeddings_overlap']

    if bm25_win_rate > 0.6 and latency_improvement > 5:
        recommendation = "**SWITCH TO BM25**"
        reasoning = [
            f"• BM25 wins {bm25_win_rate*100:.0f}% of tests",
            f"• {latency_improvement}x faster latency",
            f"• Comparable or better relevance ({relevance_diff:+.3f} overlap diff)",
            "• Simpler architecture, no external dependencies"
        ]
    elif bm25_win_rate > 0.4 and latency_improvement > 10 and relevance_diff > -0.1:
        recommendation = "**SWITCH TO BM25**"
        reasoning = [
            f"• Significant latency improvement ({latency_improvement}x faster)",
            f"• Competitive win rate ({bm25_win_rate*100:.0f}%)",
            f"• Minimal relevance difference"
        ]
    elif metrics['embeddings_wins'] / metrics['total_questions'] > 0.6:
        recommendation = "**KEEP EMBEDDINGS**"
        reasoning = [
            f"• Embeddings win {metrics['embeddings_wins']/metrics['total_questions']*100:.0f}% of tests",
            f"• Better relevance ({relevance_diff:+.3f} overlap diff)",
            "• Semantic understanding provides better answers"
        ]
    else:
        recommendation = "**INCONCLUSIVE - CONSIDER HYBRID**"
        reasoning = [
            f"• BM25: {bm25_win_rate*100:.0f}% win rate, {latency_improvement}x faster",
            f"• Embeddings: {metrics['embeddings_wins']/metrics['total_questions']*100:.0f}% win rate, better semantic understanding",
            "• Consider implementing hybrid retrieval for best of both"
        ]

    report.append(recommendation)
    report.append("")
    for reason in reasoning:
        report.append(reason)
    report.append("")

    report.append("---")
    report.append("")
    report.append("*Report generated by compare_retrieval_results.py*")

    # Write to file
    with open(output_file, "w") as f:
        f.write("\n".join(report))

    print(f"✓ Report saved to {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Generate A/B test comparison report")
    parser.add_argument("--input", default="ab_test_results.json", help="Input JSON file with test results")
    parser.add_argument("--output", default="comparison_report.md", help="Output markdown report file")
    args = parser.parse_args()

    print(f"Loading results from {args.input}...")
    results = load_results(args.input)

    print("Generating report...")
    generate_markdown_report(results, args.output)

    print(f"\n✓ Done! Report saved to {args.output}")
    print(f"  View: cat {args.output}")


if __name__ == "__main__":
    main()
