# Atomic Habits Tracker

A personal habit tracker built on the principles of *Atomic Habits* by James Clear.
Syncs in real-time across all your devices via Firebase Firestore.

## Features

- ✅ **Daily check-ins** — check off habits for today, browse past 7 days
- 🔥 **Streaks** — never miss twice; live streak badge per habit
- 📏 **Measurements** — track km, mins, pages, reps with a daily goal bar
- 📆 **90-day calendar heatmap** — see your consistency at a glance
- 📊 **Progress charts** — bar charts for measured habits over 7/30/90 days
- 🎯 **Identity reminders** — each habit shows your "I am…" statement
- ✕ **Good + bad habits** — build streaks for avoiding bad habits too
- 🔑 **Google Sign-in** — data syncs across laptop, phone, tablet, free forever

---

## Setup (10 minutes)

### 1. Clone and install

```bash
git clone <your-repo>
cd atomic-habit-tracker
npm install
```

### 2. Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → Continue (disable Google Analytics if you like)
3. Once created, click the **Web** icon (`</>`) to register a web app
4. Give the app a nickname (e.g. "habit-tracker") → click **Register app**
5. Copy the `firebaseConfig` object shown on screen — you'll need it in Step 4

### 3. Enable Authentication

1. In Firebase Console → **Build → Authentication → Get started**
2. Click **Sign-in method** tab
3. Enable **Email/Password** — click the pencil → toggle the first switch → Save
4. Leave "Email link (passwordless)" disabled unless you want it

### 4. Add your Firebase credentials

Open `src/firebase.js` and replace every placeholder value:

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project-id.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
}
```

### 5. Enable Firestore

1. In Firebase Console → **Build → Firestore Database → Create database**
2. Start in **production mode** (we'll add rules in the next step)
3. Choose a region close to you → Enable

### 6. Set Firestore security rules

In Firebase Console → **Firestore → Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click **Publish**.

This means each user can only read/write their own data.

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deploy to Vercel (free, works on mobile + laptop)

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
# Follow prompts: link to your Vercel account, accept defaults
# → Your app is live at https://your-app-name.vercel.app
```

### Option B — GitHub + Vercel dashboard

1. Push this folder to a GitHub repo
2. Go to [https://vercel.com](https://vercel.com) → New Project → Import your repo
3. Leave all settings as defaults → Deploy
4. Done — Vercel auto-deploys on every git push

### Add your domain (optional, still free)

In Vercel dashboard → your project → Settings → Domains → Add your domain.

---

## Data structure (Firestore)

```
users/
  {uid}/
    habits/
      {habitId}:
        name, type (good|bad), emoji, identity,
        isMeasured, unit, goal, cue, reward, createdAt
    logs/
      {habitId}_{YYYY-MM-DD}:
        habitId, date, done (bool), value (number|null), updatedAt
    profile/
      main:
        identity (string)
```

---

## Customisation tips

- **Add more emoji options** — edit `EMOJI_OPTIONS` in `src/components/HabitModal.jsx`
- **Change streak colour** — edit `--streak` in `src/index.css`
- **Identity in sidebar** — currently hardcoded. To make it dynamic, load from Firestore
  profile in `App.jsx` and pass it as a prop to the sidebar.

---

## Free tier limits (Firebase Spark plan)

| Resource         | Free limit per month |
|------------------|---------------------|
| Firestore reads  | 50,000 / day        |
| Firestore writes | 20,000 / day        |
| Storage          | 1 GiB               |
| Auth             | Unlimited           |

For a personal habit tracker, you will never come close to these limits.
