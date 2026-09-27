# Part 2 — Ten Technical Questions

**Technical Assessment — Zoho CRM API Integration**  
**Candidate:** Md. Nazim Ahmed | **Position:** Software Developer | **W3SCLOUD**

---

## Q1. OAuth — Explain Client ID, Client Secret, Access Token and Refresh Token, and how they are used in an API integration.

### Core Definitions
- **Client ID**: The unique public identifier assigned to your application when registered in the Zoho API Console. It identifies which application is requesting access on behalf of the user.
- **Client Secret**: A confidential private key known exclusively to your application's backend server and Zoho's authorization server. It authenticates the application during back-channel token exchanges.
- **Access Token**: A short-lived credential (valid for **1 hour / 3600 seconds** in Zoho CRM) included in HTTP request headers (`Authorization: Zoho-oauthtoken <ACCESS_TOKEN>`) to authorize specific API requests against CRM resources.
- **Refresh Token**: A long-lived, reusable credential used to obtain new access tokens programmatically in the background without requiring the user to re-authenticate or re-grant permissions.

### OAuth 2.0 Authorization Code Flow in API Integration

```
User / Browser               Node.js Backend                Zoho OAuth Server
      │                             │                               │
      ├───── 1. /auth/zoho ────────>│                               │
      │<──── 2. Redirect URL ───────┤ (with client_id, scopes)      │
      │                             │                               │
      ├───── 3. User Consent Screen ───────────────────────────────>│
      │<──── 4. Redirect with Auth Code (?code=1000.xxx) ───────────┤
      │                             │                               │
      ├───── 5. /auth/zoho/callback>│                               │
      │                             ├───── 6. POST /oauth/v2/token ─>│
      │                             │  (code, client_id, secret)    │
      │                             │<──── 7. Returns Tokens ───────┤
      │                             │  (access_token, refresh_token)│
      │                             │                               │
      │                             ├─── 8. Persist Refresh Token   │
      │<──── 9. Setup Complete ─────┤                               │
```

1. **Authorization Request**: The user initiates connection via `GET /auth/zoho`. The server redirects the user's browser to Zoho's authorization endpoint:
   `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id={CLIENT_ID}&response_type=code&access_type=offline&redirect_uri={REDIRECT_URI}&prompt=consent`
2. **User Consent**: The user logs in and authorizes the requested CRM scopes.
3. **Authorization Code Grant**: Zoho redirects back to `http://localhost:3000/auth/zoho/callback` with a one-time, short-lived authorization code (`code`).
4. **Token Exchange (Back-Channel)**: The backend securely exchanges the code for tokens via direct HTTP POST:
   `POST https://accounts.zoho.com/oauth/v2/token`
   - Parameters: `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, `code`.
5. **Token Storage & Usage**: Zoho returns both an `access_token` and a `refresh_token`. The backend securely persists the refresh token and attaches the access token to subsequent CRM requests.

### Implementation Reference
- OAuth Controller & URL Generation: [`src/services/zoho-auth.service.ts`](file:///src/services/zoho-auth.service.ts)
- Token Storage Engine: [`src/services/zoho-token-store.service.ts`](file:///src/services/zoho-token-store.service.ts)

---

## Q2. Token Expiration — Your application works today but tomorrow returns an authentication error. What could cause this? How would you avoid asking the user to authorize every time?

### Cause of Error
Zoho CRM access tokens have a fixed validity lifespan of **1 hour (3600 seconds)**. By tomorrow, the access token is expired, causing Zoho API endpoints to reject requests with `401 Unauthorized` (`INVALID_TOKEN`).

### Automated Background Token Refresh Architecture
To completely avoid asking the user to re-authorize every time, the application implements an **Automated Token Refresh Strategy** using the persisted **Refresh Token**.

```
   API Request (GET /api/leads)
               │
               ▼
   [Axios Request Interceptor] ─── Check Token Expiry
               │
               ├─ Token Valid (expiresAt > now + 60s) ──> Attach Header & Send Request
               │
               ▼
   Token Expired or API returns 401 INVALID_TOKEN
               │
               ▼
   [Mutex Lock / Single-Flight Promise] ── (Prevents concurrent duplicate refresh calls)
               │
               ▼
   POST https://accounts.zoho.com/oauth/v2/token
     grant_type=refresh_token
     refresh_token={SAVED_REFRESH_TOKEN}
     client_id={CLIENT_ID}
     client_secret={CLIENT_SECRET}
               │
               ▼
   Receive New Access Token (Valid for 1 Hour)
   Update Token Store (expiresAt = now + 3600s)
               │
               ▼
   Re-execute Original Pending Requests with New Token
