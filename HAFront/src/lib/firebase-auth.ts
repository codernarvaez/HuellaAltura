import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  const name = fullName.trim();
  if (name) {
    await updateProfile(credential.user, { displayName: name });
  }
  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  return credential.user;
}
