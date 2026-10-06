<<<<<<< HEAD
# Enterprise Multi-Tenant Security Gateway


Hybrid authentication (local Bcrypt + Google/GitHub OAuth 2.0), JWT access + refresh-token rotation
(httpOnly cookies), Role-Based Access Control and OWASP hardening.

- **Live app:** `https://YOUR-APP.onrender.com`
- **API base URL:** `https://YOUR-APP.onrender.com/api/v1`
- **Author:** YOUR NAME – YOUR REG NO

## Test credentials

| Role | Email | Password |
|---|---|---|
| SuperAdmin | superadmin@example.com | SuperAdmin@123 |
| Manager | manager@example.com | Manager@123 |
| Employee | employee@example.com | Employee@123 |

(Created by `npm run seed`.)

## Tech stack
Node.js, Express 4, MongoDB (Mongoose), bcryptjs, jsonwebtoken, Passport.js
(Google + GitHub), helmet, cors, express-rate-limit, xss.

## Features
| Requirement | Implementation |
|---|---|
| Password hashing | bcrypt, 12 salt rounds. No plain-text passwords stored. |
| Rate limiting | `express-rate-limit`: max 5 failed logins / 15 min (per IP) |
| Account lockout | 5 failed attempts lock the account for 15 min (HTTP 423) |
| OAuth 2.0 | Google and/or GitHub via Passport.js; profile is created/synced on callback |
| Access token | JWT, 15 min, sent as `Authorization: Bearer` |
| Refresh token | JWT, 7 days, httpOnly + Secure + SameSite=Strict cookie |
| Rotation | `/auth/refresh` revokes the old token and issues a new one. Re-using an old token revokes the whole chain. |
| Revocation | `/auth/logout` revokes the token family and clears the cookie |
| RBAC | `checkRole([...])` middleware, 3 roles |
| Helmet | Secure HTTP headers |
| Strict CORS | Allow-list from `CLIENT_URL`, no wildcard |
| Sanitisation | Strips `$`/`.` keys (NoSQL injection) and escapes HTML (XSS) in body/query/params |

Refresh tokens are stored in the database only as SHA-256 hashes.

## API endpoints

| Method | Route | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public (rate limited) |
| POST | `/api/v1/auth/refresh` | Needs refresh cookie |
| POST | `/api/v1/auth/logout` | Needs refresh cookie |
| GET | `/api/v1/auth/google`, `/auth/github` | Starts OAuth |
| GET | `/api/v1/employee/profile` | SuperAdmin, Manager, Employee |
| POST | `/api/v1/payroll/approve` | Manager, SuperAdmin |
| GET | `/api/v1/users` | SuperAdmin |
| DELETE | `/api/v1/users/:id` | SuperAdmin |

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values (MongoDB Atlas URI, two random JWT secrets).
3. `npm run seed` creates the 3 test users.
4. `npm run dev` then open http://localhost:5000

## OAuth setup

**Google:** Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web).
Authorised redirect URI: `{BASE_URL}/api/v1/auth/google/callback`

**GitHub:** GitHub → Settings → Developer settings → OAuth Apps → New.
Authorization callback URL: `{BASE_URL}/api/v1/auth/github/callback`

Put the Client ID / Secret in `.env` (or the hosting dashboard). Add a callback for both
`http://localhost:5000` and your live URL (Google allows several; for GitHub create two apps).

## Deploy on Render

1. Push this repo to GitHub (public).
2. Render → New → **Web Service** → connect the repo.
3. Build command: `npm install` | Start command: `npm start`
4. Add environment variables: `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `CLIENT_URL` (= your Render URL), `BASE_URL` (= your Render URL), OAuth keys.
5. MongoDB Atlas → Network Access → allow `0.0.0.0/0`.
6. Run `npm run seed` once locally (pointing at the same Atlas DB) to create the test accounts.
7. Update the OAuth callback URLs to the Render domain.

## Viva demo script (Postman)

1. **Login** `POST /auth/login` → copy `accessToken`; see `Set-Cookie: refreshToken; HttpOnly; Secure; SameSite=Strict`.
2. **Refresh rotation** `POST /auth/refresh` → new cookie. Replay the old cookie → 401 "reuse detected".
3. **Rate limit** send 6 wrong-password logins → 6th returns 429.
4. **RBAC rejection** log in as Employee → `POST /payroll/approve` and `DELETE /users/:id` → **403**.
   Manager → payroll OK, delete → 403. SuperAdmin → both OK.
5. **OAuth** click "Login with Google/GitHub" on the home page.


<img width="1127" height="871" alt="file1" src="https://github.com/user-attachments/assets/4c2c1a56-eda0-4a15-8c49-143f322910cf" />
<img width="697" height="550" alt="file2" src="https://github.com/user-attachments/assets/1a464a31-f4df-4b1c-b37a-d1be2fe14e67" />
<img width="1502" height="902" alt="file3" src="https://github.com/user-attachments/assets/1e8fa781-4359-4f6a-9821-606345116902" />




