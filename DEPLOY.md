# Kairos — deploy & security notes

## Deploy the Firestore security rules (do this!)

The Firebase config in `index.html` (apiKey, projectId, appId) is **not**
secret — it only identifies the project. What actually protects your data is
the **security rules**. Until you deploy them, anyone could read or write your
database.

### Option A — Firebase Console (easiest)
1. Open <https://console.firebase.google.com> → your project
2. **Build → Firestore Database → Rules**
3. Paste the contents of [`firestore.rules`](./firestore.rules)
4. Click **Publish**

### Option B — Firebase CLI
```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

## What the rules enforce
- A signed-in user can read/write **only their own** `users/{uid}` document
  and sub-collections (tasks, goals, show-ups, photos).
- **Duels** are readable by any signed-in user, but a player can only create a
  duel as the host, join an open duel, or update their own duel — not tamper
  with someone else's.
- **Feedback** is write-only (max 2000 chars) and can never be read back.
- Everything else is denied by default.

## The site
`index.html` is a single self-contained page served by GitHub Pages from the
`main` branch. The Buy Me a Coffee QR lives at `coffee-qr.jpg` in the repo root
(the app points at it); replace that file to change the QR.
