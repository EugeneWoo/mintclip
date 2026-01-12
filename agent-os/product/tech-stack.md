## Tech stack

This document defines the technical stack for YT Coach, serving as a reference for all development work and ensuring consistency across the project.

### Framework & Runtime
- **Application Framework:** Next.js (App Router)
- **Language/Runtime:** Node.js (TypeScript)
- **Package Manager:** npm

### Frontend
- **JavaScript Framework:** React (via Next.js)
- **CSS Framework:** Tailwind CSS
- **UI Components:** shadcn/ui

### Database & Storage
- **Database:** PostgreSQL
- **ORM/Query Builder:** Prisma
- **Caching:** Redis (for transcript caching and rate limiting)

### Testing & Quality
- **Test Framework:** Jest (unit tests), Playwright (E2E tests)
- **Linting/Formatting:** ESLint, Prettier

### Deployment & Infrastructure
- **Hosting:** Vercel (frontend and API routes)
- **Database Hosting:** Supabase or Railway (PostgreSQL)
- **CI/CD:** GitHub Actions

### Third-Party Services
- **Authentication:** NextAuth.js
- **AI/ML Services:** Google Gemini API (for transcript summarization and chat)
- **YouTube Integration:** YouTube Data API v3 (for video metadata and transcript extraction)
- **Payment Processing:** Stripe (for Pro tier subscriptions)
- **Email:** Resend or SendGrid (for transactional emails)
- **Monitoring:** Sentry (error tracking and performance monitoring)

### Key Libraries & Tools
- **HTTP Client:** Fetch API (native) or axios
- **Form Handling:** React Hook Form
- **State Management:** React Context API / Zustand (if needed for complex state)
- **Date Handling:** date-fns
- **URL Validation:** zod (for validation schemas)

