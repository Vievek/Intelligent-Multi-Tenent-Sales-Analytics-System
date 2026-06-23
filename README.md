# RMET Sales Analytics

Intelligent Multi-Tenant Sales Analytics System with Telegram NLP Integration

## Overview

RMET Sales Analytics is a serverless, multi-tenant system that processes unstructured sales messages from Telegram, extracts structured sales data using NLP (HuggingFace BERT + Gemini fallback), and provides real-time analytics dashboards.

## Architecture

- **Event-Driven**: Google Cloud Pub/Sub for message queuing
- **Serverless**: Firebase Functions auto-scaling
- **Multi-Tenant**: Firestore isolated collections with security rules
- **NLP Strategy Pattern**: Swappable extraction engines (HuggingFace → Gemini fallback)

## Tech Stack

- **Backend**: Firebase Functions (Node.js 20), Firestore, Pub/Sub, BigQuery
- **Frontend**: React + Vite + TailwindCSS + Recharts
- **NLP**: HuggingFace BERT, Gemini 1.5 Flash
- **Testing**: Jest (backend), Vitest (frontend)

## Installation

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud Project with billing enabled
- Telegram Bot Token (from BotFather)
- HuggingFace API Token
- Gemini API Key

### Environment Variables

Create `.env.local` in `functions/`:

```
TELEGRAM_BOT_TOKEN=your_telegram_token
HUGGINGFACE_TOKEN=your_hf_token
GEMINI_API_KEY=your_gemini_key
PUBSUB_TOPIC=sales-messages
LOG_LEVEL=info
```

Create `.env` in `frontend/`:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Setup

```bash
# Install dependencies
npm --prefix functions install
npm --prefix frontend install

# Deploy Firebase resources
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only functions
firebase deploy --only hosting
```

## Testing

```bash
# Backend unit tests
npm --prefix functions test:unit

# Backend integration tests
npm --prefix functions test:integration

# Frontend tests
npm --prefix frontend test
```

## Project Structure

```
rmet-sales-analytics/
├── functions/          # Firebase Functions backend
│   ├── src/
│   │   ├── handlers/   # Webhook & Pub/Sub handlers
│   │   ├── services/   # NLP, tenant resolver, Pub/Sub
│   │   ├── repositories/ # Firestore data access
│   │   ├── validators/ # Zod schemas
│   │   └── utils/      # Logger, date parser
│   └── tests/
├── frontend/           # React dashboard
│   ├── src/
│   │   ├── pages/      # Login, Admin, Tenant dashboards
│   │   ├── components/ # Charts, tables, UI components
│   │   ├── hooks/      # useSales, useTenants, useAuth
│   │   └── services/   # Firebase config
│   └── tests/
├── firestore.rules     # Security rules
├── firestore.indexes.json # Composite indexes
└── README.md
```

## API

### Telegram Bot Commands

- `/start` - Welcome message
- `/register TENANT_CODE` - Register agent with tenant
- Send sales messages: `sold 5 apples for $10`

### Dashboard Routes

- `/login` - Authentication
- `/admin` - Admin overview (admin only)
- `/admin/tenants` - Tenant management (admin only)
- `/dashboard` - Tenant analytics

## License

University of Bedfordshire - B.Sc. (Hons) Information Technology
