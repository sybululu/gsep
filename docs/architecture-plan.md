# GESP Basic Function Review Plan

## Goals

- Review and improve the basic admin data loop first: create question bank, delete question bank, import questions, upload images, save to cloud database, and read back in the public quiz.
- Keep Firebase as the shared cloud database while retaining local fallback data for first load or read failures.
- Keep Cloudflare Pages compatibility: `npm run build` must still output `dist`, use Node 20, and avoid server-only APIs in the browser bundle.
- Treat UI polish as secondary until the basic functions below are reliable.

## Runtime Architecture

```text
Cloudflare Pages
  -> Vite React SPA
      -> src/App.tsx
          -> loads quizVersions from Firestore
          -> falls back to src/data.ts
          -> runs public quiz and score view
          -> opens admin panel after local password gate
      -> src/components/ImageMatcher.tsx
          -> create/delete question banks
          -> edit questions/options/scores/answers
          -> import/export JSON
          -> import plain-text question banks
          -> drag/drop image assignment
          -> sync question bank and images to Firebase
      -> src/components/QuestionImage.tsx
          -> render public filenames directly
          -> render data URLs directly
          -> fetch dynamic images from Firestore
      -> src/utils/parseQuestions.ts
          -> pure text-to-question parser
      -> Firebase
          -> quizVersions collection
          -> images collection
```

## Core Function Checklist

### 1. Read Question Banks

- File path: `src/App.tsx`
- Data source: Firestore collection `quizVersions`.
- Fallback: bundled `src/data.ts`.
- Pass criteria:
  - If Firestore has quiz versions, the selector uses cloud data.
  - If Firestore read fails or is empty, the app still starts from local bundled data.
  - Public users only need read access.

### 2. Create Question Bank

- File path: `src/components/ImageMatcher.tsx`
- Function: `createVersion`
- Cloud write: `setDoc(doc(db, 'quizVersions', newId), newVersion)`
- Pass criteria:
  - Admin password opens the panel.
  - Google sign-in is required before cloud writes.
  - New version is saved to Firestore and immediately appears in the local selector.
  - New version starts with an empty `questions` array and can be edited.

### 3. Delete Question Bank

- File path: `src/components/ImageMatcher.tsx`
- Function: `deleteVersion`
- Cloud writes:
  - `deleteDoc(doc(db, 'quizVersions', selectedVersionId))`
  - related dynamic images are deleted from `images`.
- Pass criteria:
  - At least one question bank is kept.
  - The selected version is removed from Firestore.
  - The admin panel switches to a remaining version.
  - Public static images such as `abc.png` are not deleted from Firestore.

### 4. Add, Edit, And Delete Questions

- File path: `src/components/ImageMatcher.tsx`
- Functions: `addQuestion`, `deleteQuestion`, `updateQuestion`, `updateOption`, `addOption`, `removeOption`
- Pass criteria:
  - Added questions have valid `id`, `type`, `text`, `options`, `answer`, and `score`.
  - Deleted questions are removed from local editor state.
  - Saving writes the edited `questions` list into the current cloud question bank.
  - Answer indexes remain inside the options array after option deletion.

### 5. Import Question Text

- File paths:
  - `src/components/ImageMatcher.tsx`
  - `src/utils/parseQuestions.ts`
- Functions:
  - `handleTextImportSubmit`
  - `parseTextToQuestions`
- Pass criteria:
  - Numbered questions are parsed.
  - A-F options are parsed.
  - Inline answers such as `Answer: A` and Chinese answer labels are parsed.
  - Answer ranges such as `1-3 ABC` are parsed.
  - True/false answers are normalized to two options.
  - Imported questions can either replace the current bank or append to it.
  - Import changes are not cloud data until `saveDataAndFiles` succeeds.

### 6. Import And Export JSON

- File path: `src/components/ImageMatcher.tsx`
- Functions: `handleImportJson`, `handleExportJson`
- Pass criteria:
  - JSON shaped as `{ name, questions }` imports.
  - JSON shaped as `Question[]` imports.
  - Export includes current `id`, `name`, and `questions`.
  - Invalid JSON fails with an alert instead of corrupting editor state.

### 7. Upload And Assign Images

- File paths:
  - `src/components/ImageMatcher.tsx`
  - `src/components/QuestionImage.tsx`
  - `src/App.tsx`
- Functions: `handleDrop`, drag-and-drop board, `saveDataAndFiles`
- Pass criteria:
  - Dragged image files appear in the unassigned image library.
  - Oversized dynamic images are rejected before saving so Firestore document size and rule limits are not exceeded.
  - Dynamic uploaded image IDs use only letters, numbers, `_`, and `-` so they satisfy Firestore Rules.
  - Dragging an image to a question body updates `images`.
  - Dragging images to option slots updates `optionImages`.
  - Public bundled filenames render directly from `/filename.png`.
  - Dynamic uploaded images render from Firestore `images/{imageId}`.

### 8. Save To Cloud Database

- File path: `src/components/ImageMatcher.tsx`
- Function: `saveDataAndFiles`
- Cloud writes:
  - dynamic images to `images`
  - current question bank to `quizVersions`
- Pass criteria:
  - Admin password and Google sign-in are required.
  - Uploaded data URL images are written before the question bank references them.
  - Current `versionName` and all `localQuestions` are saved.
  - Closing and refreshing should load the saved cloud version.

### 9. Public Quiz Flow

- File path: `src/App.tsx`
- Pass criteria:
  - User selects a question bank.
  - User cannot continue or submit without selecting an answer.
  - Result score is computed from the selected cloud/local question bank.
  - Empty question banks show a safe empty state instead of crashing.

## Security And Rules

- `firestore.rules` should allow public read for `quizVersions` and `images`.
- Writes should be limited to the verified admin account.
- The in-app password is only a UI gate. Firestore Rules are the real write boundary.

## Deployment Notes

- Cloudflare Pages:
  - build command: `npm run build`
  - output directory: `dist`
  - Node version: `20`
- Firebase rules are not deployed by Cloudflare. Deploy `firestore.rules` separately.
- GitHub Actions mirrors Cloudflare build checks with `npm ci`, `npm run lint`, and `npm run build`.

## Review Strategy

- First review compile blockers and missing imports.
- Then review admin CRUD and cloud save paths.
- Then review import/parse paths.
- Then review image upload/render paths.
- Finally review Cloudflare deployment compatibility.

## Known Risk Areas

- Firestore Rules must be deployed separately before relying on admin-only writes.
- Base64 images stored in Firestore must stay small enough for document limits and rules limits.
- The admin panel is still large; future refactors should split editor, image board, parser modal, and cloud sync logic.
- Browser automation is currently unreliable in this Windows Codex Desktop session, so manual browser verification is expected.
