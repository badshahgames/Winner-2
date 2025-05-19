import { auth, provider } from './firebase.js';

// Google Sign-In
export function googleSignIn() {
  return signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      return {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL
      };
    });
}

// Sign Out
export function signOutUser() {
  return auth.signOut();
}

// Auth State Listener
export function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}
