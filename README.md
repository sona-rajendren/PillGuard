# 💊 PillGuard — Chronic Care Remote Monitoring & Pill Compliance Tracker
**MERNOVA X 2026 · Presidency School of Information Science · MCA Final Year**
Domain: Healthcare & Wellness / AI Productivity

Elderly patients with chronic illness often miss doses and caregivers cannot verify compliance remotely.
PillGuard connects **patients, caregivers and doctors** through one backend, with a **React** clinic dashboard and a **Flutter** mobile app.

## Architecture
```
React (client/)  ─┐
                  ├──►  Express REST API (server/)  ──►  MongoDB (single shared DB)
Flutter (mobile/) ─┘            │
                                └─► AI services: Anthropic API + openFDA label data
```
One API, one database, shared accounts: register on web and sign in on mobile (and vice-versa).

| Role | Web (React) | Mobile (Flutter) |
|---|---|---|
| Doctor | Patient list, adherence trends, glucose/BP charts, thresholds, alerts, **digital prescriptions** | Alert inbox, patient summary |
| Patient | History, charts, link caregiver, interaction checker | **Reminders, blister-photo confirmation, vitals logging, pill ID, interaction checker** |
| Caregiver | Reports & charts | Live compliance status, missed-dose notifications |

## Quick start
Prereqs: Node 18+, MongoDB (local or Atlas), Flutter 3.22+.
```bash
cp .env.example .env            # edit MONGO_URI, JWT_SECRET (and ANTHROPIC_API_KEY for AI)
npm run install-all
npm run seed                    # demo data
npm run server                  # API  → http://localhost:5000
npm run client                  # Web  → http://localhost:5173
cd mobile && ./setup.sh && flutter run     # see mobile/README.md
```
Demo logins (password `password123`): `doctor@demo.com`, `patient@demo.com`, `caregiver@demo.com`.

## Environment variables (`.env.example`)
| Var | Purpose |
|---|---|
| `MONGO_URI`, `JWT_SECRET`, `PORT`, `CLIENT_URL` | Core API config (CLIENT_URL = allowed CORS origin(s), comma-separated) |
| `MISSED_GRACE_MIN` | Minutes after scheduled time before a dose is auto-marked missed (default 30) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Optional. Enables blister verification, pill identifier and plain-language interaction explanations. Without a key the interaction checker falls back to openFDA keyword matching. |
Client: `client/.env` → `VITE_API_URL`. Mobile: `--dart-define=API_URL=...`

## REST API (`/api`)
| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Patients | `GET /patients`, `GET /patients/:id`, `POST /patients/:id/caregivers`, `PUT /patients/:id/thresholds` (doctor) |
| Prescriptions | `GET /prescriptions?patientId=`, `POST` (doctor), `PUT /:id`, `DELETE /:id` — full CRUD, auto interaction screening on create |
| Doses | `GET /doses/today`, `POST /doses/:id/confirm` (multipart `photo`), `POST /doses/:id/skip`, `GET /doses/adherence/:patientId?range=30d` |
| Vitals | `POST /vitals` (patient), `GET /vitals/:patientId?type=&days=` — out-of-range readings create alerts |
| Alerts | `GET /alerts?acknowledged=false`, `PUT /alerts/:id/ack` |
| AI | `POST /ai/identify-pill` (multipart `image`), `POST /ai/interaction-check` |

**Security:** bcrypt hashing, JWT, role middleware (401/403), per-patient access scoping (patients see self, caregivers linked patients, doctors assigned patients), express-validator input validation (422), helmet, rate limiting.
**Background job:** `node-cron` every 5 min generates due doses and marks overdue ones `missed` + creates alerts.

## AI features
1. **Blister-photo confirmation** — photo is sent to a vision model; dose gets `aiVerified` + note.
2. **Pill identifier** — compares the photographed pill to the patient's prescribed drugs and warns on mismatch.
3. **Drug-interaction checker** — grounded in openFDA label text; the LLM only explains it in plain language (reduces hallucination). Always shows a "not medical advice" disclaimer.

## Demo script (proves web ↔ mobile integration)
1. Doctor issues a prescription on **web** → appears in patient's **mobile** Today tab (and a reminder is scheduled).
2. Patient confirms a dose with a blister photo on **mobile** → adherence chart updates on **web**.
3. Patient logs glucose 320 on **mobile** → critical alert appears on doctor's **web** dashboard and caregiver's phone.
4. Show unauthorized call (no token → 401, caregiver issuing a prescription → 403) and validation errors (422).
5. Register on web, sign in on mobile with the same account.

## Repo structure
```
client/   React (Vite) web app        mobile/  Flutter app (lib/, pubspec.yaml)
server/   controllers/ models/ routes/ middleware/ config/ services/ seed.js
README.md  package.json  .env.example
```

## Deployment
API → Render/Railway (root `server`, start `node index.js`, set env vars) · DB → MongoDB Atlas · Web → Vercel/Netlify (`VITE_API_URL`) · Mobile → release APK.

## Future scope
FCM push notifications, SMS/WhatsApp alerts, refill reminders, wearable (Fit/Health) vitals sync, multilingual voice reminders, offline mode.

> Medical disclaimer: PillGuard is an academic project and not a certified medical device.
