# MBHUB CMS Dashboard

A modern Next.js dashboard for MBHUB CMS with:

- Mobile-first responsive design
- Login system with secure token cookie
- MongoDB integration for contact submissions
- Support for retrieving `contacts` from `atlanticdunes`, `adrobiofarm`, and `mouhibhub` databases

## Setup

1. Copy `.env.example` to `.env.local`
2. Update `MONGODB_URI`, `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`
3. Install dependencies:

```bash
npm install
```

4. Run development server:

```bash
npm run dev
```

5. Seed sample contact data and the initial admin user:

```bash
npm run seed
```

6. Open http://localhost:3000

## Development login

The seed script creates the admin user in the `mouhibhub` database:

- `admin@mnhub.com`
- `ChangeMe123!`
