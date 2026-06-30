# 🧪 Complete Manual Testing Guide — Production/Staging Mode

This guide explains how to deploy the sales analytics backend and frontend to Firebase production/staging, configure the live Telegram Bot webhook, and test by sending real messages directly to the bot.

---

## 1 · Prerequisites

Before deploying, make sure you have:
1. **Firebase CLI installed & logged in:**
   ```powershell
   firebase login
   ```
2. **Telegram Bot Token:** Created via [@BotFather](https://t.me/BotFather).
3. **API Keys:** Hugging Face inference token and Gemini API key.

---

## 2 · Deploy Backend & Databases

### Step 2a — Configure Environment Variables for Production
Create or verify the `functions/.env` file. These variables will be uploaded automatically to Google Cloud during deployment:
```ini
TELEGRAM_BOT_TOKEN=your_real_bot_token
HUGGINGFACE_TOKEN=your_huggingface_token
GEMINI_API_KEY=your_gemini_api_key
PUBSUB_TOPIC=sales-messages
LOG_LEVEL=info
```

### Step 2b — Deploy to Firebase
Run the deployment command from the project root:
```powershell
firebase deploy --only functions,firestore
```

**Note the Webhook URL:** Once the deployment completes, look at the console output to find the HTTPS URL for the `receiveTelegramMessage` function. It should look like this:
```
https://receivetelegrammessage-us-central1-sales-analytics-51405.cloudfunctions.net/receiveTelegramMessage
```

---

## 3 · Set up the Live Telegram Webhook

To make Telegram route messages to your deployed function, register the webhook with the Telegram API. Replace `<TELEGRAM_BOT_TOKEN>` and `<DEPLOYED_FUNCTION_URL>` with your actual values:

### Using PowerShell
```powershell
$botToken = "your_real_bot_token"
$webhookUrl = "https://receivetelegrammessage-us-central1-sales-analytics-51405.cloudfunctions.net/receiveTelegramMessage"

Invoke-RestMethod -Method Get -Uri "https://api.telegram.org/bot$botToken/setWebhook?url=$webhookUrl"
```

### Expected Response
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

---

## 4 · Configure Frontend to Connect to Production

To test the frontend dashboard locally using the live production Firebase data, configure it to bypass the local emulators.

### Step 4a — Update Frontend Environment Variables
In [frontend/.env](file:///c:/projects/personal/Intelligent-Multi-Tenent-Sales-Analytics-System/frontend/.env), ensure you point to production and add the emulator override flag:
```ini
VITE_FIREBASE_API_KEY=your_production_api_key
VITE_FIREBASE_AUTH_DOMAIN=sales-analytics-51405.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sales-analytics-51405
...
# Disable emulators to connect to production:
VITE_USE_EMULATORS=false
```

### Step 4b — Start the Frontend Dev Server
```powershell
cd C:\projects\personal\Intelligent-Multi-Tenent-Sales-Analytics-System
npm run dev:frontend
```
Frontend runs locally at → **http://localhost:5173** (connected to your live production Firebase).

---

## 5 · Seed Production Firestore Data

Before viewing the dashboard, seed the tenant definitions, basic metrics, and create the Admin user in production Auth.

### Step 5a — Get a Firebase Service Account Key
To authenticate the seed script with production Firestore/Auth:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Project Settings → **Service Accounts**.
3. Click **Generate new private key**.
4. Save the JSON file to your local machine (e.g., `C:\keys\firebase-adminsdk.json`).

### Step 5b — Run the Seed Command
Run the seed script in your preferred shell environment:

#### PowerShell
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\keys\firebase-adminsdk.json"
$env:SEED_PROD="true"
cd C:\projects\personal\Intelligent-Multi-Tenent-Sales-Analytics-System\functions
node seed.js
```

#### Windows Command Prompt (CMD)
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\keys\firebase-adminsdk.json
set SEED_PROD=true
cd C:\projects\personal\Intelligent-Multi-Tenent-Sales-Analytics-System\functions
node seed.js
```

#### Bash (macOS/Linux)
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/keys/firebase-adminsdk.json"
export SEED_PROD="true"
cd /projects/personal/Intelligent-Multi-Tenent-Sales-Analytics-System/functions
node seed.js
```

**Expected output:**
```
🌐 Seeding production Firebase (ensure GOOGLE_APPLICATION_CREDENTIALS is set)...
🌱 Starting Firestore and Auth database seeding...
🧹 Clearing existing collections...
Setting up Admin user: admin@rmet.com...
...
✅ Seeding completed successfully!
```

---

## 6 · Test via Telegram App (Live E2E Test Cases)

Now you can test the system end-to-end by messaging your actual Telegram Bot! Below are the 10 manual test cases mapped directly from the E2E tests:

### Test 6a — ST-01: Happy Path Full Flow (Registered Agent)
1. Register your agent first (see Test 6g).
2. Send to the bot: `sold 10 mangoes for $50`
3. **Expected response:** The bot replies acknowledging the receipt.
4. **Verification:** Verify that a new document is added to the `messageLog` collection in Firestore with state `"processed"`, and a new entry is added to `tenants/<tenantId>/sales/` with product `"mangoes"`, quantity `10`, and price `50`.

---

### Test 6b — ST-02: NLP Fallback Flow (Low Confidence Parser)
1. Send to the bot: `random text xyz`
2. **Expected response:** The bot acknowledges the message.
3. **Verification:** In the Firestore console, locate the `messageLog` document. Check that the extraction method is `"gemini"` and confidence is `"LOW"`.

---

### Test 6c — ST-03: Tenant Isolation Verification
1. Register two different agents to different tenants (e.g. agent A under `ALPHA`, agent B under another tenant code).
2. Send sales reports from both agents.
3. Verify that agent A's sales are only logged under tenant A's subcollection and cannot be accessed or viewed by agent B or tenant B's dashboard.

---

### Test 6d — ST-04: Admin Creates Tenant
1. Log in to the dashboard at **http://localhost:5173/login** using the credentials:
   - **Email:** `admin@rmet.com`
   - **Password:** `password123`
2. Go to the Admin panel and create a new tenant (e.g. code `GAMMA`).
3. Verify the tenant document is created in the production Firestore under the `/tenants/` collection.

---

### Test 6e — ST-05: Processing Failure Recovery
1. If the NLP API experiences a temporary downtime or timeout, the webhook/PubSub processor will fail the message processing.
2. Verify in Google Cloud Logging (under the Cloud Function logs) that a failure is recorded, and the Pub/Sub subscription triggers a retry once the downstream APIs recover, eventually parsing the message successfully.

---

### Test 6f — ST-06: Unregistered Agent Graceful Handling
1. Using a new or unregistered Telegram account (not registered with `/register`), send a message to the bot: `sold 5 apples for $10`.
2. **Expected response:** The bot sends a message indicating you are not registered and provides instructions on how to join a tenant.

---

### Test 6g — ST-07: Invalid Tenant Code During Registration
1. Send to the bot: `/register INVALID_CODE`
2. **Expected response:** The bot replies indicating that registration failed/the code is invalid.

---

### Test 6h — ST-08: Date Extraction (Absolute & Relative Dates)
1. Send to the bot: `yesterday sold 3 phones for $150 each`
2. Send to the bot: `Dec 15 sold 20 pencils for $2`
3. **Verification:** In the Firestore dashboard under `sales/`, check that the relative date ("yesterday") and absolute date ("Dec 15") have been parsed into correct timestamp objects.

---

### Test 6i — ST-09: Invalid Data Validation before Storage
1. Send to the bot: `sold -5 apples for -$10`
2. **Verification:** Check the function logs/Firestore. The system should reject the payload (e.g., negative quantity or price) and mark the message log status as `"failed"` without writing to the sales subcollection.

---

### Test 6j — ST-10: Duplicate Message Detection
1. In the event of a network retry delivering the exact same message twice, the system verifies that the message ID is tracked (`pubsubMessageId`) and avoids creating duplicate sales entries.

---

## 7 · Verify the Analytics Dashboard

1. Open **http://localhost:5173/login** (running locally but talking to production).
2. Login with:
   - **Email:** `admin@rmet.com`
   - **Password:** `password123`
3. Check the **Admin Dashboard** and **Tenant Dashboard** (`/dashboard`) to view real-time charts and leaderboards showcasing the live sales you just messaged to the bot!

