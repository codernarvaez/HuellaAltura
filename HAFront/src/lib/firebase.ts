import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Configura ${name} en HAFront/.env`);
  }
  return value;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.PUBLIC_FIREBASE_API_KEY &&
      import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.PUBLIC_FIREBASE_PROJECT_ID &&
      import.meta.env.PUBLIC_FIREBASE_APP_ID,
  );
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function getFirebaseAuth(): Auth {
  if (auth) return auth;

  app = initializeApp({
    apiKey: requireEnv("PUBLIC_FIREBASE_API_KEY", import.meta.env.PUBLIC_FIREBASE_API_KEY),
    authDomain: requireEnv(
      "PUBLIC_FIREBASE_AUTH_DOMAIN",
      import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    ),
    projectId: requireEnv("PUBLIC_FIREBASE_PROJECT_ID", import.meta.env.PUBLIC_FIREBASE_PROJECT_ID),
    appId: requireEnv("PUBLIC_FIREBASE_APP_ID", import.meta.env.PUBLIC_FIREBASE_APP_ID),
    storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  });
  auth = getAuth(app);
  return auth;
}
