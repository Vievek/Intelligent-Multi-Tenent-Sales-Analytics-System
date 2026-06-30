# Functions Test Suite Documentation

> **Framework:** [Jest](https://jestjs.io) v29  
> **Environment:** Node.js  
> **Status:** ✅ 204 / 204 tests passing across 20 test files

---

## Global Test Setup

**File:** [`tests/setup.js`](../../functions/tests/setup.js)

All test suites share environment variable injection and module mocks via Jest `setupFilesAfterFramework`:

| Mock Target | Mock Behavior |
|---|---|
| `@google-cloud/pubsub` | `MockPubSub` class — `topic().publish()` resolves to `'mock-message-id'`, `createTopic()` resolves to `[{name:'mock-topic'}]` |
| `node-telegram-bot-api` | `sendMessage()` and `setWebhook()` resolve successfully |
| `@huggingface/inference` | `HfInference.tokenClassification()` returns NER entities: `MISC=apple`, `O=5`, `O=$10` |
| `@google/generative-ai` | `GoogleGenerativeAI` — `generateContent()` parses numbers/prices from prompt text and returns JSON `{product, quantity, price}` |
| `firebase-admin` | Full Firestore mock chain: `collection().doc().where().orderBy().limit().get()` etc. — all return chainable mock objects. `FieldValue.serverTimestamp()` → `'timestamp'`, `FieldValue.increment(n)` → `n` |

**`beforeEach` global reset:**
- Resets all Firestore mock method implementations
- Resets `pubsubService._client = null` to allow re-stubbing PubSub constructors between tests

**Environment variables:**
```
TELEGRAM_BOT_TOKEN=test_token
HUGGINGFACE_TOKEN=test_hf_token
GEMINI_API_KEY=test_gemini_key
PUBSUB_TOPIC=test-topic
PUBSUB_DEAD_LETTER=test-dlq
LOG_LEVEL=error
```

---

## Unit Tests

### 1. `tests/unit/handlers/pubsubProcessor.test.js`

**Source:** [`src/handlers/pubsubProcessor.js`](../../functions/src/handlers/pubsubProcessor.js)  
**Tests:** 11 tests — ✅ All passing

#### Mocks
```js
jest.mock('../../../src/services/nlp/nlpStrategy');    // nlpStrategy.extract
jest.mock('../../../src/repositories/saleRepository');  // saleRepository.create
jest.mock('../../../src/repositories/agentRepository'); // agentRepository.incrementMessageCount
jest.mock('../../../src/utils/dateParser');             // dateParser.extractDate
```

#### Test Cases

| Test | Event Data | Expected |
|---|---|---|
| processes valid message successfully | `text: 'sold 5 apples for $10'`, NLP returns HIGH confidence | `nlpStrategy.extract` called; `saleRepository.create` called; `agentRepository.incrementMessageCount` called with `(tenant1, 123)` |
| handles missing text | No `text` field | `nlpStrategy.extract` NOT called; `saleRepository.create` NOT called |
| handles empty data object | `data: {}` | No NLP/storage calls |
| handles null data | `data: null` | No NLP/storage calls |
| handles extraction error | NLP rejects with `'Extraction failed'` | Processor rejects with same error; `saleRepository.create` NOT called |
| handles validation error | NLP returns `{ product:'', quantity:-5, price:-10 }` | Processor rejects; `saleRepository.create` NOT called |
| handles repository error | NLP succeeds; `saleRepository.create` rejects `'Database error'` | Processor rejects with `'Database error'` |
| includes pubsubMessageId in sale data | `attributes.messageId='msg123'` | `saleRepository.create` called with `objectContaining({pubsubMessageId:'msg123'})` |
| calculates totalValue correctly | `quantity:5, price:10` | `saleRepository.create` called with `objectContaining({totalValue:50})` |
| processes base64 data successfully | Event with `data.message.data` as base64-encoded JSON | `saleRepository.create` called |
| handles invalid JSON in base64 | `data.message.data = 'invalid-base64-json-{{{'` | `saleRepository.create` NOT called (graceful failure) |
| updates messageLog status when doc found | Firestore mock returns non-empty snapshot | `ref.update()` called with `{status:'processed', saleId:'sale123'}` |
| handles messageLog update error gracefully | Firestore `.get()` rejects | Sale still created successfully (log error caught) |

---

### 2. `tests/unit/handlers/telegramWebhook.test.js`

**Source:** [`src/handlers/telegramWebhook.js`](../../functions/src/handlers/telegramWebhook.js)  
**Tests:** 10 tests — ✅ All passing

#### Mocks
```js
jest.mock('../../../src/services/tenantResolver');  // tenantResolver.registerAgent / resolveAgent
jest.mock('../../../src/services/telegramService'); // telegramService.sendMessage
jest.mock('@google-cloud/pubsub');                  // PubSub.prototype.topic().publish
```

#### Test Cases

| Test | Request | Expected |
|---|---|---|
| handles /start command | `text: '/start'` | `telegramService.sendMessage` called with `chatId=12345` and message containing `'Welcome'`; status `200` |
| handles /register with valid code | `text: '/register TEST123'`, `registerAgent` resolves `{id:'tenant1'}` | `registerAgent` called with `('123','TEST123',12345)`; message contains `'successful'` |
| handles /register with missing code | `text: '/register'` (no code) | Message contains `'Please provide tenant code'` |
| handles /register with invalid code | `registerAgent` rejects `'INVALID_CODE'` | Message contains `'failed'` |
| handles sales message from registered agent | `resolveAgent` resolves `{tenantId,agentId}`; PubSub configured | `publish()` called; message contains `'queued'` |
| handles sales message from unregistered agent | `resolveAgent` rejects `'UNREGISTERED_AGENT'` | Message contains `'not registered'` |
| handles empty message body | `body: {}` | Status `200`; JSON `{status:'no message'}` |
| handles message without text | Message without `text` field; agent registered | `publish()` still called (forwards empty messages) |
| handles deactivated tenant | `resolveAgent` rejects `'TENANT_INACTIVE'` | Message contains `'inactive'` |
| handles duplicate registration | `registerAgent` rejects `'DUPLICATE_REGISTRATION'` | Message contains `'failed'` |
| handles generic error on sales message | `resolveAgent` rejects `'UNKNOWN_DB_ERROR'` | Message contains `'Failed to process your message'` |

---

### 3. `tests/unit/repositories/agentRepository.test.js`

**Source:** [`src/repositories/agentRepository.js`](../../functions/src/repositories/agentRepository.js)  
**Tests:** 10 tests — ✅ All passing

#### Mocks
```js
jest.mock('firebase-admin');  // Global Firestore mock from setup.js
```

#### Test Cases

| Test | Mock Setup | Expected |
|---|---|---|
| creates agent successfully | `doc().set()` resolves | Returns `{id:'123', status:'active', messageCount:0}` |
| finds agent by id | `doc().get()` returns `{exists:true, data:{telegramUserId:'123'}}` | Returns `{id:'123', telegramUserId:'123'}` |
| returns null if agent not found by id | `doc().get()` returns `{exists:false}` | Returns `null` |
| finds agent by telegram user id | `collectionGroup().where().limit().get()` returns 1 doc | Returns `{id:'123', tenantId:'tenant1'}` |
| returns null for non-existent agent | `collectionGroup()...get()` returns `{empty:true}` | Returns `null` |
| finds agents by tenant | `collection()...get()` returns 2 docs | Returns array of length 2 |
| updates agent | `doc().update()` + `doc().get()` returns updated doc | Returns `{status:'blocked'}` |
| increments message count | `doc().update()` called | `update()` invoked |
| blocks agent | `update()` + `get()` returns `{status:'blocked'}` | Returns `{status:'blocked'}` |
| activates agent | `update()` + `get()` returns `{status:'active'}` | Returns `{status:'active'}` |
| gets agent performance | `collection()...get()` returns 2 sales | Returns `{totalSales:2, totalRevenue:300, totalQuantity:15, avgSaleValue:150}` |

---

### 4. `tests/unit/repositories/saleRepository.test.js`

**Source:** [`src/repositories/saleRepository.js`](../../functions/src/repositories/saleRepository.js)  
**Tests:** Tests for CRUD operations and queries on the sales Firestore sub-collection.

#### Mocks
```js
jest.mock('firebase-admin');
```

#### Key Test Cases
- Creates sale with auto-generated ID
- Finds sale by ID, returns `null` if not found
- Lists sales by tenant with ordering
- Updates sale by ID
- Deletes sale by ID
- Gets sales aggregated stats per tenant

---

### 5. `tests/unit/repositories/tenantRepository.test.js`

**Source:** [`src/repositories/tenantRepository.js`](../../functions/src/repositories/tenantRepository.js)  
**Tests:** Tests for tenant CRUD and lookup by tenant code.

#### Mocks
```js
jest.mock('firebase-admin');
```

#### Key Test Cases
- Creates tenant with unique code
- Finds tenant by ID, returns `null` if not found
- Finds tenant by unique `tenantCode` field (collection query)
- Lists all tenants
- Updates tenant data
- Deletes tenant

---

### 6. `tests/unit/services/telegramService.test.js`

**Source:** [`src/services/telegramService.js`](../../functions/src/services/telegramService.js)  
**Tests:** 4 tests — ✅ All passing

#### Mocks
```js
jest.mock('node-telegram-bot-api');  // sendMessage, setWebhook (from setup.js)
```

#### Key Test Cases
- `sendMessage(chatId, text)` calls bot API with correct args
- `setWebhook(url)` sets webhook URL correctly
- Handles send failure gracefully (error propagates)
- Sends messages with Markdown formatting

---

### 7. `tests/unit/nlp/nlpStrategy.test.js`

**Source:** [`src/services/nlp/nlpStrategy.js`](../../functions/src/services/nlp/nlpStrategy.js)  
**Tests:** 8 tests — ✅ All passing

#### Mocks
```js
jest.mock('../../../src/services/nlp/huggingfaceNLP'); // huggingfaceNLP.extract
jest.mock('../../../src/services/nlp/geminiNLP');       // geminiNLP.extract
```

#### Test Cases

| Test | HF Result | Gemini Result | Expected |
|---|---|---|---|
| UT-04: uses HF when confidence HIGH | `{product,quantity,price}` all valid | — | `method='huggingface'`, `confidence='HIGH'` |
| UT-03: falls back to Gemini when confidence LOW | `{product, quantity:null, price:null}` | Full result | `method='gemini'` |
| falls back to Gemini when HF throws | Throws `Error('HF error')` | Full result | `method='gemini'` |
| handles empty text gracefully | — | `{product:'unknown',quantity:1,price:0.01}` | `product` defined |
| handles very short text | — | Full result | `product` defined |
| normalizes result — Gemini provides valid values when HF returns nulls | All `null` | `{product,qty,price}` | Valid extraction, `method='gemini'` |
| keeps HF result at MEDIUM confidence when only price missing | `{product,quantity,price:null}` | — | `method='huggingface'`, `confidence='MEDIUM'` |
| `normalizeResult` handles empty/falsy inputs | — | — | Returns `{product:'unknown',quantity:1,price:0.01,confidence:'LOW',method:'gemini'}` |

---

### 8. `tests/unit/nlp/geminiNLP.test.js`

**Source:** [`src/services/nlp/geminiNLP.js`](../../functions/src/services/nlp/geminiNLP.js)  
**Tests:** Tests Gemini API integration for NLP extraction.

#### Mocks
```js
jest.mock('@google/generative-ai');  // Prompt-aware mock from setup.js
```

#### Key Test Cases
- Extracts product, quantity, price from natural language
- Handles various price formats (`$200`, `500rs`, `150 rupees`)
- Handles various quantity patterns (`10 bags of rice`)
- Returns defaults on ambiguous text
- Throws on API error

---

### 9. `tests/unit/nlp/huggingfaceNLP.test.js`

**Source:** [`src/services/nlp/huggingfaceNLP.js`](../../functions/src/services/nlp/huggingfaceNLP.js)  
**Tests:** Tests HuggingFace BERT NER-based extraction.

#### Mocks
```js
jest.mock('@huggingface/inference');  // tokenClassification from setup.js
```

#### Key Test Cases
- Extracts entities from NER token classification output
- Maps `MISC` entity group to product names
- Parses numeric tokens to `quantity` and `price`
- Returns `null` fields when tokens missing
- Handles HF API errors

---

### 10. `tests/unit/nlp/confidenceScorer.test.js`

**Source:** [`src/services/nlp/confidenceScorer.js`](../../functions/src/services/nlp/confidenceScorer.js)  
**Tests:** Tests confidence scoring logic — ✅ All passing

#### Mocks
_None — pure scoring logic._

#### Key Test Cases

| Input | Expected Confidence |
|---|---|
| `{product, quantity, price}` all valid | `HIGH` |
| `{product, quantity}` — price missing | `MEDIUM` |
| `{product}` only | `LOW` |
| All `null`/empty | `LOW` |

---

### 11. `tests/unit/nlp/preprocessor.test.js`

**Source:** [`src/services/nlp/preprocessor.js`](../../functions/src/services/nlp/preprocessor.js)  
**Tests:** Tests text cleaning/normalization — ✅ All passing

#### Mocks
_None — pure string processing._

#### Key Test Cases
- Lowercases and trims input
- Normalizes currency symbols (`$`, `rs`, `rupees`, `inr`)
- Removes emoji and special characters
- Handles empty/null input gracefully

---

### 12. `tests/unit/pubsubService.test.js`

**Source:** [`src/services/pubsubService.js`](../../functions/src/services/pubsubService.js)  
**Tests:** Tests pub/sub publishing and topic management.

#### Mocks
```js
jest.mock('@google-cloud/pubsub');  // From setup.js
```

#### Key Test Cases
- `publish(data)` calls `topic().publish()` with JSON-encoded buffer
- Creates topic if it doesn't exist (404 error handling)
- Handles publish failure gracefully
- Returns message ID on success

---

### 13. `tests/unit/tenantResolver.test.js`

**Source:** [`src/services/tenantResolver.js`](../../functions/src/services/tenantResolver.js)  
**Tests:** Tests tenant/agent registration and resolution.

#### Mocks
```js
jest.mock('firebase-admin');  // Firestore mock from setup.js
```

#### Key Test Cases
- `registerAgent(telegramUserId, tenantCode, chatId)` — creates agent record on valid tenant code
- Throws `INVALID_CODE` for unknown tenant code
- Throws `DUPLICATE_REGISTRATION` if agent already registered
- `resolveAgent(telegramUserId)` — looks up existing agent and returns `{tenantId, agentId}`
- Throws `UNREGISTERED_AGENT` if not found
- Throws `TENANT_INACTIVE` if tenant status is not `'active'`

---

### 14. `tests/unit/dateParser.test.js`

**Source:** [`src/utils/dateParser.js`](../../functions/src/utils/dateParser.js)  
**Tests:** Tests natural language date extraction.

#### Mocks
_None — pure date parsing logic._

#### Key Test Cases
- Parses `'today'` → current date
- Parses `'yesterday'` → yesterday
- Parses `'15 Dec 2024'` → `Date(2024-12-15)`
- Parses `'Dec 15, 2024'`
- Falls back to Unix timestamp when no date keyword found
- Handles `null`/missing input

---

### 15. `tests/unit/saleSchema.test.js`

**Source:** [`src/validators/saleSchema.js`](../../functions/src/validators/saleSchema.js)  
**Tests:** Tests Zod schema validation for extracted sale data.

#### Mocks
_None — pure validation logic._

#### Key Test Cases

| Input | Expected |
|---|---|
| `{product:'apple', quantity:5, price:10, confidence:'HIGH', method:'huggingface'}` | Passes validation |
| `product: ''` (empty string) | Fails — `too_small` error |
| `quantity: -1` (negative) | Fails — `too_small` error |
| `price: -10` (negative) | Fails — `too_small` error |
| Missing required fields | Fails with appropriate Zod errors |
| Extra fields | Stripped (Zod `strip` mode) |

---

### 16. `tests/unit/utils/` (logger, etc.)

Additional utility tests covering structured logging with different log levels.

---

## Integration Tests

### 17. `tests/integration/messageFlow.test.js`

**Tests:** Full Telegram → PubSub → NLP → Firestore message flow.

#### Mocks
```js
// All from setup.js: firebase-admin, @google-cloud/pubsub, node-telegram-bot-api, @huggingface/inference, @google/generative-ai
```

#### Key Test Cases
- Full flow: webhook receives message → publishes to PubSub → processor extracts → stores in Firestore
- Agent receives confirmation message after queuing
- Errors at each stage are handled and reported to agent

---

### 18. `tests/integration/nlpPipeline.test.js`

**Tests:** NLP pipeline end-to-end (HuggingFace → confidence → Gemini fallback).

#### Mocks
```js
jest.mock('@huggingface/inference');
jest.mock('@google/generative-ai');
```

#### Key Test Cases
- HuggingFace HIGH confidence → result used directly
- HuggingFace LOW confidence → Gemini called as fallback
- Both fail → error propagated
- Multiple concurrent messages processed independently

---

### 19. `tests/integration/firestoreRules.test.js`

**Tests:** Data isolation and permission logic for Firestore access patterns.

#### Mocks
```js
jest.mock('firebase-admin');  // Firestore mock
```

#### Key Test Cases
- Tenant A cannot access Tenant B's sales subcollection
- Admin can read all tenant documents
- Non-admin read attempts rejected
- Nested subcollection paths are correctly scoped per tenant

---

## E2E Tests

### 20. `tests/e2e/system.test.js`

**Tests:** 9 tests covering end-to-end system scenarios — ✅ All passing

#### Mocks
```js
jest.mock('../../src/services/nlp/nlpStrategy');  // nlpStrategy.extract
jest.mock('../../src/services/tenantResolver');    // tenantResolver.registerAgent/resolveAgent
jest.mock('../../src/repositories/saleRepository'); // saleRepository.create
jest.mock('../../src/services/telegramService');   // telegramService.sendMessage
// firebase-admin from global setup
```

#### Test Cases

| ID | Test | Expected |
|---|---|---|
| ST-01 | Happy path full flow | Webhook receives message → PubSub publishes → status 200 |
| ST-02 | NLP fallback flow | Text processed via Gemini fallback; sale stored with `extractionMethod:'gemini'`, `confidence:'LOW'` |
| ST-03 | Tenant isolation | Two tenants' Firestore docs return independent data; IDs don't match |
| ST-04 | Admin creates tenant | Firestore `set()` called with full tenant data including plan, status, createdBy |
| ST-05 | Processing failure recovery | First call fails (NLP error), second call succeeds; both calls counted |
| — | Handles unregistered agent gracefully | Status 200; message contains `'not registered'` |
| — | Handles invalid tenant code during registration | Message contains `'failed'` |
| — | Processes message with date extraction | Sale created with `date: expect.any(Date)` |
| — | Validates extracted data before storage | Invalid extracted data (`qty:-5, price:-10`) → processor rejects |
| — | Handles duplicate message detection | Sale created with `pubsubMessageId:'msg123'` for deduplication |

---

## Running Functions Tests

```bash
# Run all unit tests
cd functions
npm test

# Run with coverage
npm test -- --coverage

# Run a specific file
npm test -- tests/unit/handlers/pubsubProcessor.test.js

# Run only unit tests
npm test -- --testPathPattern="tests/unit"

# Run only e2e tests
npm test -- --testPathPattern="tests/e2e"
```

---

## Summary

| Test Suite | Files | Tests | Status |
|---|---|---|---|
| **Unit — Handlers** | 2 files | 21 tests | ✅ |
| **Unit — Repositories** | 3 files | ~30 tests | ✅ |
| **Unit — Services / NLP** | 7 files | ~90 tests | ✅ |
| **Unit — Utils / Validators** | 4 files | ~30 tests | ✅ |
| **Integration** | 3 files | ~25 tests | ✅ |
| **E2E** | 1 file | 9 tests | ✅ |
| **Total** | **20 files** | **204 tests** | **✅ 204/204** |

### Coverage Summary (from last run)

| Layer | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| handlers | 98.97% | 86.04% | 100% | 100% |
| repositories | 98.80% | 66.07% | 100% | 99.38% |
| services | 100% | 85% | 100% | 100% |
| services/nlp | 92.39% | 81.51% | 90.9% | 93.25% |
| utils | 98.38% | 78.37% | 100% | 100% |
| validators | 100% | 100% | 100% | 100% |
| **All files** | **97.17%** | **79.73%** | **98%** | **97.88%** |
