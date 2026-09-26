# W3SCLOUD Technical Assessment — Demo Video Recording Script

**Candidate:** Md. Nazim Ahmed  
**Position:** Software Engineer | W3SCLOUD  
**Project:** Zoho CRM API Integration (Node.js / TypeScript)  
**Estimated Video Duration:** 4–7 Minutes  
**Tool:** Loom / OBS Studio / Screen Recorder

---

## Pre-Recording Checklist

1. Start the server: `npm run dev` (running at `http://localhost:5000`).
2. Open the following browser tabs:
   - Tab 1: Interactive Dashboard (`http://localhost:5000`)
   - Tab 2: Zoho CRM Leads page (`https://crm.zoho.com/crm/tab/Leads`)
   - Tab 3: Zoho API Console (`https://api-console.zoho.com`)
   - Tab 4: Postman (optional, or use dashboard live response inspector)
3. Open VS Code showing the project structure.
4. **Security Check**: Ensure `.env` is NOT opened or showing real secrets on screen. Open `.env.example` instead.

---

## Video Recording Sequence

### 1. Introduction (0:00 - 0:30)
- **What to say:**
  > "Hello everyone, my name is Md. Nazim Ahmed. This is my submission for the W3SCLOUD Software Engineer technical assessment: Zoho CRM API Integration. I built a production-ready, decoupled backend service using Node.js, TypeScript, Express, Axios, and Zod, complete with OAuth 2.0 authorization-code flow, automatic token refresh, lead CRUD operations, duplicate prevention, and centralized error handling."

---

### 2. Architecture & Project Structure (0:30 - 1:00)
- **What to show:** Show VS Code explorer tree (`src/config`, `src/controllers`, `src/services`, `src/middleware`, `src/validators`, `src/errors`, `src/types`).
- **What to say:**
  > "The codebase follows a clean layered architecture with strict separation of concerns. HTTP routes invoke controllers, which delegate business logic to dedicated services like `LeadService`, `ZohoAuthService`, and `ZohoCrmService`. Request validation is handled using Zod schemas, and errors are centralized through a standardized error middleware."

---

### 3. Environment & Configuration Security (1:00 - 1:20)
- **What to show:** Open `.env.example`.
- **What to say:**
  > "Here is our `.env.example`. Secrets like `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` are never hard-coded or checked into version control. We support dynamic regional endpoints such as `accounts.zoho.com` for US or `accounts.zoho.eu` for Europe. Our structured logger also automatically masks all tokens and secrets in logs."

---

### 4. Zoho API Console Setup (1:20 - 1:45)
- **What to show:** Switch to Zoho API Console tab showing Server-based Application.
- **What to say:**
  > "In the Zoho API Console, we registered a Server-based Application configured with our authorized redirect URI `http://localhost:5000/auth/zoho/callback` and requested scopes including `ZohoCRM.modules.ALL` and `ZohoCRM.settings.ALL`."

---

### 5. OAuth Flow & Access Token Handling (1:45 - 2:30)
- **What to show:** In the dashboard (`http://localhost:5000`), click **Connect Zoho CRM** (or visit `/auth/zoho?redirect=true`).
- **What to say:**
  > "Let's demonstrate the OAuth 2.0 flow. Clicking 'Connect Zoho CRM' redirects to Zoho Accounts with `access_type=offline` and `prompt=consent`. Upon approval, Zoho redirects back to our callback endpoint with an authorization code. Our `ZohoAuthService` exchanges the authorization code for an Access Token and Refresh Token, securely storing them in our tenant-isolated token cache."

---

### 6. Feature #1: Read Data (GET /api/leads) (2:30 - 3:10)
- **What to show:** Click **Refresh List** in the dashboard. Point out the Leads table.
- **What to say:**
  > "Now let's retrieve CRM records. The dashboard queries `GET /api/leads`. As required by the assessment specification, we display the Record ID, Full Name, Email, and additional fields like Company, Phone, and Lead Status with clean pagination metadata."

---

### 7. Feature #2: Create Lead (POST /api/leads) & Zoho CRM Live Verification (3:10 - 4:00)
- **What to show:** Fill out the Create Lead form with `John`, `Smith`, `ABC Ltd`, `john.smith.<timestamp>@example.com`, `+8801700000000`. Click **Create Lead in Zoho**.
- **What to say:**
  > "Now we create a new Lead. Our Zod middleware validates required fields and formats before making any outbound calls. The `LeadService` maps application field names to Zoho API names (`First_Name`, `Last_Name`, `Company`, `Email`, `Phone`) and posts to the Zoho CRM v8 API. The record is created with HTTP 201 Created."
- **Show in Zoho CRM:** Switch to the Zoho CRM Leads tab and refresh. Point to the newly created Lead.

---

### 8. Feature #3: Retrieve Created Record by ID (GET /api/leads/:id) (4:00 - 4:35)
- **What to show:** Point to the Record ID automatically populated in the search box, click **Fetch Record**.
- **What to say:**
  > "We immediately take the returned Zoho Record ID and query `GET /api/leads/:id` to retrieve and verify the exact record directly from Zoho CRM."

---

### 9. Duplicate Prevention (4:35 - 5:10)
- **What to show:** Click the **Test Duplicate Conflict** button (using the same email address just created).
- **What to say:**
  > "To prevent duplicate records, our `LeadService` performs a search on Zoho CRM by email before insertion. Since this email already exists, our API halts the creation and returns an HTTP `409 Conflict` with the existing Record ID and details."

---

### 10. Error Handling & Scope Mismatch Demonstrations (5:10 - 6:00)
- **What to show:** Click the demo buttons in Section 5 of the dashboard:
  - Click **403 OAUTH_SCOPE_MISMATCH**
  - Click **401 OAUTH_INVALID_TOKEN**
  - Click **404 ZOHO_INVALID_MODULE**
  - Click **400 VALIDATION_ERROR**
- **What to say:**
  > "For error handling, our centralized error middleware standardizes all error responses. For example, triggering a scope mismatch returns HTTP 403 with `OAUTH_SCOPE_MISMATCH` and diagnostic instructions on which scopes to grant in the Zoho Console. Invalid tokens return HTTP 401, non-existent modules return 404, and invalid inputs return 400."

---

### 11. Silent Token Refresh Walkthrough (6:00 - 6:30)
- **What to show:** Show `src/services/zoho-crm.service.ts` response interceptor in VS Code.
- **What to say:**
  > "Our `ZohoCrmService` includes an Axios interceptor that automatically intercepts 401/expired token errors, acquires a new access token using the stored refresh token, queues concurrent requests, and retries the original request without requiring the user to re-authorize manually."

---

### 12. Conclusion & Summary (6:30 - 7:00)
- **What to say:**
  > "In summary, all functional and technical requirements from the assessment have been fully implemented, tested with 15 passing automated test cases, and documented. Thank you for your time and review."
