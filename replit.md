# PetCal — AI-Powered Custom Pet Calendars

## Overview
A web app where users upload a photo of their dog or cat, and AI generates a 12-month holiday-themed calendar. Users can preview the generated calendar and purchase it via Stripe.

## Architecture

### Stack
- **Frontend**: React + TypeScript + Vite + TanStack Query + Wouter + shadcn/ui + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **AI**: OpenAI gpt-image-1 via Replit AI Integrations
- **Payments**: Stripe via Replit Stripe Integration + stripe-replit-sync

### Key Features
1. **Photo Upload** – User uploads a pet photo (JPG/PNG up to 10MB)
2. **AI Calendar Generation** – 12 holiday-themed images generated using `openai.images.edit()` with gpt-image-1
3. **Real-time Progress** – Frontend polls every 3 seconds; progress bar shows generation status
4. **Calendar Preview** – All 12 months shown in a grid; unblurred only after purchase
5. **Stripe Checkout** – One-time payment of $29.99 via Stripe Checkout Sessions
6. **Payment Verification** – After redirect, `/api/checkout/verify` confirms payment and unlocks images

### Pages
- `/` — Home/landing page with upload form
- `/calendar/:id` — Calendar preview with generation progress and purchase CTA
- `/checkout/success?session_id=...&calendar_id=...` — Post-payment confirmation

### API Endpoints
- `POST /api/calendars` — Create calendar (multipart form: petName, petType, photo)
- `GET /api/calendars/:id` — Get calendar + months + generation status
- `GET /api/calendars/:id/months` — Get months only
- `POST /api/checkout` — Create Stripe checkout session (body: calendarId, email)
- `GET /api/checkout/verify` — Verify payment and unlock calendar (query: session_id, calendar_id)
- `GET /api/stripe/publishable-key` — Get Stripe publishable key
- `POST /api/stripe/webhook` — Stripe webhook (registered BEFORE express.json())

### Database Schema
- `calendars` — id, petName, petType (dog|cat), photoData (base64), status, customerEmail, stripeSessionId
- `calendar_months` — id, calendarId, month (1-12), holidayName, imageUrl, generated (0|1)
- Stripe schema managed automatically by stripe-replit-sync

### Generated Images
- Stored at `client/public/generated/{calendarId}/{month}.png`
- Served statically via Vite/Express
- Generation is triggered asynchronously after calendar creation

### Holiday Calendar
| Month | Holiday |
|-------|---------|
| Jan | New Year's Day |
| Feb | Valentine's Day |
| Mar | St. Patrick's Day |
| Apr | Easter |
| May | Mother's Day |
| Jun | Summer Solstice |
| Jul | Independence Day |
| Aug | National Pet Day |
| Sep | Back to School |
| Oct | Halloween |
| Nov | Thanksgiving |
| Dec | Christmas |

## User Preferences
- Warm, playful visual theme (orange/amber primary color)
- Clean card-based layout
- Price: $29.99 per calendar
