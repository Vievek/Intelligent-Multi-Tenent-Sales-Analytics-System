# 🧪 Complete Manual Testing Guide — Emulator Mode

This guide explains how to configure and run manual testing using the local Firebase Emulators and local frontend dev server.

---

## 0 · Testing with Postman (Importing and Sending Requests)

All E2E test commands listed below can be performed using **Postman** instead of PowerShell. Here is the complete setup guide:

### Step 1: Create a Request in Postman

1. Open Postman.
2. Click **New** (or the **+** tab) and choose **HTTP Request**.
3. Set the HTTP Method dropdown to **POST**.
4. Paste the URL: `http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage`

### Step 2: Configure Headers

1. Navigate to the **Headers** tab.
2. Under **Key**, enter `Content-Type`.
3. Under **Value**, enter `application/json`.

### Step 3: Set JSON Request Body

1. Navigate to the **Body** tab.
2. Choose the **raw** radio button.
3. Select **JSON** from the format dropdown (which changes it from Text to JSON).
4. Paste the message body:
   ```json
   {
     "message": {
       "chat": {
         "id": 12345
       },
       "from": {
         "id": 111222333
       },
       "text": "sold 10 mangoes for $50",
       "date": 1700000000
     }
   }
   ```

### Step 4: Send the Request

1. Click **Send**.
2. Confirm the response returns status `200 OK` with JSON payload:
   ```json
   { "status": "message queued" }
   ```

---

## 1 · Configuration (Environment Variables)

### Frontend Environment Variables

