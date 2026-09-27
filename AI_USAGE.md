# AI Usage Policy & Disclosure Statement

**Candidate:** Md. Nazim Ahmed  
**Position:** Software Engineer  
**Company:** W3SCLOUD  
**Date:** September 2026

---

## 1. AI Tooling Utilization

In accordance with **Part 4 (AI Usage Policy)** of the W3SCLOUD Technical Assessment specification, this document transparently discloses how AI tools were utilized throughout the development of this project.

- **Primary AI Assistant**: Antigravity / Claude 3.7 / Gemini-powered engineering pair programming assistant.
- **IDE / Environment**: Antigravity Developer Platform / VS Code.

---

## 2. Specific Areas Where AI Assistance Was Leveraged

1. **Zoho CRM API v8 Documentation Synthesis**:
   - Synthesizing official Zoho API v8 request/response formats, token endpoint specifications (`/oauth/v2/token`), and regional data center base URLs.
2. **Architecture & Boilerplate Design**:
   - Reviewing best practices for layered Express/TypeScript architecture (Separation of Routes, Controllers, Services, Middlewares, Types, and Constants).
3. **Axios Token Interceptor Refinement**:
   - Designing the token refresh interceptor to support request queueing and avoid infinite loop retry conditions upon token invalidation.
4. **Zod Validation Schema Construction**:
   - Generating strict type-safe validation schemas for DTO payloads and parameter sanitation.
5. **Automated Vitest Test Case Framing**:
   - Structuring unit test suites for DTO transformations, duplicate conflict detection, and centralized error classification.
6. **Documentation & Ten Technical Questions Solutions**:
   - Structuring comprehensive technical documentation and Part 2 Ten Technical Questions solutions.

---

## 3. Candidate Review, Modifications, and Solutions

As the candidate, I have personally reviewed, verified, executed, tested, and understood 100% of the codebase in this repository. Specifically:

- **Type Safety & Build Fixing**: Resolved TypeScript compilation type constraints in `src/middleware/error-handler.middleware.ts` to ensure clean ES2022/NodeNext builds without `any` regressions.
- **Duplicate Prevention Architecture**: Designed the pre-insertion search strategy via Zoho CRM v8 search criteria and mapped the response to standard HTTP 409 Conflict semantics.
- **Secret Redaction Logic**: Enhanced `src/config/logger.ts` with custom recursive masking to ensure Bearer headers, refresh tokens, and credentials are never leaked into server logs or output streams.
- **Regional Datacenter Flexibility**: Ensured the application dynamically reads Accounts URL and API Base URL from `.env` instead of hardcoding `.com`, allowing instant support for `.eu`, `.in`, and `.com.au` datacenters.
- **End-to-End Verification**: Tested all endpoints, verified unit test suites with 15 passing test cases, and confirmed real CRM CRUD operations.
