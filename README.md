# GESP Quiz Practice

This is a lightweight Vite + React quiz site for GESP practice.

The app is intentionally frontend-only:

- Cloudflare Pages hosts the static React app.
- Firebase Firestore stores quiz banks and uploaded image data.
- The public quiz reads from Firestore and falls back to bundled local data.
- The admin panel writes to Firestore through the Firebase browser SDK.
- Firestore Rules are the real cloud write permission boundary.

## Local Development

```bash
npm install
npm run dev
```

The dev server defaults to `http://localhost:3000`.

## Cloudflare Pages

Use these settings:

```text
Build command: npm run build
Output directory: dist
Node version: 20
```

The repository includes `.node-version` and a GitHub Actions build check using Node 20.

## Firebase

Firebase configuration is loaded from `firebase-applet-config.json`.

Cloud data lives in:

- `quizVersions`
- `images`

Deploy `firestore.rules` separately from Cloudflare Pages. Cloudflare only deploys the static frontend.

## Admin Flow

The home page admin button opens the question-bank manager.

- Local panel password: `5834`
- Cloud writes require Google sign-in.
- The default admin email in `firestore.rules` is `candiescot@gmail.com`.

To change the admin account, update `isAdmin()` in `firestore.rules` and redeploy the rules.

## Basic Function Checklist

The current review focus is documented in `docs/architecture-plan.md`:

- read question banks
- create/delete question banks
- add/edit/delete questions
- import plain-text questions
- import/export JSON
- upload and assign images
- save to Firestore
- run the public quiz from saved data

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
npm run clean
```
