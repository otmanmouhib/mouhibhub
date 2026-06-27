# MouhibHub CMS
## Official Documentation
### Version: 0.1.0-alpha
### Date: 2026-06-27
### Classification: Internal + Client Delivery

## Document Control
- Product: MouhibHub CMS Dashboard
- Technical version baseline: 0.1.0 (package version)
- Documentation release label: 0.1.0-alpha
- Main audience:
- Technical leadership (architecture, security, operations)
- Client stakeholders (functional scope, platform structure, workflows)

---

## 1. Executive Summary
MouhibHub CMS is a multi-website administration platform built with Next.js, MongoDB, and role-based access control. The platform centralizes content and operational workflows for multiple websites, while also exposing a dedicated internal management layer for MouhibHub operations.

At this stage (v0.1.0-alpha), the platform includes:
- Secure authentication and admin-only dashboard access
- Multi-site content management for `atlanticdunes` and `adrobiofarm`
- Internal user, contact, and settings management in `mouhibhub`
- Dynamic CRUD APIs for website collections and media
- Registration workflow with approval gate (`pending` role)

---

## 2. Product Scope (Client + Technical)
### 2.1 Business Scope
The platform is intended to:
- Manage website content (products, services, boutique, news, categories, media)
- Handle operational submissions (contacts, reports)
- Manage platform users and authentication policy
- Allow controlled onboarding via registration toggle and approval workflow

### 2.2 Supported Website Databases
- `atlanticdunes`
- `adrobiofarm`
- `mouhibhub` (internal control-plane database)

### 2.3 Current Release Maturity (Alpha)
- Core workflows are implemented and build successfully
- Functional coverage is broad
- Production hardening and compliance controls should continue in later releases

---

## 3. High-Level Architecture
### 3.1 Technology Stack
- Frontend + backend framework: Next.js 16 (App Router)
- UI library: React 18
- Styling: Tailwind CSS
- Runtime language: TypeScript
- Database: MongoDB
- Auth crypto: bcryptjs
- Token auth: jsonwebtoken
- Notification UX: sonner (toast system)

### 3.2 Architecture Pattern
- Monolithic Next.js application using App Router
- API routes under `app/api/**`
- Client dashboard under `app/dashboard/**`
- Multi-database access through shared MongoDB client utilities

### 3.3 Deployment Build Status
- `npm run build` completes successfully for current code state

---

## 4. Environment and Configuration
### 4.1 Required Environment Variables
- `MONGODB_URI`
- `AUTH_SECRET`

### 4.2 Optional/legacy variables referenced in setup narrative
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

### 4.3 Startup commands
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Prod start: `npm run start`
- Seed: `npm run seed`

---

## 5. Website Structure (Information Architecture)

## 5.1 Public-facing app routes
- `/` (homepage)
- `/login`
- `/register` (visibility controlled by admin setting)

## 5.2 Dashboard root routes
- `/dashboard`
- `/dashboard/websites`
- `/dashboard/contacts`
- `/dashboard/users`
- `/dashboard/settings`

## 5.3 Website-specific dashboard routes
Pattern: `/dashboard/websites/[site]/*`

Major pages include:
- `/dashboard/websites/[site]`
- `/dashboard/websites/[site]/[page]`
- `/dashboard/websites/[site]/[page]/new`
- `/dashboard/websites/[site]/[page]/[id]`
- `/dashboard/websites/[site]/contacts`
- `/dashboard/websites/[site]/reports`
- `/dashboard/websites/[site]/users`
- `/dashboard/websites/[site]/manage-poles-domains`
- `/dashboard/websites/[site]/manage-poles-domains/new`
- `/dashboard/websites/[site]/manage-poles-domains/[id]`

## 5.4 Navigation and Orientation
Dashboard navigation includes:
- Global sections (Overview, Contacts, Users, Settings)
- Expandable website tree with page-level shortcuts
- Breadcrumb/orientation support in website scope layouts

---

## 6. Authentication and Authorization Model

## 6.1 Session mechanism
- JWT stored in HTTP-only cookie: `mouhibhub-auth`
- Token payload includes user email
- Token expiration configured to 1 hour

