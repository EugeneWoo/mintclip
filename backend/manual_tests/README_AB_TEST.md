# A/B Test: Embeddings vs BM25 for Chat Retrieval

This test compares Pinecone embeddings (semantic search) against BM25 lexical matching for retrieving relevant transcript chunks in the chat feature.

## Files Created

### Services
- `backend/app/services/bm25_retrieval.py` - BM25 retrieval service
- `backend/app/services/gemini_client_bm25.py` - Gemini client using BM25 (A/B variant)

### Scripts
- `backend/scripts/ab_test_retrieval.py` - Runs A/B test on 3 videos
- `backend/scripts/compare_retrieval_results.py` - Generates comparison report

### Configuration
- `backend/requirements.txt` - Added `rank-bm25>=0.2.2`

## Setup

### 1. Install Dependencies
```bash
cd backend
pip install rank-bm25
```

### 2. Set Environment Variables
Ensure `.env` contains:
```bash
GEMINI_API_KEY=your_key_here
PINECONE_API_KEY=your_key_here  # Needed for control group
```

## Running the A/B Test

### Step 1: Run A/B Test
```bash
cd backend
python scripts/ab_test_retrieval.py
```

This will:
- Fetch transcripts for 3 test videos
- Test each question with BOTH embeddings and BM25
- Collect metrics: latency, relevance (token overlap), response quality
- Save results to `ab_test_results.json`

**Estimated time**: 5-10 minutes (depends on API latency)

### Step 2: Generate Comparison Report
```bash
python scripts/compare_retrieval_results.py
```

This generates `comparison_report.md` with:
- Executive summary (win rates, avg latency)
- Performance metrics table
- Question type breakdown
- Detailed per-question comparison
- Recommendation

## Test Cases

### Test 1: AI PM Interview (Ds7q3vGfyTg)
- Q1: "what are the AI PM interview red flags?" *(conceptual)*
- Q2: "what is the right amount of AI to use for writing PRDs?" *(conceptual)*
- Q3: "How is the user using Perplexity?" *(factual)*

### Test 2: Fecal Jackson Pollock (yIFXeHMcqS0)
- Q1: "how many times was 'fecal jackson pollock' mentioned?" *(exact phrase)*
- Q2: "What did the BBC disability officer say to Greg?" *(quote retrieval)*
- Q3: "Tell me about the mother's knickers story." *(narrative)*

### Test 3: Roger Federer (c-soib0apA4)
- Q1: "what was Federer's personality Behind-the-scenes?" *(conceptual)*
- Q2: "How did the Uniqlo deal happen?" *(factual/narrative)*
- Q3: "how did the speaker get to meet with mr. yanai?" *(factual)*

## Metrics Collected

### 1. Latency
- **Retrieval time**: How fast chunks are retrieved
- **Total time**: Including LLM response generation
- **Expected**: BM25 10-30x faster (no API calls)

### 2. Relevance (Token Overlap)
- Measures how many question tokens appear in retrieved chunks
- Higher = better (0.0 to 1.0)
- Proxy for answer presence

### 3. Question Type Classification
- `exact_phrase`: Quotes or specific mentions (BM25 favored)
- `quote_retrieval`: Conversational quotes (BM25 favored)
- `conceptual`: Abstract concepts (embeddings favored)
- `factual`: Specific events/facts (tie)

### 4. Response Quality
- Response length
- Manual verification of answer presence
- Qualitative comparison

## Decision Criteria

### Switch to BM25 if:
- Win rate > 60% OR
- Win rate > 40% AND 10x faster AND comparable relevance

### Keep Embeddings if:
- Win rate > 60% for embeddings
- Significantly better relevance (>20% improvement)

### Consider Hybrid if:
- Inconclusive results
- Both methods show strengths in different scenarios

## Output Files

### ab_test_results.json
Raw test data including:
- Latency for each method
- Overlap scores
- Full responses
- Winner determination

### comparison_report.md
Human-readable report with:
- Summary tables
- Performance comparison
- Recommendation

## Next Steps (After Test)

### If BM25 Wins:
1. Replace `pinecone_embeddings` with `bm25_retrieval` in `gemini_client.py`
2. Remove `pinecone` from requirements.txt
3. Remove `PINECONE_API_KEY` from .env
4. Delete test files (bm25_retrieval.py, gemini_client_bm25.py, scripts/)

### If Embeddings Win:
1. Delete test files
2. Document why embeddings are preferred

### If Hybrid:
1. Implement ensemble retrieval
2. Weight scores: 0.5 * bm25 + 0.5 * embeddings
3. Test hybrid vs individual methods

## Notes

- **No existing code was modified** - all new files
- Original embeddings system continues to work
- Test uses same Gemini model, prompts, temperature for fair comparison
- Only difference is retrieval method (embeddings vs BM25)
