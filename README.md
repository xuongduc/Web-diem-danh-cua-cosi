# Attendance Management System

<p align="center">
  A lightweight attendance and lesson-tracking application built with React, Firebase, and Tailwind CSS.
</p>

<p align="center">
  <strong>English</strong> · <a href="./README.vi.md">Tiếng Việt</a>
</p>

## Overview

Attendance Management System helps tutors and students record lessons, review attendance history, and manage class records. Students check in with a lesson summary; administrators can review student histories, add past lessons individually or in bulk, and correct records.

> **Project status:** Suitable for a small tutoring workflow. Review the security and operational notes below before using it with real student data.

## Features

| Student | Administrator |
| --- | --- |
| Sign in with Google via Firebase Authentication | View the student directory and overall attendance totals |
| Create a student profile during registration | Search students by name or email |
| Check in with a lesson description | View each student's full lesson history |
| Have check-in time recorded by Firebase | Filter attendance by month and enter any year |
| View attendance history and monthly counts | Add a lesson with a chosen date and time |
| See an overall lesson count derived from attendance records | Import multiple lessons from a JSON array |
| | Delete individual lesson records |
| | Delete a student's Firestore profile and attendance records (if enabled in the deployed Admin dashboard and rules) |

**Counting behavior:** The overall lesson count is the number of records in the `attendance` collection for the student. The monthly count includes only records in the selected month and year. The legacy `users.totalSessions` field is not used for these displayed totals.

**Data updates:** The current dashboards fetch Firestore records when loaded and after actions; they do **not** provide continuous real-time listeners.

## Tech stack

- **Frontend:** React, Vite, Tailwind CSS
- **Authentication:** Firebase Authentication (Google sign-in)
- **Database:** Cloud Firestore
- **Hosting:** Vercel (recommended)

## Project structure

```text
Web-diem-danh-cua-cosi/
├── .env.local              # Local environment variables (not committed)
├── .gitignore
├── README.md               # English
├── README.vi.md            # Tiếng Việt
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/                 # Optional static assets
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    ├── config/
    │   └── firebase.js
    └── components/
        ├── AdminDashboard.jsx
        ├── Login.jsx
        └── StudentDashboard.jsx
```

The tree shows the expected application layout; optional files/folders may differ in your checkout.

## Prerequisites

- Node.js and npm compatible with the project's `package.json`
- A Firebase project with **Authentication** and **Cloud Firestore** enabled
- Google as an enabled sign-in provider in Firebase Authentication
- A Vercel account for deployment (optional for local development)

## Getting started

### 1. Clone and install

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
npm install
```

### 2. Configure Firebase

Create `.env.local` in the project root:

```dotenv
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_EMAIL=your-verified-admin@example.com
```

Copy the web-app configuration values from **Firebase Console → Project settings → Your apps**. The `VITE_ADMIN_EMAIL` value controls the administrator view in the frontend; it must correspond to the independently authorized administrator in your **Firestore Security Rules**.

> Vite embeds `VITE_*` variables into browser-delivered JavaScript. **Never put a service-account JSON, private key, password, or other server secret in a `VITE_*` variable.** Keep `.env.local` out of Git.

### 3. Configure authentication and Firestore rules

1. In **Firebase Console → Authentication → Sign-in method**, enable Google sign-in.
2. Create a Cloud Firestore database.
3. Publish appropriate **Firestore Security Rules** before sharing the application. Rules should enforce the following:
   - Users can create only their own student profile, without choosing an admin role.
   - Students can read only their own profile and attendance records.
   - Student check-ins use `serverTimestamp()` and are validated against `request.time`; students cannot choose a historical timestamp.
   - Only authorized administrators can list students and add/delete attendance records for others.
   - If administrator profile deletion is enabled, restrict that operation to administrators.
4. Make sure the administrator's Firebase Authentication email is verified if your rules require `email_verified`.

**Important:** Client-side email checks are only UI controls, not security boundaries. Firestore rules must authorize all privileged operations. A student's `users.totalSessions` must not be writable by students.

### 4. Run locally

```bash
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

## Bulk lesson import

From **Admin Dashboard → Select a student → Import JSON**, paste an array of lesson objects:

```json
[
  {
    "date": "2026-10-01",
    "time": "09:00",
    "lessonContent": "Introduction to stacks and queues"
  },
  {
    "date": "2026-10-03",
    "lessonContent": "Practice exercises"
  }
]
```

- `date` is required and uses `YYYY-MM-DD`.
- `time` is optional and uses `HH:mm`; the default is `09:00` in the current Admin interface.
- `lessonContent` is required (1–2,000 characters).
- The current import interface supports up to **400 lessons per batch**.
- **Imports do not automatically deduplicate records.** Check existing history before importing the same data again.
- Dates/times for imported lessons are interpreted in the browser's local timezone.

## Deploy to Vercel

1. Push the source code to a Git repository. Do **not** commit `.env.local`.
2. In [Vercel](https://vercel.com/), choose **Add New Project** and import the repository.
3. Use the Vite configuration detected from `package.json` (commonly build command `npm run build` and output directory `dist`).
4. Under **Project → Settings → Environment Variables**, add the same `VITE_*` variables as in `.env.local` for the appropriate deployment environment.
5. Deploy or redeploy after changing build-time environment variables.
6. In **Firebase Console → Authentication → Settings → Authorized domains**, add your exact Vercel hostname (without `https://`), e.g. `your-project.vercel.app`, to support Google sign-in.
7. Test both student and admin accounts on the deployed site.

For SPA deep links, configure Vercel rewrites if your routing setup needs them; the current dashboard structure may not require any custom rewrite.

## Firestore data model

### `users/{uid}`

```json
{
  "name": "Example Student",
  "email": "student@example.com",
  "role": "student",
  "totalSessions": 0
}
```

`totalSessions` may remain in older records for compatibility, but the current UI derives counts from attendance records.

### `attendance/{autoId}`

```text
uid: "firebase-auth-uid"
timestamp: Firestore Timestamp
lessonContent: "Practiced stacks and queues"
```

Student check-ins should use Firebase server time. Administrators may set a valid historical time for a lesson. The UI also supports older attendance records whose timestamps were stored as ISO strings.

## Security and operational considerations

- **Never use open test-mode Firestore rules in production.** Firebase web configuration is public; rules protect the data.
- **Admin authorization:** the frontend reads `VITE_ADMIN_EMAIL`, but Firestore rules must separately verify the authenticated admin. For stronger management, consider Firebase Authentication custom claims set from a trusted server.
- **Account deletion:** deleting a student document and attendance records from Firestore does **not** delete their Firebase Authentication account. Deleting Auth users requires a trusted backend/Admin SDK workflow.
- **Check-in integrity:** recording a server timestamp prevents students from choosing the timestamp, but by itself does **not** stop repeated check-ins. Add server-side validation and a deduplication policy if you need exactly one check-in per day/session.
- **Destructive actions:** back up Firestore records before bulk imports or deletion. Bulk deletion may be limited by Firestore batch sizes and the current UI implementation.
- **Read scalability:** the current Admin dashboard loads attendance data to calculate totals. Consider pagination, filtered queries, or server-maintained aggregates for larger datasets.
- **Environment variables:** `VITE_*` settings are public at runtime; keep true secrets on a trusted server, never in React.

## License

No license has been specified for this repository. Add a `LICENSE` file if you intend to grant reuse rights.