## 6.2 Access policy
- `admin`: full dashboard/API access
- `pending`: blocked from admin login
- Non-admin roles are forbidden from admin-only endpoints

## 6.3 Registration and approval
- Registration endpoint creates accounts with role `pending`
- Registration button visibility is controlled by `settings` document (`_id: 'auth'`)
- Only admin can toggle registration visibility

---

## 7. Database Structure

## 7.1 Database overview
The platform uses three logical databases:
1. `mouhibhub` (identity, internal administration, global controls)
2. `atlanticdunes` (website content and submissions)
3. `adrobiofarm` (website content and submissions)

## 7.2 `mouhibhub` database (control plane)
### Core collections
- `users`
- `settings`
- `contacts` (internal contact submissions)
- optional operations collections depending on runtime usage

### `users` document shape (observed/implemented)
- `_id`
- `email`
- `passwordHash`
- `role` (`admin` or `pending` currently enforced)
- `createdAt`
- `updatedAt`

### `settings` document shape (auth settings)
- `_id: 'auth'`
- `registerEnabled`
- `createdAt`
- `updatedAt`
- `updatedBy`

### `contacts` document shape (implemented CRUD)
- `_id`
- `name`
- `email`
- `message`
- `phone` (optional)
- `status` (e.g. `New`, `In Progress`, `Resolved`)
- `createdAt`
- `updatedAt`
- `createdBy` / `updatedBy` where applicable

## 7.3 Website databases (`atlanticdunes`, `adrobiofarm`)
### Common collection families (availability may vary)
- `contacts`
- `reports`
- `users` (site-level depending on project mode)
- `poles`
- `domains`
- `products`
- `services`
- `boutique` or `boutiqueProducts`
- `boutiqueCategories`
- `news`
- `newsCategories`
- `entrepriseInfo`
- `images` + GridFS structures (`images.files`, `images.chunks`)

### Website contact submissions
The website-specific "manage-contact-submissions" workflows now support full CRUD against each website database.

### Media architecture
Image workflows are implemented through image APIs and GridFS-style collections.

---

## 8. API Structure (Technical Reference)

## 8.1 Auth APIs
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/register`

## 8.2 User APIs
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/[id]`
- `DELETE /api/users/[id]`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `DELETE /api/users/me`

## 8.3 Settings API
- `GET /api/settings/registration`
- `PUT /api/settings/registration`

## 8.4 Contacts APIs
- `GET /api/contacts?db=<database>`
- `POST /api/contacts?db=<database>`
- `PATCH /api/contacts/[id]?db=<database>`
- `DELETE /api/contacts/[id]?db=<database>`

## 8.5 Dashboard aggregate APIs
- `GET /api/dashboard/stats`
- `GET /api/dashboard/websites`
- `GET /api/dashboard/websites/[site]`

## 8.6 Dynamic website content APIs
- `GET /api/[site]`
- `GET|POST|PATCH|DELETE /api/[site]/[collection]`
- `GET|PATCH|DELETE /api/[site]/[collection]/[id]`
- `GET /api/[site]/related/[type]`
- `POST /api/[site]/images`
- `PATCH|DELETE /api/[site]/images/[id]`

## 8.7 Other APIs
- `GET /api/reports`
- `GET /api/images/[id]`

---

## 9. Functional Modules

## 9.1 Internal administration (MouhibHub)
- User management (CRUD + role management)
- Settings management (registration toggle)
- Internal contacts management (CRUD)
- Profile self-management

## 9.2 Website operations
- Website-level contacts management (CRUD)
- Reports visibility and management modules
- Content editing per collection
- Media upload/replace/delete workflows

## 9.3 Content management pages
- Products, services, boutique, news
- Category structures for boutique/news
- Poles/domains relationships
- Enterprise information forms

---

## 10. Security and Data Protection

## 10.1 Authentication controls
- HTTP-only auth cookie
- Token verification on protected API routes
- Login limited to admin role

