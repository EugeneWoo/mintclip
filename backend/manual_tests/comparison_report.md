# A/B Test Results: Embeddings vs BM25

**Test Date**: 2026-01-13 16:26:39

## Executive Summary

- **Total Questions Tested**: 9
- **Embeddings Wins**: 0 (0.0%)
- **BM25 Wins**: 8 (88.9%)
- **Ties**: 1 (11.1%)

## Performance Metrics

### Latency

| Method | Avg Latency | Speedup |
|--------|-------------|---------|
| Embeddings | 2302.6 ms | 1.0x |
| BM25 | 851.0 ms | **2.7x faster** |

### Relevance (Token Overlap Score)

| Method | Avg Overlap | Difference |
|--------|-------------|------------|
| Embeddings | 0.893 | baseline |
| BM25 | 0.893 | **+0.000** |

## Question Type Analysis

| Question Type | Total | Embeddings | BM25 | Ties | BM25 Win Rate |
|----------------|-------|------------|------|------|---------------|
| factual | 4 | 0 | 3 | 1 | 75% |
| conceptual | 1 | 0 | 1 | 0 | 100% |
| exact_phrase | 3 | 0 | 3 | 0 | 100% |
| quote_retrieval | 1 | 0 | 1 | 0 | 100% |

## Detailed Results by Video

### AI PM Tooling
**Video ID**: `Ds7q3vGfyTg`

#### Question: what are the AI PM interview red flags?
**Type**: `factual`

| Metric | Embeddings | BM25 |
|--------|------------|------|
| Latency | 3090 ms | 1137 ms |
| Overlap Score | 1.0 | 1.0 |
| Response Length | 504 chars | 646 chars |

**Winner**: 🏆 **BM25**
**Reasoning**: 1953ms faster with similar relevance

**Embeddings Response**:
> The video transcript mentions a few red flags observed in AI PM interviews. One significant red flag is when candidates with a machine learning science background assume their existing AI expertise is enough for a product management role, without demonstrating a strong grasp of core product manageme...

**BM25 Response**:
> The video transcript highlights a few key red flags for AI PM interviews:

*   **Lack of PM Craft:** Candidates who focus too much on their AI knowledge and neglect the core product management skills, such as understanding users, the "why" behind a product, and defining success metrics, are a red fl...

#### Question: what is the right amount of AI to use for writing PRDs?
**Type**: `conceptual`

| Metric | Embeddings | BM25 |
|--------|------------|------|
| Latency | 2849 ms | 799 ms |
| Overlap Score | 1.0 | 1.0 |
| Response Length | 372 chars | 333 chars |

**Winner**: 🏆 **BM25**
**Reasoning**: 2050ms faster with similar relevance

**Embeddings Response**:
> The video suggests that the "right amount" of AI to use for writing PRDs is a nuanced question. The speaker mentions overtraining an AI to include the most important things and sound like themselves, even uploading their own podcasts for it to learn from. They emphasize that even a poorly generated ...

**BM25 Response**:
> The video suggests that the right amount of AI to use when writing a PRD is to overtrain it to capture the most important things and sound like you. The speaker even uploaded their own podcasts to help the AI generate content in their voice. Even a poorly generated PRD can serve as a great starting ...

#### Question: How is the user using Perplexity?
**Type**: `factual`

| Metric | Embeddings | BM25 |
|--------|------------|------|
| Latency | 1151 ms | 1130 ms |
| Overlap Score | 1.0 | 1.0 |
| Response Length | 192 chars | 252 chars |

**Winner**: 🤝 **TIE**
**Reasoning**: Similar performance

**Embeddings Response**:
> The speaker uses Perplexity to search specifically through Reddit to gain insights from user opinions. This helps them understand what people are likely to find in terms of product-market fit....

**BM25 Response**:
> The user primarily uses Perplexity to get in-depth insights from user discussions on sites like Reddit. They find it particularly useful for understanding what users are saying about products, especially when dealing with a large volume of information....

---

### Graham Norton with Ryan Gosling & Greg Davies
**Video ID**: `yIFXeHMcqS0`

#### Question: how many times was 'fecal jackson pollock' mentioned?
**Type**: `exact_phrase`

| Metric | Embeddings | BM25 |
|--------|------------|------|
| Latency | 1577 ms | 550 ms |
| Overlap Score | 0.75 | 0.75 |
| Response Length | 41 chars | 135 chars |

**Winner**: 🏆 **BM25**
**Reasoning**: 1027ms faster with similar relevance

**Embeddings Response**:
> This topic is not discussed in the video....

