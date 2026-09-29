# EduPredict AI — Premium Dual Portal (Firebase + Firestore)

This build keeps the premium glassmorphism UI while replacing Supabase with Firebase Authentication + Cloud Firestore.

## Login

Both Student and Teacher portals support:

- Email + password
- Phone number + password

Phone login is implemented without SMS: a hashed phone index resolves the account's real Firebase email before signing in. This avoids paid SMS verification and works on the Firebase no-cost plan.

## Data layer

Cloud Firestore stores:

- users
- students
- academic_records
- predictions
- notifications
- activities
- model_runs
- audit_logs
- phone_index
- image_blobs

Student photos are compressed and saved in Firestore rather than Firebase Storage, because Firebase Cloud Storage requires the pay-as-you-go Blaze plan for access to Storage buckets. The app therefore remains suitable for the Firebase no-cost plan, within Firestore limits.

## Security

Firestore Security Rules are included in `firebase.rules`.

Students can update their own profile, read their own performance/prediction/notifications, and cannot write teacher predictions.

Teacher/HOD/Dean accounts begin as `teacher_pending` and must be approved before the teacher workspace becomes available.

## Setup

Read `FIREBASE_SETUP.md` and replace the placeholder values in `config.js` with your Firebase Web App config.

## AI / ML

The UI contains a transparent baseline prediction so the project works without a paid AI key. The included optional Python service (`main.py`) compares Linear Regression, Decision Tree and Random Forest on a historical CSV dataset.

## PWA

The project includes `manifest.webmanifest` and `sw.js` so supported browsers can offer Install App / Add to Home Screen.


## Firestore security compatibility fix

This build uses direct document reads/writes for self-scoped profile records. That is required because Firestore Security Rules treat a collection query/list operation differently from a direct document get; students should not need collection-wide list permission to read/update their own profile.
