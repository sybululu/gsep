---
name: cloudflare-firebase-admin
description: Troubleshoot and fix Firebase-backed admin/editor features after Cloudflare deployment. Use when quiz management, image upload, Firestore sync, or authentication works locally but fails on Cloudflare Pages/Workers.
---

# Cloudflare Firebase Admin

Follow this skill to diagnose and fix production-only admin failures quickly.

## Quick workflow

1. Reproduce the failing admin action in production (create quiz, upload image, sync data).
2. Capture the exact Firebase error code from browser console/network response.
3. Check Cloudflare + Firebase config with the checklist in `references/deploy-checklist.md`.
4. Patch code/rules with the smallest safe fix.
5. Validate with `npm run -s lint` and `npm run -s build`.
6. Re-test the same production action.

## Error-to-fix mapping

- `permission-denied`
  - Verify Firestore rules and collection path.
  - Verify required auth state (anonymous/user/admin email) matches rules.
- `invalid-argument` or `invalid document reference`
  - Sanitize Firestore document IDs (allow only `[a-zA-Z0-9_-]`, avoid `.` and spaces).
- `auth/unauthorized-domain`
  - Add the Cloudflare production domain in Firebase Auth authorized domains.
- `failed-precondition`
  - Verify Firestore database ID/region and indexes.

## Implementation guardrails

- Keep public read behavior unchanged unless explicitly requested.
- Prefer data-shape compatibility (support old and new image IDs while migrating).
- If changing rules, keep validation constraints and least-privilege access.
- Return user-facing error messages with actionable hints.

## References

- Deployment and runtime checks: `references/deploy-checklist.md`.