## 10.2 Authorization controls
- Admin checks implemented for user management endpoints
- Registration control endpoint restricted to admins
- Last-admin safety checks in delete/demotion flows

## 10.3 Password handling
- Passwords are hashed with bcrypt
- Raw passwords are never returned by API responses

## 10.4 Current alpha caveats
- Additional hardening recommended for production:
- CSRF strategy for state-changing endpoints
- Audit logging for sensitive operations
- Rate limiting for auth endpoints
- Session invalidation strategy beyond cookie expiration

---

## 11. Operations Guide

## 11.1 Local development lifecycle
1. Configure `.env.local`
2. Install dependencies
3. Seed initial data if needed
4. Run dev server
5. Validate with production build

## 11.2 Build and release gate
Minimum gate for release candidate:
- `npm run build` successful
- Key admin flows validated manually:
- Login/logout
- User CRUD
- Contact CRUD (global + website-specific)
- Settings toggle for registration

## 11.3 Recommended backup strategy
- Daily dump of `mouhibhub`, `atlanticdunes`, `adrobiofarm`
- Point-in-time backup policy based on MongoDB deployment capabilities
- Restore rehearsal in staging

---

## 12. Client-Facing Functional Explanation

For MouhibHub stakeholders, the platform delivers:
- A secure administration area
- A single place to manage core site content
- Contact and report processing flows
- Controlled user onboarding (register -> pending -> admin approval)
- Visual clarity with structured dashboard navigation and breadcrumbs

Operationally, this reduces manual handling and centralizes data operations by website.

---

## 13. Known Constraints in v0.1.0-alpha
- Alpha phase: feature-complete core, but still evolving in polish/compliance
- Some legacy routes/components exist alongside new consolidated flows
- Documentation should be updated when schema or route contracts change

---

## 14. Recommended Next Milestones (v0.1.x)
1. Add API contract schemas (OpenAPI/Swagger)
2. Add structured audit logs for admin actions
3. Add stronger validation and sanitization layer for all write endpoints
4. Add role expansion model (if non-admin operational roles are needed)
5. Add pagination/search/server-side filtering for large datasets
6. Add monitoring dashboard for API errors and performance

---

## 15. Appendix A - Current Runtime Route Inventory (Build-verified)

### App routes
- `/`
- `/_not-found`
- `/dashboard`
- `/dashboard/atlanticdunes`
- `/dashboard/atlanticdunes/[collection]`
- `/dashboard/atlanticdunes/[collection]/[id]`
- `/dashboard/atlanticdunes/[collection]/new`
- `/dashboard/contacts`
- `/dashboard/settings`
- `/dashboard/users`
- `/dashboard/websites`
- `/dashboard/websites/[site]`
- `/dashboard/websites/[site]/[page]`
- `/dashboard/websites/[site]/[page]/[id]`
- `/dashboard/websites/[site]/[page]/new`
- `/dashboard/websites/[site]/contacts`
- `/dashboard/websites/[site]/manage-poles-domains`
- `/dashboard/websites/[site]/manage-poles-domains/[id]`
- `/dashboard/websites/[site]/manage-poles-domains/new`
- `/dashboard/websites/[site]/reports`
- `/dashboard/websites/[site]/users`
- `/login`
- `/register`

### API routes
- `/api/[site]`
- `/api/[site]/[collection]`
- `/api/[site]/[collection]/[id]`
- `/api/[site]/images`
- `/api/[site]/images/[id]`
- `/api/[site]/related/[type]`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/register`
- `/api/contacts`
- `/api/contacts/[id]`
- `/api/dashboard/stats`
- `/api/dashboard/websites`
- `/api/dashboard/websites/[site]`
- `/api/images/[id]`
- `/api/reports`
- `/api/settings/registration`
- `/api/users`
- `/api/users/[id]`
- `/api/users/me`

---

## 16. Appendix B - Ownership and Usage Notes
- This document is the official baseline for `v0.1.0-alpha` handoff.
- Technical lead should update this document on any API contract, schema, or auth model change.
- Client-facing extracts can be generated from sections 1, 2, 5, 12, and 13.
