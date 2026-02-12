# Frontend Design Documentation

This document outlines the design system, style elements, and component patterns used in Mintclip's web application interface.

## Overview

Mintclip features two distinct design themes:
1. **Landing Page (CreatorFlow-inspired Dark Theme)** - Modern, dark-themed marketing site
2. **Dashboard (Warm Light Theme)** - Minimal, editorial-inspired application interface

---

## 1. Landing Page Design (`landing-page-framer.html`)

### Design Philosophy
Inspired by CreatorFlow's modern agency aesthetic, adapted for Mintclip's YouTube knowledge extraction product with a dark, sophisticated theme.

### Color System

#### Primary Colors
```css
--bg-dark: #171717;        /* Primary background */
--bg-elevated: #1f1f1f;    /* Elevated surface (sections) */
--bg-card: #262626;        /* Card backgrounds */
```

#### Accent Colors
```css
--accent: #22c55e;         /* Primary green (replaces CreatorFlow orange) */
--accent-light: #4ade80;   /* Hover state */
--accent-glow: rgba(34, 197, 94, 0.15);  /* Glow effects */
--accent-hover: #16a34a;   /* Active state */
```

#### Text Colors
```css
--text-primary: #ffffff;   /* Headings, important text */
--text-secondary: #a3a3a3; /* Body text, descriptions */
--text-muted: #737373;     /* Labels, metadata */
```

#### Border Colors
```css
--border: rgba(255, 255, 255, 0.08);     /* Standard borders */
--border-accent: rgba(34, 197, 94, 0.3); /* Hover/focus borders */
```

### Typography

#### Font Families
```css
/* Headings - Bold, modern sans-serif */
font-family: 'Plus Jakarta Sans', sans-serif;

/* Body - Clean, readable sans-serif */
font-family: 'Inter', sans-serif;
```

#### Type Scale
```css
/* Hero Heading */
font-size: clamp(3rem, 8vw, 5.5rem);
font-weight: 800;
line-height: 1.05;
letter-spacing: -0.04em;

/* Section Titles */
font-size: clamp(2.5rem, 5vw, 3.5rem);
font-weight: 800;
letter-spacing: -0.03em;

/* Card Headings */
font-size: 1.25rem;
font-weight: 700;
letter-spacing: -0.01em;

/* Body Text */
font-size: 1rem;
font-weight: 400;
line-height: 1.6;

/* Small Text / Labels */
font-size: 0.875rem;
font-weight: 500;
```

### Layout Components

#### 1. Navigation
- **Position**: Fixed top, glassmorphism effect
- **Container**: Max-width 1200px, pill-shaped (border-radius: 100px)
- **Background**: `rgba(23, 23, 23, 0.8)` with `backdrop-filter: blur(20px)`
- **Logo Size**: 40px × 40px (increased from 28px)
- **Logo Text**: 1.5rem, weight 800

#### 2. Hero Section
- **Min Height**: 100vh
- **Layout**: Flexbox, centered
- **Elements**:
  - Badge: Small pill with green accent text
  - Heading: Large display type with green highlight
  - Description: Max-width 600px, secondary color
  - CTA Buttons: Primary (green) + Secondary (outline)
  - Stats: 3 metrics with green accent numbers

