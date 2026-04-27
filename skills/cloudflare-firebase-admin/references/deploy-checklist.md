# Cloudflare + Firebase Admin Troubleshooting Checklist

## 1) Firebase project wiring
- Confirm `firebase-applet-config.json` values match production project.
- Confirm `firestoreDatabaseId` exists and is accessible.
- Confirm environment variables (if any) are present in Cloudflare Pages.

## 2) Auth domain and login flow
- In Firebase Console -> Authentication -> Settings -> Authorized domains:
  - Add `localhost` for dev.
  - Add the Cloudflare production domain.
- If rules require authenticated/admin users, verify sign-in is completed before writes.

## 3) Firestore rules compatibility
- Ensure write rules match real payload shape (`quizVersions`, `images`).
- Ensure document ID validation matches generated IDs.
- If using custom admin email checks, verify exact email and `email_verified` behavior.

## 4) Image upload path
- For base64 uploads, keep payload under rule size limit.
- Generate Firestore-safe image IDs (no dots/spaces/Unicode-only IDs).
- Persist mapping so question references point to the uploaded safe IDs.

## 5) Production validation
- Create quiz version.
- Upload one local image and sync.
- Refresh and verify image can be loaded from Firestore.
- Edit question options/images and sync again.
