# EduPredict AI — Firebase + Firestore Setup

This edition no longer uses Supabase.

## 1. Create a Firebase project

Open Firebase Console and create a project named something like `EduPredict AI`.

## 2. Add a Web App

Firebase Console → Project settings → General → Your apps → Web → Register app.

Copy the web configuration object into `config.js`.

Use the values for:

- apiKey
- authDomain
- projectId
- storageBucket
- messagingSenderId
- appId

Do not add server/admin SDK credentials to the frontend.

## 3. Enable Authentication

Firebase Console → Authentication → Sign-in method → enable **Email/Password**.

The application provides two login identifiers:

- Email + password
- Phone number + password

The phone-number login is implemented as a username-style alias backed by a private `phone_index` collection. It does **not** send SMS OTPs. This keeps the login flow free on the no-cost Firebase plan. If you need true SMS verification, Firebase Phone Auth is a separate paid/SMS-billed capability.

## 4. Create Firestore

Firebase Console → Firestore Database → Create database.

Choose production mode when possible, then open the Rules tab and paste the contents of `firebase.rules`.

## 5. Firestore collections

The app creates these automatically as users and teachers work:

- users
- students
- phone_index
- academic_records
- predictions
- notifications
- activities
- model_runs
- audit_logs
- image_blobs

## 6. Student images

Firebase Cloud Storage is not used. Student photos are compressed in the browser and stored as a data URL in Firestore documents (`image_blobs`). The application resizes images before saving them to keep documents small.

Keep profile images reasonably small. Firestore documents have a size limit, so the application intentionally compresses uploaded photos.

## 7. Teacher approval

Teacher/HOD/Dean registrations start as `teacher_pending`.

After a trusted administrator verifies the account, update the `users/{uid}` document in Firestore and change:

`role: "teacher"`

or:

`role: "hod"`

or:

`role: "dean"`

The user must sign out and sign in again after approval.

## 8. GitHub Pages

Upload the project files directly to the repository root. No backend folder is required for the frontend.

Keep these frontend files at root:

- index.html
- app.js
- style.css
- config.js
- manifest.webmanifest
- sw.js
- icon.svg

Then enable GitHub Pages from `main` / root.

## 9. Firebase web config is not a secret

The normal Firebase Web SDK config is designed to exist in client applications. Protect data with Firestore Security Rules. Never place service-account JSON, Admin SDK credentials, private keys, or any server secret in this repository.