**Animations**:
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(32px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
- Staggered delays: 0s, 0.1s, 0.2s, 0.3s, 0.4s

#### 3. Trusted By Marquee
- **Border**: Top and bottom 1px solid border
- **Animation**: Infinite horizontal scroll (30s duration)
- **Items**: Large text, semi-transparent, duplicated for seamless loop

#### 4. Services Grid
- **Layout**: 3 columns (responsive: 2 cols tablet, 1 col mobile)
- **Gap**: 1.5rem
- **Card Style**:
  - Background: `var(--bg-elevated)`
  - Border: 1px with hover state → green accent border
  - Border-radius: 24px
  - Padding: 2.5rem
  - Hover: `translateY(-4px)` + top gradient line reveal

**Service Card Structure**:
```
┌─────────────────────┐
│ 🎯 Icon (56×56px)  │
│ Heading             │
│ Description         │
└─────────────────────┘
```

#### 5. How It Works Section
- **Background**: `var(--bg-elevated)` (alternating pattern)
- **Layout**: 2×2 grid
- **Step Cards**:
  - Number badge: Green background, black text, 56×56px
  - Horizontal layout with content area
  - Dark background on elevated section

#### 6. Works/Portfolio Grid
- **Layout**: 3 columns grid
- **Card Structure**:
  - Thumbnail: 16:9 aspect ratio, emoji placeholder
  - Info section: Title + metadata
  - Hover: Lift effect + green border

#### 7. Pricing Section
- **Layout**: 3 cards (Free, Pro, Team)
- **Featured Card**:
  - Border: Green accent
  - Badge: "Most Popular" pill on top
- **Card Elements**:
  - Header with dashed border separator
  - Large price (3rem, green)
  - Features list with checkmarks
  - Full-width CTA button

#### 8. FAQ Section
- **Layout**: Single column, max-width 900px
- **Interaction**: Accordion with + icon rotation
- **Styling**:
  - Question: Bold, left-aligned
  - Answer: Hidden by default, slides down
  - Icon: Rotates 45° when active

#### 9. CTA Section
- **Background**: Elevated with radial gradient glow
- **Effect**: 800×800px green glow behind content
- **Layout**: Centered, max-width 700px

#### 10. Footer
- **Layout**: Two-tier structure
  - Top: Brand + 3 link columns
  - Bottom: Copyright + legal links
- **Spacing**: 5rem top, 2rem bottom padding

### Button Styles

#### Primary Button
```css
background: var(--accent);    /* Green */
color: #000;                  /* Black text */
padding: 0.875rem 1.75rem;
border-radius: 100px;
font-weight: 600;

/* Hover */
background: var(--accent-light);
transform: scale(1.02);
box-shadow: 0 0 40px var(--accent-glow);
```

#### Secondary Button
```css
background: transparent;
color: var(--text-primary);
border: 1px solid var(--border);

/* Hover */
background: var(--bg-card);
border-color: var(--border-accent);
```

### Responsive Breakpoints
```css
@media (max-width: 1024px) {
  /* 2-column grids */
  .services-grid,
  .pricing-grid,
  .works-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  /* Single column, hide nav links, smaller logo */
  .services-grid,
  .pricing-grid,
  .works-grid {
    grid-template-columns: 1fr;
  }

  .logo {
    font-size: 1.25rem;
  }

  .logo-mark {
    width: 32px;
    height: 32px;
  }
}
```

---

## 2. Dashboard Design (`dashboard-framer.html`)

### Design Philosophy
Continues the dark theme from the landing page with application-focused refinements for the authenticated experience.

### Color System
Identical to landing page (dark theme consistency):
```css
--bg-dark: #171717;
--bg-elevated: #1f1f1f;
--bg-card: #262626;
--accent: #22c55e;
--text-primary: #ffffff;
--text-secondary: #a3a3a3;
--text-muted: #737373;
```

### Typography
Same as landing page:
- **Plus Jakarta Sans**: Headings
- **Inter**: Body and UI text

### Navigation Differences
- **Container**: Max-width 1400px (wider for dashboard)
- **Active State**: Green pill background with black text
- **Account Dropdown**: Enhanced with user profile section

#### Account Dropdown Structure
```
┌──────────────────────────┐
│ Profile Header           │
│ • Name (Plus Jakarta)    │
│ • Email (muted)          │
├──────────────────────────┤
│ Account Section          │
│ • Dashboard              │
│ • Settings               │
│ • Billing                │
├──────────────────────────┤
│ Support Section          │
│ • Help Center            │
│ • Contact                │
├──────────────────────────┤
│ Sign Out (danger color)  │
└──────────────────────────┘
```

**Dropdown Styling**:
```css
background: var(--bg-elevated);
border: 1px solid var(--border);
border-radius: 16px;
box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
min-width: 280px;
```

### Main Content Area
```css
main {
  flex: 1;
  max-width: 1400px;
  padding: 7rem 2rem 2rem;  /* Top padding accounts for fixed nav */
}
```

### Page Header
```css
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2.5rem;
}

.page-header h1 {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}
```

### Dashboard-Specific Components

#### 1. Input URL Section

**Tabbed Interface**:
- Two tabs: "Single URL" (default) and "Batch (up to 5)"
- Smooth transition between input modes
- Tab styling matches dark theme design

**Single URL Input**:
```
┌─────────────────────────────────────────────┐
│ [Paste URL...]                    [Extract] │
└─────────────────────────────────────────────┘
```

**Batch URL Input** (Smart Dual-Format Parsing):
```
┌─────────────────────────────────────────────┐
│ Paste YouTube URLs (one per line, or        │
│ separated by commas)                        │
│                                             │
│ https://youtube.com/watch?v=abc123          │
│ https://youtube.com/watch?v=def456          │
│ https://youtube.com/watch?v=ghi789          │
│                                             │
│ Or: url1, url2, url3                        │
├─────────────────────────────────────────────┤
│ 3 / 5 URLs          One per line, or        │
│                     comma-separated          │
│                                  [Process Batch] │
└─────────────────────────────────────────────┘
```

**Batch URL Input Features**:
- **Textarea**: Growable input with min-height 120px
- **Smart parsing**: Accepts both line-by-line AND comma/semicolon separation
- **Real-time counter**: Shows "X / 5 URLs" with color coding
  - Normal: Green (under limit)
  - Warning: Orange (at limit)
  - Error: Red (exceeds limit)
- **Format hint**: "One per line, or comma-separated" helper text
- **Placeholder examples**: Shows both formats for clarity

**Parsing Logic**:
```javascript
// Smart dual-format parsing
function parseURLs(input) {
  // Try line-by-line first
  let urls = input.split(/[\n\r]+/);

  // Fallback to comma/semicolon if single line
  if (urls.length === 1) {
    urls = input.split(/[,\s;]+/);
  }

  // Filter, trim, validate
  return urls
    .map(url => url.trim())
    .filter(url => url.length > 0)
    .filter(url => isValidYouTubeURL(url))
    .slice(0, 5); // Enforce limit
}
```

**Styling**:
```css
.url-textarea {
  min-height: 120px;
  resize: vertical;
  line-height: 1.6;
  font-family: 'Inter', sans-serif;
}

.url-count {
  color: var(--text-muted);  /* Default */
}

.url-count.warning {
  color: #f59e0b;  /* At limit */
}

.url-count.error {
  color: #ef4444;  /* Over limit */
}
```

#### 2. Video Cards

**Single Video Card**:
```
┌─────────────────────────────┐
│ 📹 Thumbnail (16:9)         │
├─────────────────────────────┤
│ Video Title                 │
│ Channel • Views • Date      │
│ [Transcript] [Summary] [⋮]  │
└─────────────────────────────┘
```

**Batch Video Card** (4+ videos):
```
┌─────────────────────────────┐
│ ┌────┐ ┌────┐               │
│ │📹1 │ │📹2 │  2x2 Grid     │
│ ├────┤ ├────┤               │
│ │📹3 │ │📹4 │               │
│ └────┘ └────┘               │
│     [Batch: 6 videos]       │
├─────────────────────────────┤
│ First Video Title           │
│ (multiple videos)           │
│ Mixed • Date                │
│ [View All] [Export Batch]   │
└─────────────────────────────┘
```

**Batch Video Card** (1-3 videos):
```
┌─────────────────────────────┐
│ 📹 First Video Thumbnail    │
│     [Batch: 3 videos]       │
├─────────────────────────────┤
│ First Video Title           │
│ (multiple videos)           │
│ Mixed • Date                │
│ [View All] [Export Batch]   │
└─────────────────────────────┘
```

**Batch Card Naming Convention**:
- Title: `{First Video Title} (multiple videos)`
- Uses the first video's title followed by " (multiple videos)" suffix
- Channel: Always displays "Mixed" for batch video cards
- Actions: "View All" and "Export Batch" buttons

**Batch Thumbnail Strategy**:
- **4 or more videos**: 2×2 grid collage showing first 4 video thumbnails
- **1-3 videos**: First video thumbnail with "Batch: X videos" badge overlay
- **Badge styling**: Semi-transparent overlay in top-left or centered badge
- **Fallback**: If no thumbnails available, use grid icon (⊞) with video count

**Card Styling**:
```css
background: var(--bg-elevated);
border: 1px solid var(--border);
border-radius: 16px;
transition: all 0.2s;

/* Hover */
border-color: var(--border-accent);
transform: translateY(-2px);
```

**Batch Badge Styling**:
```css
.batch-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  color: var(--accent);
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

**2×2 Grid Collage Styling** (for 4+ videos):
```css
.batch-thumbnail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
  width: 100%;
  height: 100%;
  background: var(--bg-card);
}

