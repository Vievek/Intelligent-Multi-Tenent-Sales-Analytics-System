# RMET Sales Analytics - Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Telegram Users                                 │
│                          (Sales Agents / Tenants)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Telegram Bot API                                  │
│                         (Shared Bot per System)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 1: INGESTION                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Firebase Function: receiveTelegramMessage()                        │   │
│  │  - Validates message                                               │   │
│  │  - Resolves tenant from telegramUserId                             │   │
│  │  - Publishes to Pub/Sub topic                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Google Cloud Pub/Sub                                   │
│                   Topic: sales-messages                                     │
│              - Retry policy (3 attempts)                                   │
│              - Dead letter queue: sales-messages-dlq                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 2: PROCESSING                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Firebase Function: processSalesMessage()                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    NLP Pipeline                              │   │   │
│  │  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │   │   │
│  │  │  │Preprocessor │→│ HuggingFace  │→│ Confidence Scorer  │   │   │   │
│  │  │  │  (clean,    │  │   BERT NER   │  │  (HIGH/MEDIUM/LOW)│   │   │   │
│  │  │  │   tokenize) │  │  (primary)   │  │                   │   │   │   │
│  │  │  └─────────────┘  └──────────────┘  └───────────────────┘   │   │   │
│  │  │                          │                                   │   │   │
│  │  │                          ▼                                   │   │   │
│  │  │                   ┌──────────────┐                           │   │   │
│  │  │                   │   LOW CONF?  │                           │   │   │
│  │  │                   └──────────────┘                           │   │   │
│  │  │                          │                                   │   │   │
│  │  │                          ▼                                   │   │   │
│  │  │                   ┌──────────────┐                           │   │   │
│  │  │                   │  Gemini API  │                           │   │   │
│  │  │                   │   Fallback   │                           │   │   │
│  │  │                   └──────────────┘                           │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                          │                                         │   │
│  │                          ▼                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  Zod Schema Validation                                      │   │   │
│  │  │  { product, quantity, price, date, tenantId, agentId }     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LAYER 3: STORAGE                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Firestore (Real-time)                           │   │
│  │  - tenants/{tenantId}                                             │   │
│  │  - tenants/{tenantId}/agents/{agentId}                            │   │
│  │  - tenants/{tenantId}/sales/{saleId}                              │   │
│  │  - admins/{adminId}                                               │   │
│  │  - messageLog/{logId}                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BigQuery (Analytics)                            │   │
│  │  - sales_analytics table                                           │   │
│  │  - Daily aggregation                                               │   │
│  │  - SQL analytics queries                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LAYER 4: PRESENTATION                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    React + Vite Dashboard                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐  │   │
│  │  │  Login Page │  │ Admin Page  │  │  Tenant Dashboard          │  │   │
│  │  │  (Firebase  │  │ (Overview,  │  │  (Real-time charts,        │  │   │
│  │  │   Auth)     │  │  Tenants)   │  │   Sales table, Agents)    │  │   │
│  │  └─────────────┘  └─────────────┘  └───────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Design Patterns Applied

| Pattern | Where Applied | Benefit |
|---------|---------------|---------|
| Strategy Pattern | NLP extraction layer | Swap HuggingFace/Gemini independently |
| Layered Architecture | Full system | Clear separation, modifiability |
| Event-Driven | Pub/Sub between ingestion & processing | Availability, decoupling |
| Repository Pattern | Firestore data access | Testable, swappable storage |
| Factory Pattern | Tenant resolver | Clean tenant object creation |
| Observer Pattern | Dashboard real-time updates | Firestore onSnapshot listeners |

## Data Flow

1. **Agent sends message** → Telegram Bot API
2. **Webhook handler** validates and resolves tenant
3. **Message published** to Pub/Sub topic
4. **Processor function** triggers on new message
5. **NLP Pipeline** extracts structured data
6. **Validation** ensures data quality
7. **Storage** in Firestore with tenant isolation
8. **Analytics** sync to BigQuery
9. **Dashboard** displays real-time insights

## Security Model

- **Firebase Auth**: JWT-based authentication
- **Custom Claims**: role and tenantId embedded in token
- **Firestore Rules**: Tenant isolation enforced at database level
- **Admin Only**: Tenant management restricted to admin role
- **API Keys**: Stored in Firebase environment secrets

## Scalability Features

- **Serverless**: Firebase Functions auto-scale
- **Async Processing**: Pub/Sub decouples ingestion from processing
- **Caching**: Tenant resolver caches agent lookups (5 min TTL)
- **Database Indexes**: Composite indexes for efficient queries
