import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { firebaseEnabled, getFirebase } from "../lib/firebase.js";

// With a Firebase project configured (VITE_FIREBASE_* env vars), auth runs on
// Firebase Auth — Google + email/password providers — and the profile lives in
// a Firestore `users/{uid}` document. Without one, the local Express store
// handles both, so the sign-in screens work either way.

const AuthContext = createContext(null);

const PROFILE_DEFAULTS = {
  allergies: "",
  diet_pattern: "none",
  default_calorie_target: null,
  default_protein_target: null,
  disliked_foods: "",
  average_budget: null,
  saved_address: "",
  saved_lat: null,
  saved_lng: null,
  onboarding_complete: false,
};

async function loadOrCreateFirebaseProfile(fbUser, provider) {
  const { db, firestoreMod } = await getFirebase();
  const { doc, getDoc, setDoc } = firestoreMod;
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: fbUser.uid, ...snap.data() };
  const profile = {
    email: fbUser.email,
    auth_provider: provider,
    created_at: new Date().toISOString(),
    ...PROFILE_DEFAULTS,
  };
  await setDoc(ref, profile);
  return { id: fbUser.uid, ...profile };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nori_user")) ?? null;
    } catch {
      return null;
    }
  });

  function persist(nextUser) {
    setUser(nextUser);
    if (nextUser) localStorage.setItem("nori_user", JSON.stringify(nextUser));
    else localStorage.removeItem("nori_user");
  }

  // Keep the session in sync with Firebase (page reloads, token expiry,
  // sign-outs from other tabs).
  useEffect(() => {
    if (!firebaseEnabled) return;
    let unsubscribe;
    getFirebase().then(({ auth, authMod }) => {
      unsubscribe = authMod.onAuthStateChanged(auth, async (fbUser) => {
        if (!fbUser) {
          persist(null);
          return;
        }
        try {
          const provider = fbUser.providerData[0]?.providerId === "google.com" ? "google" : "email";
          persist(await loadOrCreateFirebaseProfile(fbUser, provider));
        } catch {
          // Keep whatever profile we had cached; Firestore may be offline.
        }
      });
    });
    return () => unsubscribe?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function signup(email, password) {
    if (firebaseEnabled) {
      const { auth, authMod } = await getFirebase();
      const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
      const profile = await loadOrCreateFirebaseProfile(cred.user, "email");
      persist(profile);
      return profile;
    }
    const { user: u } = await api.signup(email, password);
    persist(u);
    return u;
  }

  async function login(email, password) {
    if (firebaseEnabled) {
      const { auth, authMod } = await getFirebase();
      const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
      const profile = await loadOrCreateFirebaseProfile(cred.user, "email");
      persist(profile);
      return profile;
    }
    const { user: u } = await api.login(email, password);
    persist(u);
    return u;
  }

  // Google sign-in exists only on the Firebase path; the buttons that call
  // this are hidden when Firebase isn't configured.
  async function loginWithGoogle() {
    const { auth, authMod, googleProvider } = await getFirebase();
    const cred = await authMod.signInWithPopup(auth, googleProvider);
    const profile = await loadOrCreateFirebaseProfile(cred.user, "google");
    persist(profile);
    return profile;
  }

  async function logout() {
    if (firebaseEnabled) {
      const { auth, authMod } = await getFirebase();
      await authMod.signOut(auth).catch(() => {});
    }
    persist(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, signup, login, loginWithGoogle, logout, setUser: persist, googleAvailable: firebaseEnabled }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