.batch-thumbnail-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

#### 3. Empty State
- Centered layout
- Large emoji icon (4rem)
- Muted text with CTA link

#### 4. Badge Components
```css
/* Status Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Success variant */
.badge-success {
  background: var(--accent-glow);
  color: var(--accent-light);
}
```

---

## 3. Alternative Design (`dashboard.html`)

### Design Philosophy
A warm, editorial-inspired light theme with paper-like aesthetics (original design, kept for reference).

### Color System
```css
--ink: #0a0a0a;           /* Deep black text */
--paper: #faf9f7;         /* Off-white background */
--cream: #f5f3ef;         /* Subtle highlight */
--sage: #4a6741;          /* Primary green */
--sage-light: #e8ede6;    /* Light green tint */
--terracotta: #c45d3a;    /* Accent red */
--slate: #5c5c5c;         /* Medium gray */
--mist: #94918b;          /* Light gray */
```

### Typography
```css
/* Serif - Editorial feel */
font-family: 'Instrument Serif', serif;  /* Logo, headings */

/* Sans-serif - Modern, clean */
font-family: 'DM Sans', sans-serif;      /* Body, UI */

/* Monospace - Code, technical */
font-family: 'JetBrains Mono', monospace; /* Video IDs, data */
```

### Unique Features

#### Paper Grain Texture
```css
body::before {
  content: '';
  position: fixed;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,...");
  /* SVG noise filter for paper texture */
}
```

