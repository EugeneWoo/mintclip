# Problem Analysis

I've identified the root cause of the issue where toggling to already-generated summary formats shows a blank screen while generation continues.

---

## Root Cause

In `YouTubeSidebar.tsx:1002`, the `summary` prop passed to `SummaryTab` is:

```tsx
summary={summaries[currentFormat]}
```

However, in `SummaryTab.tsx:671`, the display logic is:

```tsx
{summary && !isLoading && (
  <div>
    {/* Summary Display */}
  </div>
)}
```

---

## The Problem

When you toggle formats while generation is in progress:

- `currentFormat` changes to the new format (e.g., "short")
- `summaries[currentFormat]` evaluates to the already-generated summary
- **BUT** `isLoading` is still `true` (because another format, e.g. "topic", is still generating)

### Result

The condition `summary && !isLoading` fails because `isLoading === true`.

➡️ **Blank screen**, even though `summaries["short"]` exists.

---

## Why This Happens

- `isLoading` is a **global state** for any summary generation
- It does **not** track which format is currently generating
- When you switch formats:
  - The component sees the cached summary
  - It also sees `isLoading === true`
  - So it hides the content

---

# Fix Plan

## Option 1: Per-Format Loading State (**Recommended**)

### Change

Track which **specific format** is loading instead of using a global loading state.

### Implementation

```tsx
// YouTubeSidebar.tsx
const [loadingFormat, setLoadingFormat] = useState<SummaryFormat | null>(null);

// In handleGenerateSummary
setLoadingFormat(format);
// ... after generation ...
setLoadingFormat(null);

// Pass to SummaryTab
<SummaryTab
  summary={summaries[currentFormat]}
  isLoading={loadingFormat === currentFormat}  // Only true if THIS format is loading
  currentFormat={currentFormat}
  onFormatChange={setCurrentFormat}
  summaries={summaries}
/>
```

### Benefits

- Clean separation: each format knows if *it* is loading
- Cached summaries display immediately when toggling
- Currently-generating format shows loading state
- No logic changes needed in `SummaryTab`

---

## Option 2: Conditional Display Logic in `SummaryTab`

### Change

Show cached summary even if `isLoading === true`, as long as it exists for the current format.

### Implementation

```tsx
// SummaryTab.tsx

// Show summary if:
// 1. Summary exists for current format, OR
// 2. Loading but we already have a cached version
const shouldShowSummary = summary && (!isLoading || summaries[currentFormat]);

{shouldShowSummary && (
  <div>
    {/* Summary Display */}
  </div>
)}
```

### Benefits

- Minimal changes
- Works with existing loading state

### Drawbacks

- Less clean separation of concerns
- Doesn't prevent the "Generate Summary" button from showing on cached formats

---

# Recommended Solution: **Option 1**

Option 1 is cleaner because:

- Per-format loading state matches the per-format storage pattern already in use
- No ambiguity: each format independently tracks whether it's loading
- Better UX: the "Generate Summary" button won’t appear on already-generated formats
- Future-proof: scales cleanly if parallel generation of multiple formats is added

---

# Implementation Steps

1. **Update `YouTubeSidebar.tsx`**
   - Replace `summaryLoading` with `loadingFormat: SummaryFormat | null`
   - Call `setLoadingFormat(format)` in `handleGenerateSummary`

2. **Update `SummaryTab` props**
   - Pass:
     ```tsx
     isLoading={loadingFormat === currentFormat}
     ```

3. **No changes required in `SummaryTab.tsx`**
   - Existing `isLoading` handling already works correctly

4. *(Optional)* Persist `loadingFormat`
   - Handles edge cases where the user closes the sidebar mid-generation