```

### Key Implementation Principles
1. **Offline Access Grant**: Initial authorization specifies `access_type=offline` and `prompt=consent` to guarantee issuance of a persistent `refresh_token`.
2. **Proactive & Reactive Refresh**:
   - **Proactive**: In [`ZohoAuthService.getValidAccessToken()`](file:///src/services/zoho-auth.service.ts), token expiration is checked before dispatching requests. If within a 60-second buffer of expiry, a fresh token is fetched preemptively.
   - **Reactive**: In [`ZohoCrmService`](file:///src/services/zoho-crm.service.ts), an Axios response interceptor catches unexpected `401 / INVALID_TOKEN` responses, refreshes the token, and automatically retries the failed request.
3. **Concurrency Lock / Mutex**: If multiple parallel requests trigger token refresh simultaneously, only a single refresh HTTP request is dispatched to Zoho Accounts, while all concurrent requests wait on the shared promise to resolve.

---

## Q3. API Field Names — A CRM field is displayed as "Customer Type" but the API expects "Customer_Type". Why does this matter? How would you find the correct API field name?

### Why This Matters
- **Display Labels vs Database Column Identifiers**: CRM UI labels (e.g. `"Customer Type"`) are human-readable, configurable, and translatable into different languages. However, the database schema and REST API endpoints strictly identify fields by their immutable database column key (`api_name`), typically in `Snake_Case` (e.g., `"Customer_Type"`).
- **Silent Failures & Schema Rejections**: If a request payload uses `"Customer Type"`, Zoho CRM will either silently drop the unrecognized key or return an HTTP `400 BAD_REQUEST` (`INVALID_DATA` / `MANDATORY_NOT_FOUND`).

### Methods to Discover the Correct API Field Name

#### 1. Via Zoho CRM REST API (Metadata API)
Execute a `GET` request to retrieve the full field schema and API names for any CRM module:
```http
GET https://www.zohoapis.com/crm/v8/settings/fields?module=Leads
Authorization: Zoho-oauthtoken {ACCESS_TOKEN}
```
**Sample JSON Response:**
```json
{
  "fields": [
    {
      "field_label": "Customer Type",
      "api_name": "Customer_Type",
      "data_type": "picklist",
      "system_mandatory": false,
      "length": 120
    }
  ]
}
```

#### 2. Via Zoho CRM Web Interface
1. Navigate to **Setup (⚙️ icon) → Customization → Modules and Fields**.
2. Select the target module (e.g., **Leads**).
3. Click the **Fields** tab, hover over the field settings icon (⋮), and select **API Names**.
4. The exact `api_name` required for JSON payloads is displayed.

### Application Mapping Pattern
In this application, DTOs use standardized camelCase (`firstName`, `leadStatus`) and are mapped into Zoho API snake_case keys in [`LeadService`](file:///src/services/lead.service.ts):
```typescript
const zohoPayload = {
  First_Name: dto.firstName,
  Last_Name: dto.lastName,
  Company: dto.company,
  Email: dto.email,
  Phone: dto.phone,
  Lead_Status: dto.leadStatus || 'Not Contacted',
};
```

---

## Q4. Insert Record — Explain how you would insert a Lead using an HTTP API. Cover HTTP method, URL structure, authorization, request body, required fields, and expected response.

### 1. HTTP Method & URL Structure
- **HTTP Method**: `POST`
- **URL**: `https://www.zohoapis.com/crm/v8/Leads` *(or regional domain: `.eu`, `.in`, `.com.au`, `.ca`)*

### 2. HTTP Request Headers
```http
POST /crm/v8/Leads HTTP/1.1
Host: www.zohoapis.com
Authorization: Zoho-oauthtoken 1000.8a9f...e4b2
Content-Type: application/json
Accept: application/json
```

### 3. Required Fields
In Zoho CRM Leads:
- `Last_Name`: Mandatory system field in all standard Zoho CRM installations.
- `Company`: Standard mandatory field for B2B CRM configurations.

### 4. JSON Request Body
```json
{
  "data": [
    {
      "First_Name": "John",
      "Last_Name": "Smith",
      "Company": "ABC Ltd",
      "Email": "john.smith@example.com",
      "Phone": "+8801700000000",
      "Lead_Status": "Not Contacted"
    }
  ],
  "trigger": ["approval", "workflow", "blueprint"]
}
```
*Note: The `trigger` array executes automated CRM workflows, assignment rules, and blueprints upon creation.*