#### Navigation
- **Position**: Sticky (not fixed)
- **Background**: White with subtle border
- **Logo**: Serif font, smaller (28px icon)

#### Card Shadows
```css
box-shadow:
  0 1px 3px rgba(10, 10, 10, 0.08),
  0 8px 24px rgba(10, 10, 10, 0.04);
```

---

## 4. Design Patterns & Best Practices

### Spacing System
```
0.25rem = 4px   (xs)
0.5rem  = 8px   (sm)
0.75rem = 12px  (md)
1rem    = 16px  (base)
1.25rem = 20px  (lg)
1.5rem  = 24px  (xl)
2rem    = 32px  (2xl)
2.5rem  = 40px  (3xl)
3rem    = 48px  (4xl)
```

### Border Radius Scale
```
6px   = Small elements (badges, inputs)
8px   = Small components
12px  = Medium components
16px  = Large components, cards
24px  = Feature cards
100px = Pills, buttons
```

### Transition Standards
```css
/* Fast interactions */
transition: all 0.15s;

/* Standard interactions */
transition: all 0.2s;

/* Smooth animations */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Hover States
1. **Cards**: Lift effect + border color change
   ```css
   transform: translateY(-4px);
   border-color: var(--border-accent);
   ```

2. **Buttons**: Scale + glow effect
   ```css
   transform: scale(1.02);
   box-shadow: 0 0 40px var(--accent-glow);
   ```

3. **Links**: Background color + text color
   ```css
   background: var(--bg-card);
   color: var(--text-primary);
   ```

### Focus States
All interactive elements should have:
```css
outline: 2px solid var(--accent);
outline-offset: 2px;
```

### Loading States
Use skeleton screens matching component structure with:
```css
background: linear-gradient(
  90deg,
  var(--bg-card) 0%,
  var(--bg-elevated) 50%,
  var(--bg-card) 100%
);
animation: shimmer 1.5s infinite;
```

---

## 5. Component Library

### Buttons
```html
<!-- Primary Button -->
<button class="btn btn-primary">
  Get Started
</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">
  Learn More
</button>

<!-- Icon Button -->
<button class="btn btn-icon">
  <span class="icon">⋮</span>