In [frontend/.env](file:///c:/projects/personal/Intelligent-Multi-Tenent-Sales-Analytics-System/frontend/.env), make sure you are configured to use the emulators:

```ini


# Enable emulators (or leave empty to default to true in DEV mode)
VITE_USE_EMULATORS=true
```

### Functions Environment Variables

In [functions/.env](file:///c:/projects/personal/Intelligent-Multi-Tenent-Sales-Analytics-System/functions/.env), set the tokens needed by the backend functions:

```ini

```

### Seeding Environment Variables

When seeding the emulator database with `node seed.js`, ensure you are NOT setting `SEED_PROD` to `"true"`, as it defaults to emulator mode. If it was previously set, clear it:

- **PowerShell:** `$env:SEED_PROD=$null`
- **CMD:** `set SEED_PROD=`
- **Bash:** `unset SEED_PROD`

---

## 2 · Start the Emulators & Frontend

### Step 2a — Start Firebase Emulators

Open a terminal and start the Firebase Emulators:

```powershell
cd C:\projects\personal\Intelligent-Multi-Tenent-Sales-Analytics-System
npx -y firebase-tools@latest emulators:start
```

_(If you see "port taken" errors, check for and terminate any background java or node processes using ports 8090, 8085, 9099, or 5001)._

Wait until you see:

```
✔  All emulators ready!
```

### Step 2b — Start Frontend Dev Server

Open a second terminal and start the Vite dev server:

```powershell
cd C:\projects\personal\Intelligent-Multi-Tenent-Sales-Analytics-System
npm run dev:frontend
```

Frontend runs at → **http://localhost:5173**

---

## 3 · Seed Emulator Data

Open a third terminal and run the seeding script to populate Firestore and Auth emulators:

```powershell
cd C:\projects\personal\Intelligent-Multi-Tenent-Sales-Analytics-System\functions
node seed.js
```

**Expected output:**

```
🔌 Seeding local emulators...
🌱 Starting Firestore and Auth database seeding...
🧹 Clearing existing collections...
Setting up Admin user: admin@rmet.com...
...
✅ Seeding completed successfully!
```

Admin credentials seeded:

- **Email:** `admin@rmet.com`
- **Password:** `password123`

---

## 4 · Simulating Telegram Webhook Messages (E2E Test Cases)

Since standard Telegram servers cannot send messages directly to your local emulator, we simulate messages by posting payloads directly to the local endpoint.

Below are the 10 manual test cases mapped directly from the E2E tests (`system.test.js`), formatted for both **Postman** and **PowerShell**:

---

### Test 4a — ST-01: Happy Path Full Flow (Registered Agent)

- **Description:** Simulate sending a standard sales report from a registered agent.
- **Postman Settings:**
  - **Method:** `POST`
  - **URL:** `http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage`
  - **Headers:** `Content-Type: application/json`
  - **Body (raw JSON):**
    ```json
    {
      "message": {
        "chat": { "id": 12345 },
        "from": { "id": 111222333 },
        "text": "sold 10 mangoes for $50",
        "date": 1700000000
      }
    }
    ```
- **PowerShell Command:**
  ```powershell
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage" `
    -ContentType "application/json" `
    -Body '{"message": {"chat": {"id": 12345}, "from": {"id": 111222333}, "text": "sold 10 mangoes for $50", "date": 1700000000}}'
  ```
- **Expected Response:** `{"status":"message queued"}`

---

### Test 4b — ST-02: NLP Fallback Flow (Low Confidence Parser)

- **Description:** Simulates handling informal, complex, or unknown formats where the NLP model falls back to Gemini parser with lower confidence.
- **Postman Settings:**
  - **Method:** `POST`
  - **URL:** `http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage`
  - **Headers:** `Content-Type: application/json`
  - **Body (raw JSON):**
    ```json
    {
      "message": {
        "chat": { "id": 12345 },
        "from": { "id": 111222333 },
        "text": "random text xyz",
        "date": 1700000000
      }
    }
    ```
- **PowerShell Command:**
  ```powershell
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage" `
    -ContentType "application/json" `
    -Body '{"message": {"chat": {"id": 12345}, "from": {"id": 111222333}, "text": "random text xyz", "date": 1700000000}}'
  ```
- **Expected Response:** `{"status":"message queued"}`
- **Verification:** Check the `messageLog` and `sales` collections in Firestore. The extraction method should read `"gemini"` and confidence should be `"LOW"`.

---

### Test 4c — ST-03: Tenant Isolation Verification

- **Description:** Ensure agent data and sales records are isolated by tenant, preventing agents or tenants from accessing another tenant's files/records.
- **Verification:**
  1. Log in to the dashboard at **http://localhost:5173/login** using tenant credentials or admin credentials.
  2. Verify that tenant `ALPHA` cannot view sales records or data belonging to tenant `BETA`, nor query documents outside their tenant namespace in Firestore.

---

### Test 4d — ST-04: Admin Creates Tenant

- **Description:** Verify the admin's ability to provision a new tenant.
- **Verification:**
  1. Login to the dashboard as admin (`admin@rmet.com` / `password123`).
  2. Create a new tenant (e.g. `GAMMA`).
  3. Verify that the new tenant document is created inside the `/tenants/` collection in Firestore with the fields: `name`, `email`, `tenantCode`, `status`, `plan`, and `createdBy`.

---

### Test 4e — ST-05: Processing Failure Recovery

- **Description:** Test the system's ability to retry and recover from temporary processing/extraction failures.
- **Verification:**
  1. When a Pub/Sub message processing fails (e.g. due to temporary network issues reaching the NLP API), verify that the state in the `messageLog` document is set to `"failed"` or remains in a state suitable for retry.
  2. Verify that the functions can process the message successfully on subsequent retries once the downstream service is available.

---

### Test 4f — ST-06: Unregistered Agent Graceful Handling

- **Description:** Test the system behavior when a user who is not registered attempts to interact with the bot.
- **Postman Settings:**
  - **Method:** `POST`
  - **URL:** `http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage`
  - **Headers:** `Content-Type: application/json`
  - **Body (raw JSON):**
    ```json
    {
      "message": {
        "chat": { "id": 99999 },
        "from": { "id": 999999999 },
        "text": "sold 5 apples for $10",
        "date": 1700000000
      }
    }
    ```
- **PowerShell Command:**
  ```powershell
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage" `
    -ContentType "application/json" `
    -Body '{"message": {"chat": {"id": 99999}, "from": {"id": 999999999}, "text": "sold 5 apples for $10", "date": 1700000000}}'
  ```
- **Expected Response:** `{"status":"welcome sent"}` _(The system replies with a warning that the agent is not registered)._

---

### Test 4g — ST-07: Invalid Tenant Code During Registration

- **Description:** Attempt to register an agent using an invalid tenant code.
- **Postman Settings:**
  - **Method:** `POST`
  - **URL:** `http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage`
  - **Headers:** `Content-Type: application/json`
  - **Body (raw JSON):**
    ```json
    {
      "message": {
        "chat": { "id": 12345 },
        "from": { "id": 111222333 },
        "text": "/register INVALID_CODE",
        "date": 1700000000
      }
    }
    ```
- **PowerShell Command:**
  ```powershell
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage" `
    -ContentType "application/json" `
    -Body '{"message": {"chat": {"id": 12345}, "from": {"id": 111222333}, "text": "/register INVALID_CODE", "date": 1700000000}}'
  ```
- **Expected Response:** `{"status":"registration processed"}`

---

### Test 4h — ST-08: Date Extraction (Absolute & Relative Dates)

- **Description:** Verify the system's ability to extract date values from messages, including relative words like "yesterday" or absolute dates like "15 Dec 2024".
- **Postman Settings (Relative):**
  - **Method:** `POST`
  - **URL:** `http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage`
  - **Headers:** `Content-Type: application/json`
  - **Body (raw JSON):**
    ```json
    {
      "message": {
        "chat": { "id": 12345 },
        "from": { "id": 111222333 },
        "text": "yesterday sold 3 phones for $150 each",
        "date": 1700000000
      }
    }
    ```
- **Postman Settings (Absolute):**
  - **Method:** `POST`
  - **URL:** `http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage`
  - **Headers:** `Content-Type: application/json`
  - **Body (raw JSON):**
    ```json
    {
      "message": {
        "chat": { "id": 12345 },
        "from": { "id": 111222333 },
        "text": "Dec 15 sold 20 pencils for $2",
        "date": 1700000000
      }
    }
    ```
- **PowerShell Commands:**

  ```powershell
  # Relative Date
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage" `
    -ContentType "application/json" `
    -Body '{"message": {"chat": {"id": 12345}, "from": {"id": 111222333}, "text": "yesterday sold 3 phones for $150 each", "date": 1700000000}}'

  # Absolute Date
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage" `
    -ContentType "application/json" `
    -Body '{"message": {"chat": {"id": 12345}, "from": {"id": 111222333}, "text": "Dec 15 sold 20 pencils for $2", "date": 1700000000}}'
  ```

- **Verification:** Check the created sale entry in Firestore and verify that the `date` field is correctly populated with the appropriate timestamp (yesterday's date or Dec 15).

---

### Test 4i — ST-09: Invalid Data Validation before Storage

- **Description:** Test that invalid data (negative values, empty product names) is caught and rejected before entering Firestore.
- **Postman Settings:**
  - **Method:** `POST`
  - **URL:** `http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage`
  - **Headers:** `Content-Type: application/json`
  - **Body (raw JSON):**
    ```json
    {
      "message": {
        "chat": { "id": 12345 },
        "from": { "id": 111222333 },
        "text": "sold -5 apples for -$10",
        "date": 1700000000
      }
    }
    ```
- **PowerShell Command:**
  ```powershell
  Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5001/sales-analytics-51405/us-central1/receiveTelegramMessage" `
    -ContentType "application/json" `
    -Body '{"message": {"chat": {"id": 12345}, "from": {"id": 111222333}, "text": "sold -5 apples for -$10", "date": 1700000000}}'
  ```
- **Verification:** Verify that the message status changes to `"failed"` or throws an error in the Pub/Sub logs, and no new record is created in the `sales` collection.

---

### Test 4j — ST-10: Duplicate Message Detection

- **Description:** Ensure the system ignores or deduplicates processing if the same message is delivered more than once.
- **Verification:** Verify that the sales document tracks `pubsubMessageId` or that processing does not duplicate entries if the webhook triggers duplicate events for the same message.

---

## 5 · Verify in the Dashboard

1. Navigate to **http://localhost:5173/login**.
2. Sign in using the credentials:
   - **Email:** `admin@rmet.com`
   - **Password:** `password123`
3. View the Admin/Tenant dashboards to check loaded sales charts, leaderboard rankings, and transaction values.
