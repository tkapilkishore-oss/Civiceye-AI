# Configuring Cloud Firestore for CivicEye AI

CivicEye AI is designed with a **Dual-Sync Database Architecture**. 
* **Offline Fallback (Active)**: If no environment variables are defined in `.env.local`, the application automatically caches all report coordinates, priority calculations, and AI notices locally using browser `localStorage`. This guarantees a fully interactive demo out-of-the-box.
* **Production Sync**: When configuration variables are set up, client pages and server endpoints will write and stream data directly from a live Google Cloud Firestore database instance.

To set up a live Firestore database, follow the instructions below:

---

## 1. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project** (or link your existing Google Cloud Project).
2. Navigate to **Firestore Database** in the sidebar and click **Create Database**. Set the rules to test mode or configure write permissions.
3. Register a web application:
   - Go to **Project Settings** > **General**.
   - Scroll down to **Your apps** and click the **Web icon** (`</>`).
   - Copy the `firebaseConfig` object variables.

---

## 2. Server-side Admin Credentials

To allow Next.js server-side API routes to securely write reports directly to Firestore without exposing administrative keys:

1. In the Firebase Console, go to **Project Settings** > **Service accounts**.
2. Click **Generate new private key** (this downloads a `.json` key file).
3. Extract the following values:
   - `project_id`
   - `client_email`
   - `private-key`

---

## 3. Configure `.env.local`

Append these variables to your `/Users/tkapilkishore/Desktop/CivicAI/.env.local` file:

```env
# Firebase Client SDK Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK Configuration (Server-Only)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_contents\n-----END PRIVATE KEY-----\n"
```

> **Note**: Make sure to replace any newline characters in your private key with `\n` and enclose the string in quotes.

Once saved, restart your Next.js server using `npm run dev`. The console will display a connection confirmation instead of the credentials warning.