### 5. Expected Success Response (`201 Created` / `200 OK`)
```json
{
  "data": [
    {
      "code": "SUCCESS",
      "details": {
        "id": "716492000000382001",
        "Created_Time": "2026-09-27T10:30:00+06:00",
        "Created_By": {
          "id": "716492000000045001",
          "name": "Md. Nazim Ahmed"
        },
        "Modified_Time": "2026-09-27T10:30:00+06:00",
        "Modified_By": {
          "id": "716492000000045001",
          "name": "Md. Nazim Ahmed"
        }
      },
      "message": "record added",
      "status": "success"
    }
  ]
}
```

### Implementation Reference
- Lead Creation Service: [`LeadService.createLead()`](file:///src/services/lead.service.ts)
- Controller Endpoint: `POST /api/leads` in [`LeadController`](file:///src/controllers/lead.controller.ts)

---

## Q5. GET vs Search — What is the difference between retrieving records and searching records? Give an example of when you would use each.

### Comparison Table

| Attribute | Retrieving Records (`GET /crm/v8/Leads`) | Searching Records (`GET /crm/v8/Leads/search`) |
|---|---|---|
| **Primary Goal** | Bulk listing, table rendering, sequential pagination | Specific record lookup using exact or partial filter criteria |
| **Query Parameters** | `page`, `per_page`, `sort_by`, `sort_order`, `fields` | `criteria`, `email`, `phone`, `word` |
| **Filtering Capability** | No field value filtering; retrieves all records in bulk | Complex conditional expressions (e.g. `(Email:equals:x@y.com)`) |
| **Response on Empty** | Returns HTTP `200 OK` with empty data array `[]` | Returns HTTP `204 No Content` when no matches exist |
| **Performance Profile** | Optimized for sequential table page scans | Optimized for indexed B-tree search queries |

### Practical Examples

#### When to use `GET /crm/v8/Leads` (Retrieval)
- **Use Case**: Populating a paginated dashboard directory (e.g. Step 2 in our frontend) showing 10 or 200 leads per page.
- **Example Request**:
  `GET /crm/v8/Leads?page=1&per_page=10&fields=First_Name,Last_Name,Email,Company,Phone,Lead_Status`

#### When to use `GET /crm/v8/Leads/search` (Search)
- **Use Case**: Real-time pre-flight duplicate checking before creating a new Lead from a contact form submission.
- **Example Request**:
  `GET /crm/v8/Leads/search?criteria=(Email:equals:john.smith@example.com)`

---

## Q6. Duplicate Handling — Your application receives the same customer twice. How would you prevent duplicate CRM records?

### 1. Multi-Layer Duplicate Prevention Architecture

```
Incoming Customer Submission
            │
            ▼
┌───────────────────────────────────────┐
│ Layer 1: Application-Level Validation │ (Normalized Email / Phone Regex Check)
└───────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│ Layer 2: Pre-Flight Search Query      │ GET /crm/v8/Leads/search?email={email}
└───────────────────────────────────────┘
            │
            ├─ Record Exists? ──> Return HTTP 409 Conflict with Existing Record ID
            │
            ▼
┌───────────────────────────────────────┐
│ Layer 3: Atomic Zoho Duplicate Check  │ POST /crm/v8/Leads
│         (duplicate_check_fields)      │ "duplicate_check_fields": ["Email"]
└───────────────────────────────────────┘
            │
            ├─ Duplicate Found ──> Returns DUPLICATE_DATA error code from Zoho
            │
            ▼
┌───────────────────────────────────────┐
│ Layer 4: Record Created Successfully  │ HTTP 201 Created
└───────────────────────────────────────┘
```

### 2. Implementation in this Project
1. **Pre-Flight Lookup**: [`LeadService.createLead()`](file:///src/services/lead.service.ts) executes a search query by email before attempting insertion.
2. **Deterministic Conflict Response**: If an existing record is discovered, the API rejects the request with HTTP `409 Conflict` and details of the existing record:
```json
{
  "success": false,
  "message": "A Lead with email 'john.smith@example.com' already exists in Zoho CRM.",
  "error": {
    "code": "CONFLICT",
    "details": {
      "existingRecordId": "716492000000382001",
      "existingName": "John Smith"
    }
  }
}
```
3. **Zoho Native Duplicate Check**: During `POST /crm/v8/Leads`, our service includes `"duplicate_check_fields": ["Email"]` to enforce atomic deduplication directly on Zoho's database.

### 3. Limitations of Email Matching & Real-World Considerations
- **Shared Inboxes**: Businesses often share `info@company.com` or `sales@company.com` across multiple staff members.
- **Composite Key Matching**: In enterprise production, duplicate resolution should combine composite keys:
  `Normalized Phone (E.164) + Cleaned Company Name + Country Code`.

---

## Q7. Error Handling — The API returns HTTP 401 / OAUTH_SCOPE_MISMATCH. What does it mean? How would you investigate and fix it?

### Meaning of `OAUTH_SCOPE_MISMATCH`
`OAUTH_SCOPE_MISMATCH` indicates that the access token provided in the `Authorization` header is cryptographically valid, but **was not granted sufficient permissions (OAuth scopes)** to execute the requested operation on that module (e.g. attempting to create a Lead when the token only has `ZohoCRM.users.READ`).

### Step-by-Step Investigation & Resolution

```
1. Identify Endpoint Requirement
   ├── Target: POST /crm/v8/Leads
   └── Required Scope: ZohoCRM.modules.ALL or ZohoCRM.modules.leads.CREATE
            │
            ▼
2. Inspect Registered Scopes
   └── Check .env -> ZOHO_SCOPES
            │
            ▼
3. Re-Trigger Authorization Consent
   └── Access GET /auth/zoho?prompt=consent
            │
            ▼
4. Grant Permissions in Zoho OAuth Dialog
   └── Admin approves Lead module access
            │
            ▼
5. Exchange New Auth Code for Fresh Refresh Token
   └── Persist updated token with required scope set
```

1. **Investigate**: Check which API endpoint produced the error and determine the required scope from Zoho CRM API documentation.
2. **Update Scope Configuration**: Ensure [`.env`](file:///c:/Users/shahr/OneDrive/Documents/GitHub/W3SCLOUD_Technical_Assessment/.env) contains:
   `ZOHO_SCOPES=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL`
3. **Re-Authorize**: Navigate to `http://localhost:3000/auth/zoho` (which forces `prompt=consent`).
4. **Exchange Code**: Complete the consent flow so a new `refresh_token` with the complete scope set is saved in `TokenStore`.

---

## Q8. Production Architecture — A Node.js application connects to multiple clients' CRM accounts. How would you store OAuth credentials securely and keep each customer's data isolated?

### Architecture Diagram

```
Tenant A (Org 1) ──┐
                   ├─► [API Gateway / JWT Auth]
Tenant B (Org 2) ──┘        │
                            ├─► Extracts tenant_id from validated JWT
                            │
                            ▼
               [Tenant Context Interceptor]
                            │
                            ├─► Resolves Tenant-Specific Credentials
                            │
                            ▼
     ┌─────────────────────────────────────────────────────────┐
     │  Multi-Tenant Encrypted Credential Store (PostgreSQL)  │
     │  Key: tenant_id                                         │
     │  - encrypted_refresh_token (AES-256-GCM via AWS KMS)   │
     │  - encrypted_client_secret                              │
     │  - custom_api_domain (e.g. .com, .eu, .in)              │
     └─────────────────────────────────────────────────────────┘
                            │
                            ▼
           [Tenant-Scoped ZohoCrmService Instance]
           Header: Authorization: Zoho-oauthtoken {tenant_token}
```

### Security & Isolation Principles
1. **Tenant Context Middleware**: Every incoming request must provide a verified JWT. The middleware extracts the `tenant_id` and sets it in AsyncLocalStorage request context.
2. **Encryption at Rest (AES-256-GCM + Envelope Encryption)**: Refresh tokens and client secrets are encrypted before storing in the database using AWS KMS or HashiCorp Vault. Master encryption keys are never stored in the database.
3. **Row-Level Security (RLS)**: Database tables enforce PostgreSQL RLS policies ensuring database queries for Tenant A can never read Tenant B's tokens or cached leads.
4. **Multi-Tenant Token Store Implementation**: Our token store ([`ZohoTokenStore`](file:///src/services/zoho-token-store.service.ts)) natively supports `tenantId` parameters (`saveTokens(tokens, tenantId)`, `getTokens(tenantId)`).

---

## Q9. Large Data — A client needs 200,000 CRM records synchronized with an external system. Explain pagination, batching, rate limits, retries, failed records, logging, and resume/retry design.

### End-to-End Synchronization Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Strategy 1: Zoho Bulk Read API v2              │
│  1. Initiate Bulk Export Job ──> 2. Zoho generates CSV ──> 3. Stream   │
│  (Consumes only 1 API call for 200,000 records; highly recommended)    │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                        Strategy 2: Batch Paginated Worker Queue        │
│                                                                        │
│  [Sync Manager / Scheduler]                                            │
│        │                                                               │
│        ├── Reads last checkpoint: { last_synced_time, page_token }     │
│        └── Dispatches batch jobs (200 records per page) to Redis Queue │
│                                                                        │
│  [Distributed Worker Pool (BullMQ)]                                    │
│        ├── Rate Limiter: Max 10 requests / second                      │
│        ├── Upserts records in chunks of 500 to destination DB          │
│        ├── On 429 / 503: Exponential Backoff with Jitter               │
│        ├── On Record Failure: Route to Dead Letter Queue (DLQ)         │
│        └── On Page Success: Update Watermark Checkpoint                │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Component Breakdown
1. **Bulk API vs Paginated REST**:
   - **Zoho Bulk Read API**: Best approach for 200k records. Exports compressed CSV files in bulk without consuming thousands of API credits.
   - **Paginated REST API**: If real-time sync is required, use `per_page=200` with cursor-based pagination (`page_token`).
2. **Rate Limiting & Concurrency**:
   - Zoho enforces strict concurrency limits (e.g. 10 simultaneous requests). Use a distributed token bucket limiter (e.g., Redis `bottleneck` or BullMQ rate-limiter set to 5–8 req/sec).
3. **Resumable State / Watermarking**:
   - Persist state checkpoints: `last_synced_modified_time` and `page_cursor`. If the job crashes at record 140,000, it resumes from the recorded cursor without re-syncing the previous 139,999 records.
4. **Exponential Backoff & Retries**:
   - For transient errors (`429 Rate Limit`, `502 Bad Gateway`, `503 Service Unavailable`), retry with jittered backoff:
     `delay = min(30000, 1000 * 2^attempt + random(100, 500))`
5. **Dead Letter Queue (DLQ) & Failed Records**:
   - Records failing validation or database constraints are routed to a `sync_failed_records` table with the raw payload, error message, and timestamp for manual review or automatic replay.
6. **Structured Audit Logging**:
   - Log batch progress metrics (processed count, throughput, duration) with sensitive PII scrubbed.

---

## Q10. W3SCLOUD Scenario — Design External Website → Node.js API → Zoho CRM for this payload: `{ name: 'John Smith', email: 'john@example.com', company: 'ABC Ltd', phone: '+8801XXXXXXXXX' }`.

### 1. End-to-End Pipeline Architecture

```
[External Website Form]
         │ (HTTPS POST /api/v1/webhooks/leads)
         ▼
[Node.js / Express Ingestion Gateway]
         │
         ├── 1. Rate Limiting (express-rate-limit: max 20 req/min per IP)
         ├── 2. Security (CORS, Helmet, HMAC SHA-256 Signature Verification)
         ├── 3. Zod Payload Validation (Schema & Type checking)
         ├── 4. Name Normalization ('John Smith' -> firstName: 'John', lastName: 'Smith')
         │
         ▼
[Message Queue (Redis / BullMQ)] ──> Fast Response: HTTP 202 Accepted
         │
         ▼
[Background Worker Consumer]
         │
         ├── 5. Idempotency & Duplicate Check (Zoho search by Email & Phone)
         ├── 6. Field Mapping (CamelCase -> Zoho API Field Names)
         ├── 7. Execute POST /crm/v8/Leads via ZohoCrmService
         ├── 8. Outage / 502 Handling (Auto-retry with exponential backoff)
         └── 9. Structured Audit Logging & Metrics
```

### 2. Implementation Specifications

#### Step 1: Payload Validation & Name Splitting (Zod Schema)
```typescript
import { z } from 'zod';

export const WebhookLeadSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: z.string().trim().email('Invalid email address'),
  company: z.string().trim().min(1, 'Company is required'),
  phone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
});

// Helper to split full name into First & Last Name for Zoho CRM
export function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: '', lastName: parts[0] };
  }
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}
```

#### Step 2: Field Mapping
```typescript
const { firstName, lastName } = splitFullName(validatedBody.name);

const zohoPayload = {
  data: [
    {
      First_Name: firstName,
      Last_Name: lastName,
      Company: validatedBody.company,
      Email: validatedBody.email,
      Phone: validatedBody.phone,
      Lead_Source: 'External Website',
      Lead_Status: 'Not Contacted',
    }
  ],
  duplicate_check_fields: ['Email'],
  trigger: ['workflow', 'approval']
};
```

#### Step 3: Outage Handling & Production Readiness
- **Asynchronous Decoupling**: The Node.js API enqueues the payload into BullMQ and immediately returns HTTP `202 Accepted` to the website. If Zoho CRM is down or returning `502 Bad Gateway`, website visitors experience zero delay or errors.
- **Guaranteed Delivery**: BullMQ workers retry failed jobs up to 5 times using exponential backoff before routing to the Dead Letter Queue.
- **Observability**: Structured JSON logs record execution timing, status codes, and job IDs.
