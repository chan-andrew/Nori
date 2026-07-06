// Firebase Auth + Firestore, activated by VITE_FIREBASE_* env vars (see
// client/.env.example). Without a config the app runs on the local Express
// store instead, so nothing here is required for development.
//
// In the Firebase console: enable the Google and Email/Password sign-in
// providers, and create a Firestore database in the same project.
//
// The SDK loads lazily (dynamic import) so the fallback path never ships
// Firebase in the main bundle.

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);

let instancesPromise = null;

// Resolves { auth, db, googleProvider } plus the auth/firestore module
// namespaces, so callers never import the SDK directly.
export function getFirebase() {
  if (!firebaseEnabled) {
    return Promise.reject(new Error("Firebase is not configured"));
  }
  if (!instancesPromise) {
    instancesPromise = Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore"),
    ]).then(([{ initializeApp }, authMod, firestoreMod]) => {
      const app = initializeApp(config);
      return {
        auth: authMod.getAuth(app),
        db: firestoreMod.getFirestore(app),
        googleProvider: new authMod.GoogleAuthProvider(),
        authMod,
        firestoreMod,
      };
    });
  }
  return instancesPromise;
}