</button>
```

### Cards
```html
<!-- Service Card -->
<div class="service-card">
  <div class="service-icon">🎯</div>
  <h3>Feature Name</h3>
  <p>Description text goes here.</p>
</div>

<!-- Video Card -->
<div class="video-card">
  <div class="thumbnail">...</div>
  <div class="video-info">
    <h4>Video Title</h4>
    <p class="metadata">Channel • Views • Date</p>
    <div class="actions">...</div>
  </div>
</div>
```

### Badges
```html
<!-- Status Badge -->
<span class="badge badge-success">Completed</span>
<span class="badge badge-warning">Processing</span>
<span class="badge badge-error">Failed</span>
```

### Dropdowns
```html
<div class="account-dropdown">
  <button class="account-trigger">
    <div class="avatar">EU</div>
    <span class="account-name">Eugene</span>
    <span class="dropdown-arrow">▼</span>
  </button>
  <div class="dropdown-menu">
    <div class="dropdown-header">...</div>
    <div class="dropdown-section">...</div>
  </div>
</div>
```

---

## 6. Accessibility

### Color Contrast
- **Text on dark backgrounds**: Minimum 7:1 ratio (AAA)
- **Text on light backgrounds**: Minimum 4.5:1 ratio (AA)
- **Green accent on black**: Meets WCAG AA standards

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order follows visual hierarchy
- Focus indicators are clearly visible

### Screen Readers
- Semantic HTML structure
- ARIA labels on icon-only buttons
- Alt text on all images
- Skip to content link

### Motion
- Respects `prefers-reduced-motion`
- Animations can be disabled

---

## 7. File Structure

```
web-app/
└── design-mocks/
    ├── landing-page-framer.html   # Dark marketing site
    ├── dashboard-framer.html      # Dark dashboard
    ├── dashboard.html             # Light editorial dashboard
    └── FRONTEND.MD                # This file
```

---

## 8. Browser Support

- **Chrome/Edge**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Mobile Safari**: iOS 14+
- **Chrome Mobile**: Android 90+

### Key Features Used
- CSS Grid (full support)
- CSS Custom Properties (full support)
- Flexbox (full support)
- backdrop-filter (graceful degradation)
- clamp() (fallback values provided)

---

## 9. Performance Considerations

### Font Loading
- Preconnect to Google Fonts CDN
- Display swap for font-face
- Load only required weights (400, 500, 600, 700, 800)

### Images
- Use appropriate formats (WebP with JPEG fallback)
- Lazy loading on below-fold content
- Responsive images with srcset

### Animations
- Use transform and opacity (GPU-accelerated)
- Avoid animating layout properties
- Will-change on interactive elements

### CSS
- Critical CSS inlined in `<head>`
- Non-critical CSS deferred
- Minified and compressed in production

---

## 10. Future Enhancements

### Planned Features
1. **Dark Mode Toggle**: Allow users to switch between light/dark themes
2. **Theme Customization**: User-selected accent colors
3. **Density Options**: Compact/comfortable/spacious layouts
4. **Component Library**: Extract to separate CSS file
5. **Design Tokens**: JSON-based token system
6. **Animation Library**: Consistent motion system

### Accessibility Improvements
1. High contrast mode support
2. Font size controls
3. Better keyboard shortcut system
4. Enhanced screen reader support

---

## 11. Library & Modal Components

### Library Table View (`library.html`)
- **Layout**: Desktop shows full 6-column table, mobile switches to card layout
- **Columns**:
  1. **Video** (340px): 160px thumbnail + title + channel
  2. **Content Available**: Badge chips (T/S/C)
  3. **Type** (140px): Individual or Batch
  4. **Created** (160px): "Jan 15, 2026" format
  5. **Size** (120px): KB/MB display
  6. **Actions** (180px): Export, View, Delete buttons

- **Filters**: Type (All/Individual/Batch), Content (All/T/S/C), Sort (Recent/Oldest/A-Z)
- **Batch Items**: 2×2 thumbnail grid, "Batch: N" badge
- **Export Dropdown**: Shows available formats (PDF, MD, TXT) based on content

### SavedItemModal (Slide-Out) (`modal-mockup.html`)

**Design Specs:**
```css
max-width: 600px;
height: 800px;
position: fixed;
right: 0;
top: 0;
background: #212121;
animation: slideIn 0.3s ease-out;

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