**BM25 Response**:
> The phrase "fecal Jackson Pollock" is mentioned once in the video transcript. It's used to describe the mess the dog made in the house....

#### Question: What did the BBC disability officer say to Greg?
**Type**: `quote_retrieval`

| Metric | Embeddings | BM25 |
|--------|------------|------|
| Latency | 1942 ms | 1086 ms |
| Overlap Score | 0.8888888888888888 | 0.8888888888888888 |
| Response Length | 191 chars | 149 chars |

**Winner**: 🏆 **BM25**
**Reasoning**: 856ms faster with similar relevance

**Embeddings Response**:
> The BBC disability officer told Greg that he qualified for something, and it was a "hype thing." This was said at a BBC party where Greg and the speaker were chatting and sharing wine straws....

**BM25 Response**:
> The BBC disability officer told Greg that he qualified as disabled. This was in the context of a BBC party where they were chatting and sharing wine....

#### Question: Tell me about the mother's knickers story.
**Type**: `exact_phrase`

| Metric | Embeddings | BM25 |
|--------|------------|------|
| Latency | 1881 ms | 842 ms |
| Overlap Score | 1.0 | 1.0 |
| Response Length | 311 chars | 337 chars |

**Winner**: 🏆 **BM25**
**Reasoning**: 1039ms faster with similar relevance

**Embeddings Response**:
> The speaker recounts a time when he was teaching and went home to visit his mother. While there, his mother did his laundry. He then went back to school after a night of drinking and eating curry, and discovered he was wearing his mother's underwear. He felt this was a "low point" and called himself...

**BM25 Response**:
> The speaker recounts an embarrassing moment at school when they discovered they were wearing their mother's underwear. This happened after a night of curry and drinking, and they felt a strong sense of shame and self-deprecation about the situation. The incident was compounded when a hearing-impaire...

---

### Served podcast with Tony Godsick
**Video ID**: `c-soib0apA4`

#### Question: what was Federer's personality Behind-the-scenes?
**Type**: `exact_phrase`

| Metric | Embeddings | BM25 |
|--------|------------|------|
| Latency | 2814 ms | 688 ms |
| Overlap Score | 0.6 | 0.6 |
| Response Length | 336 chars | 41 chars |

**Winner**: 🏆 **BM25**
**Reasoning**: 2126ms faster with similar relevance

**Embeddings Response**:
> Behind the scenes, Roger Federer was a genuinely nice person who enjoyed interacting with people. He was curious about different cultures and asked a lot of questions, finding enjoyment wherever he went. The speaker also confirms that Federer was in the finals of every Grand Slam for the first four ...

**BM25 Response**:
> This topic is not discussed in the video....

#### Question: How did the Uniqlo deal happen?
**Type**: `factual`

| Metric | Embeddings | BM25 |
|--------|------------|------|
| Latency | 2932 ms | 438 ms |
| Overlap Score | 1.0 | 1.0 |
| Response Length | 305 chars | 41 chars |

**Winner**: 🏆 **BM25**
**Reasoning**: 2494ms faster with similar relevance

**Embeddings Response**:
> The Uniqlo deal happened because Roger Federer didn't have a shoe deal and was going to sign with Uniqlo. The speaker suggested doing something different where Roger could grow with the company, focusing on lifestyle and tennis shoes. This was around the time COVID started, allowing for shoe develop...

**BM25 Response**:
> This topic is not discussed in the video....

#### Question: how did the speaker get to meet with mr. yanai?
**Type**: `factual`

| Metric | Embeddings | BM25 |
|--------|------------|------|
| Latency | 2487 ms | 989 ms |
| Overlap Score | 0.8 | 0.8 |
| Response Length | 203 chars | 232 chars |

**Winner**: 🏆 **BM25**
**Reasoning**: 1498ms faster with similar relevance

**Embeddings Response**:
> The speaker got a meeting with Mr. Yanai through Anna Wintour. Anna sent a note on the speaker's behalf, and about 12 hours later, Mr. Yanai's assistant responded, arranging a 30-minute meeting in Japan....

**BM25 Response**:
> The speaker got to meet with Mr. Yanai after Anna Wintour sent a note on his behalf. Within about 12 hours, the speaker received a message from Mr. Yanai's assistant inviting him to Japan for a 30-minute meeting about Roger Federer....

---

## Recommendation

**INCONCLUSIVE - CONSIDER HYBRID**

• BM25: 89% win rate, 2.7x faster
• Embeddings: 0% win rate, better semantic understanding
• Consider implementing hybrid retrieval for best of both

---

*Report generated by compare_retrieval_results.py*