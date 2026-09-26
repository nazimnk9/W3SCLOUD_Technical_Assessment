# W3SCLOUD Technical Assessment — Zoho CRM API Integration

![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-blue.svg)
![Express](https://img.shields.io/badge/Express-v4.21-lightgrey.svg)
![Zoho CRM API](https://img.shields.io/badge/Zoho%20CRM%20API-v8-orange.svg)
![Tests](https://img.shields.io/badge/Tests-15%20Passed-brightgreen.svg)

---

## 1. Project Overview

This repository contains the complete, production-grade implementation of the **W3SCLOUD Software Engineer Technical Assessment**. The solution provides a decoupled, modular TypeScript/Node.js backend service that integrates with the official **Zoho CRM API (v8)**.

The system features:
- **Full OAuth 2.0 Authorization-Code Flow** with offline access and automatic background token renewal.
- **Enterprise-grade Token Management** with concurrency handling and multi-tenant isolation.
- **Complete Lead CRUD Operations** (`GET /api/leads`, `POST /api/leads`, `GET /api/leads/:id`).
- **Proactive Duplicate Prevention** utilizing CRM search endpoints before insertion.
- **Centralized Error Handling** with structured JSON formatting and contextual diagnostics.
- **Strict Zod Request Validation** preventing malformed payloads from reaching upstream CRM services.
- **Interactive Developer Web UI** (`public/index.html`) for live demonstrations and testing.

---

## 2. Features

- **OAuth 2.0 Engine**: Authorization code exchange, token persistence cache (`.tokens.json`), and silent token refresh via Axios interceptors.
- **Zoho CRM v8 Integration**: Direct integration with Zoho's latest API v8 endpoints across all global regional data centers (US, EU, IN, AU, JP, CA).
- **Read Leads (Feature #1)**: Paginated lead retrieval displaying Record ID, Full Name, Email, Company, Phone, and Status.
- **Create Lead (Feature #2)**: Lead creation with field mapping (`First_Name`, `Last_Name`, `Company`, `Email`, `Phone`).
- **Retrieve by ID (Feature #3)**: Instant verification and retrieval of created records via Zoho Record ID.
- **Duplicate Prevention**: Email-based pre-insertion search returning `409 Conflict` with existing record metadata.
- **Centralized Error Handling (Feature #5)**: Graceful mapping of Zoho error codes (`OAUTH_SCOPE_MISMATCH`, `INVALID_TOKEN`, `MANDATORY_NOT_FOUND`, `INVALID_MODULE`, `429 Rate Limits`).
- **Security & Secret Redaction**: Structured logger automatically masks tokens, authorization headers, and client secrets.

---

## 3. Tech Stack

- **Runtime**: Node.js (v20+ / v24)
- **Language**: TypeScript (v5.7, ES2022 Target, NodeNext modules)
- **Framework**: Express.js (v4.21)
- **HTTP Client**: Axios (v1.8) with custom interceptors and request queuing
- **Validation**: Zod (v3.24)
- **Environment**: dotenv (v16.4)
- **Testing**: Vitest (v3.0) with unit and integration suites
- **Development Tooling**: `tsx` (TypeScript Execute & Watch)

---

## 4. Architecture

The application adopts a **Layered Architecture** adhering to Separation of Concerns:

```
Client / Dashboard / Postman
            │
            ▼
   [Express Router Layer]  ───>  [Zod Validation Middleware]
            │
            ▼
   [Controller Layer] (HTTP parsing, DTO binding, Status code selection)
            │
            ▼
     [Service Layer] (Business logic, Duplicate checks, DTO mapping)
            │
            ├──> [Zoho Token Store] (Tenant-isolated credentials & cache)
            ├──> [Zoho Auth Service] (OAuth exchange, Refresh requests)
            ▼
   [Zoho CRM Service] (Axios client, Auto-refresh interceptor, Error normalization)
            │
            ▼
     Zoho CRM API v8
```

### Folder Structure
```
├── src/
│   ├── config/              # Environment config (Zod validated) & Structured Logger
│   │   ├── env.config.ts
│   │   └── logger.ts
│   ├── constants/           # HTTP codes, Zoho endpoints, modules, data centers
│   │   ├── http-status.ts
│   │   └── zoho.constants.ts
│   ├── controllers/         # Request handling and response dispatching
│   │   ├── auth.controller.ts
│   │   ├── error-demo.controller.ts
│   │   ├── health.controller.ts
│   │   └── lead.controller.ts
│   ├── errors/              # Custom AppError hierarchy & Error codes
│   │   ├── app-error.ts
│   │   └── error-codes.ts
│   ├── middleware/          # Error handling, Request logging, Zod validation
│   │   ├── error-handler.middleware.ts
│   │   ├── request-logger.middleware.ts
│   │   └── validate.middleware.ts
│   ├── routes/              # Express route definitions
│   │   ├── auth.routes.ts
│   │   ├── demo.routes.ts
│   │   ├── health.routes.ts
│   │   ├── index.ts
│   │   └── lead.routes.ts
│   ├── services/            # Core business & Zoho API communication services
│   │   ├── lead.service.ts
│   │   ├── zoho-auth.service.ts
│   │   ├── zoho-crm.service.ts
│   │   └── zoho-token-store.service.ts
│   ├── types/               # TypeScript interfaces & DTOs
│   │   ├── common.types.ts
│   │   ├── lead.types.ts
│   │   └── zoho.types.ts
│   ├── validators/          # Zod validation schemas
│   │   ├── lead.validator.ts
│   │   └── oauth.validator.ts
│   ├── app.ts               # Express application setup
│   └── server.ts            # Server entry point
├── public/                  # Developer test dashboard UI
│   ├── app.js
│   ├── index.html
│   └── style.css
├── postman/                 # Postman Collection v2.1
│   └── W3SCLOUD_Zoho_CRM_API.postman_collection.json
├── tests/                   # Vitest automated test suite
├── .env.example             # Safe environment template
├── DEMO_SCRIPT.md           # Step-by-step video recording walkthrough
├── INTERVIEW_PREPARATION.md # In-depth technical questions & answers
├── AI_USAGE.md              # AI assistance disclosure
└── ASSESSMENT_CHECKLIST.md  # Complete requirement compliance verification
```

---

## 5. Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Zoho CRM Account**: Free or trial Zoho CRM account
- **Zoho API Console Client**: Server-based Application registered in [Zoho API Console](https://api-console.zoho.com)

---

## 6. Zoho CRM & API Console Setup

1. Log in to [Zoho API Console](https://api-console.zoho.com/).
2. Click **Add Client** and select **Server-based Applications**.
3. Fill in the client details:
   - **Client Name**: `W3SCLOUD CRM Integration`
   - **Homepage URL**: `http://localhost:5000`
   - **Authorized Redirect URIs**: `http://localhost:5000/auth/zoho/callback`
4. Click **Create**.
5. Copy the generated **Client ID** and **Client Secret**.

---

## 7. Required OAuth Scopes

The application requires the following scopes for module access:
- `ZohoCRM.modules.ALL` — Full CRUD permissions on Leads, Contacts, Accounts.
- `ZohoCRM.settings.ALL` — Access to CRM metadata and custom field definitions.
- `ZohoCRM.users.READ` — Access to current user profile for assignment.

---

## 8. Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure the values:

```env
# Server
PORT=5000
NODE_ENV=development
APP_BASE_URL=http://localhost:5000

# Zoho OAuth Credentials
ZOHO_CLIENT_ID=your_client_id_from_zoho_console
ZOHO_CLIENT_SECRET=your_client_secret_from_zoho_console
ZOHO_REDIRECT_URI=http://localhost:5000/auth/zoho/callback

# Regional Endpoints (Adjust based on your Zoho account datacenter)
# US: accounts.zoho.com / www.zohoapis.com
# EU: accounts.zoho.eu / www.zohoapis.eu
# IN: accounts.zoho.in / www.zohoapis.in
# AU: accounts.zoho.com.au / www.zohoapis.com.au
ZOHO_ACCOUNTS_URL=https://accounts.zoho.com
ZOHO_API_BASE_URL=https://www.zohoapis.com

# Optional pre-generated Refresh Token
ZOHO_REFRESH_TOKEN=
```

---

## 9. Installation & Running

### Installation
```bash
npm install
```

### Start in Development Mode (Live Watch)
```bash
npm run dev
```

### Build Production Bundle
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Run Automated Tests
```bash
npm test
```

---

## 10. API Endpoints

### Authentication & OAuth
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/auth/zoho` | Generates or redirects to Zoho OAuth 2.0 authorization screen |
| `GET` | `/auth/zoho/callback` | Exchanges authorization code for access & refresh tokens |
| `GET` | `/auth/status` | Returns active authentication state and token expiration |
| `POST` | `/auth/refresh` | Manually triggers access token renewal using refresh token |

### Leads Operations (CRUD)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/leads` | Retrieves paginated leads (Feature #1) |
| `POST` | `/api/leads` | Creates new lead with duplicate prevention (Feature #2) |
| `GET` | `/api/leads/:id` | Retrieves single lead by Zoho Record ID (Feature #3) |
| `GET` | `/api/leads?searchEmail=:email` | Searches CRM leads by email address |

### Diagnostics & Error Demos
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health and uptime |
| `GET` | `/api/demo/errors/scope-mismatch` | Demonstrates `403 OAUTH_SCOPE_MISMATCH` |
| `GET` | `/api/demo/errors/invalid-token` | Demonstrates `401 OAUTH_INVALID_TOKEN` |
| `GET` | `/api/demo/errors/invalid-module` | Demonstrates `404 ZOHO_INVALID_MODULE` |
| `POST` | `/api/demo/errors/validation-error` | Demonstrates `400 VALIDATION_ERROR` |
| `GET` | `/api/demo/errors/rate-limit` | Demonstrates `429 TOO_MANY_REQUESTS` |

---

## 11. Example Requests & Responses

### 1. Create Lead (POST `/api/leads`)
**Request**:
```http
POST /api/leads HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "company": "ABC Ltd",
  "email": "john.smith@example.com",
  "phone": "+8801700000000",
  "leadStatus": "Not Contacted"
}
```

**Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "Lead successfully created in Zoho CRM with ID: 716492000000382001",
  "data": {
    "lead": {
      "id": "716492000000382001",
      "fullName": "John Smith",
      "firstName": "John",
      "lastName": "Smith",
      "company": "ABC Ltd",
      "email": "john.smith@example.com",
      "phone": "+8801700000000",
      "leadStatus": "Not Contacted",
      "createdAt": "2026-09-26T10:00:00+06:00"
    },
    "zohoRecordId": "716492000000382001"
  }
}
```

---

### 2. Duplicate Lead Conflict (`409 Conflict`)
When attempting to insert a lead with an existing email:

**Response (`409 Conflict`)**:
```json
{
  "success": false,
  "message": "A Lead with email 'john.smith@example.com' already exists in Zoho CRM (ID: 716492000000382001, Name: John Smith).",
  "error": {
    "code": "CONFLICT",
    "details": {
      "existingRecordId": "716492000000382001",
      "existingName": "John Smith",
      "existingCompany": "ABC Ltd",
      "email": "john.smith@example.com"
    }
  }
}
```

---

### 3. Read Leads (GET `/api/leads?page=1&perPage=10`)
**Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Successfully retrieved 1 leads from Zoho CRM",
  "data": [
    {
      "id": "716492000000382001",
      "fullName": "John Smith",
      "firstName": "John",
      "lastName": "Smith",
      "company": "ABC Ltd",
      "email": "john.smith@example.com",
      "phone": "+8801700000000",
      "leadStatus": "Not Contacted"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "moreRecords": false,
    "count": 1
  }
}
```

---

## 12. Token Refresh Strategy

Zoho access tokens expire after **1 hour (3600 seconds)**. The application handles renewal seamlessly:

```
Outgoing API Call
       │
       ▼
[Axios Interceptor] ──> Token Expired or 401 Unauthorized?
       │
       ├─── No  ───> Normal Execution
       │
       └─── Yes ───> Is Refresh Already In Progress?
                         │
                         ├─── Yes ───> Queue request in subscriber queue
                         │
                         └─── No  ───> Acquire Mutex / Set isRefreshing = true
                                           │
                                           ▼
                                 [Zoho Accounts API]
                                 grant_type=refresh_token
                                           │
                                           ▼
                                 Receive fresh Access Token
                                           │
                                           ▼
                                 Save to Token Store & notify subscribers
                                           │
                                           ▼
                                 Retry original failed request (1 time max)
```

**Key Safety Guarantees**:
1. **Loop Prevention**: Marked via `_retry` flag on the Axios config to prevent infinite retry cascades.
2. **Request Queueing**: Simultaneous requests are queued while token renewal is underway to prevent multiple parallel refresh token calls.

---

## 13. OAuth Scope Mismatch Handling

When Zoho returns `401 Unauthorized` / `403 Forbidden` with code `OAUTH_SCOPE_MISMATCH`:
1. The error handler catches the condition and returns a normalized response with code `OAUTH_SCOPE_MISMATCH`.
2. The response includes `documentationHelp` instructing the administrator on which scopes are missing and that a re-authorization consent (`prompt=consent`) must be executed.

---

## 14. Duplicate Prevention Strategy

### Implemented Strategy
1. Prior to insertion, `LeadService` queries Zoho CRM v8 Search API (`GET /crm/v8/Leads/search?email=:email`).
2. If an existing record is returned, the operation halts immediately with HTTP `409 Conflict`, providing the existing record ID.

### Production Considerations & Limitations
- **Email Limitations**: Multiple decision-makers might share generic emails (e.g. `info@company.com`), or a single contact might have multiple active inquiries.
- **Alternative Match Strategies**: In production, composite keys (e.g. `Normalized Phone + Company Name` or `Tax ID / Domain`) should be configurable per tenant business requirements.

---

## 15. Large Data & 200,000 Record Synchronization

To synchronize ~200,000 CRM records reliably:
1. **Pagination & Batching**: Use Zoho CRM Bulk API v2 or paginated API requests (`per_page=200` with cursor/page tokens).
2. **Rate Limit Management**: Zoho CRM enforces dynamic concurrency and credits-per-day limits. Employ a token bucket / rate limiter (e.g. `bottleneck` or BullMQ).
3. **Resumable State & Watermarking**: Store synchronization progress (last synchronized timestamp `Modified_Time` or record cursor) in Redis / PostgreSQL.
4. **Exponential Backoff**: Handle `429 Too Many Requests` with jittered exponential backoff (`delay = min(max_delay, base * 2^attempt + jitter)`).
5. **Dead Letter Queue (DLQ)**: Failed records are persisted to a DLQ table for inspection and selective replaying without restarting the entire sync.

---

## 16. Multi-Tenant / Multi-Client Architecture

To connect multiple independent Zoho customer accounts:
1. **Isolated Token Storage**: Each customer is identified by a unique `tenantId` (UUID). Credentials and OAuth tokens are stored keyed by `tenantId`.
2. **Encryption at Rest**: Refresh tokens are encrypted using AES-256-GCM with keys managed in AWS KMS or HashiCorp Vault.
3. **Tenant Context Propagation**: Tenant context is resolved from JWT auth tokens or subdomain headers and passed through service calls (`zohoCrmService.getRecords(module, params, tenantId)`).
4. **Strict Data Isolation**: No global static token is shared across tenants.

---

## 17. Security Practices

- `.env` and `.tokens.json` are excluded in `.gitignore`.
- Structured logging automatically sanitizes access tokens, refresh tokens, client secrets, and passwords.
- Input validation via Zod rejects malformed payloads and injection attempts.
- CORS policy restricts unauthorized web origins.

---

## 18. Testing

Run all unit and integration test suites:
```bash
npm test
```

Output:
```
Test Files  4 passed (4)
     Tests  15 passed (15)
```

---

## 19. Postman Collection

Import `postman/W3SCLOUD_Zoho_CRM_API.postman_collection.json` into Postman.
The collection contains pre-configured requests, environment variables (`{{baseUrl}}`, `{{leadId}}`, `{{testEmail}}`), and test scripts that automatically capture created Record IDs for subsequent tests.

---

## 20. Candidate Submission Information

- **Candidate**: Md. Nazim Ahmed
- **Position**: Software Engineer
- **Target Company**: W3SCLOUD
- **Technology Stack**: Node.js, TypeScript, Express.js, Axios, Zod, Vitest