**Header:**
- Video title (18px bold, ellipsis)
- Close button (36×36px clickable area)

**Three Tabs:**

1. **Transcript Tab**
   - Controls: Search input, Language (read-only), Export button
   - Content: Paragraphs with timestamps
   - Timestamps: Blue (#3ea6ff), underlined, clickable
   - Format: 8 lines or punctuation breaks

2. **Summary Tab**
   - Format selector: Short, Topics, Q&A
   - Generate button (upload items only, `source='upload'`)
   - Markdown rendering with headers, bold, lists
   - Loading: "Generating..." spinner
   - Export button for download

3. **Chat Tab**
   - Suggested questions: 3 purple pills (upload only)
   - Messages: User (purple gradient, right), Assistant (gray, left)
   - Input: Textarea + Send button
   - Empty state: 💬 icon + message
   - Disabled for extension items (`source='extension'`)

**Modes:**
- **Interactive** (`source='upload'`): Full generate/chat functionality
- **View-Only** (`source='extension'`): Read-only, no generate buttons

## 12. Legal Pages

### Legal Component Structure
All legal pages follow the same design system:

**Layout:**
- Fixed navigation with blur effect (matching main site)
- Max-width 900px content area
- 8rem top padding (accounts for fixed nav)
- Consistent footer with legal links

**Typography:**
- H1: Gradient green title (Plus Jakarta Sans, 2.5-3.5rem)
- H2: Green section headers (#22c55e, 1.75rem)
- H3: White subsection headers (1.25rem)
- Body: #e5e5e5, 1.0625rem, 1.7 line-height

**Components:**
1. **Privacy Policy** (`/legal/privacy-policy`)
2. **Terms of Service** (`/legal/terms-of-service`)
3. **Cookie Policy** (`/legal/cookie-policy`)
4. **GDPR Compliance** (`/legal/gdpr-compliance`)
5. **Data Processing Agreement** (`/legal/data-processing-agreement`)

**Contact Boxes:**
```css
background: #1f1f1f;
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 16px;
padding: 1.5rem;
```

## 13. V1 Implementation Status

### ✅ Completed Components
- React Router v7 setup with route protection
- Landing page with Google OAuth (`landing-page-framer.html`)
- AuthCallback for OAuth code exchange
- Dashboard with single URL input (`dashboard-framer.html`)
- SavedItemModal with slide-out animation (`modal-mockup.html`)
- Library table view (`library.html`)
- VideoCard component for grid
- Legal pages (Privacy, Terms, Cookie, GDPR, DPA)

### 🚧 In Progress
- Navigation blur effect polish
- Video card hover animations
- Export dropdown functionality
- Real-time search in Library
- Loading skeletons
- Empty state illustrations

### ❌ Explicitly Out of Scope (V1)
- Batch URL processing UI (hidden per requirements)
- Extension ↔ Webapp auth bridge
- Email/password authentication
- Multi-video chat
- Collections/folders
- Cloud storage integration
- Advanced search across videos
- Password reset flow
- Analytics integration
- Mobile native apps

## Conclusion

This design system provides a modern, cohesive visual language for Mintclip. The dark theme creates a sophisticated, focused environment for knowledge extraction, while the carefully chosen green accent maintains brand identity throughout the experience.

**Key Principles:**
- **Consistency**: Reusable patterns and components across all pages
- **Clarity**: Clear hierarchy and visual structure
- **Performance**: Optimized for speed and efficiency
- **Accessibility**: Inclusive design for all users (WCAG AA compliance)
- **Scalability**: Built to grow with the product
- **Scope Control**: Explicit boundaries to prevent feature creep in V1

**V1 Goals:**
- Pixel-perfect match to 4 HTML mockups
- Google OAuth only (no email/password)
- Single URL processing (no batch UI)
- Interactive mode for upload items
- View-only mode for extension items
- Legal compliance (Privacy, GDPR, Terms)

For questions or contributions, refer to the main project documentation.
