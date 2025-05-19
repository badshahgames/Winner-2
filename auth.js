// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBci1YLe6TGuv9NHFRf1ljBnLH-ULj8jWs",
  authDomain: "color-trado.firebaseapp.com",
  projectId: "color-trado",
  storageBucket: "color-trado.appspot.com",
  messagingSenderId: "960118997572",
  appId: "1:960118997572:web:4d533860f2daa609b3b211",
  measurementId: "G-F3QLVXY0NW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// DOM elements
const googleSignInBtn = document.getElementById('googleSignIn');
const userInfoDiv = document.getElementById('userInfo');
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Sign in with Google
googleSignInBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      // This gives you a Google Access Token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      
      // The signed-in user info
      const user = result.user;
      updateUI(user);
    })
    .catch((error) => {
      console.error(error);
      alert(error.message);
    });
});

// Sign out
logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    // Sign-out successful
    userInfoDiv.style.display = 'none';
    googleSignInBtn.style.display = 'flex';
  }).catch((error) => {
    console.error(error);
  });
});

// Check auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    updateUI(user);
  } else {
    // User is signed out
    userInfoDiv.style.display = 'none';
    googleSignInBtn.style.display = 'flex';
  }
});

// Update UI with user info
function updateUI(user) {
  if (user) {
    userInfoDiv.style.display = 'block';
    googleSignInBtn.style.display = 'none';
    
    userPhoto.src = user.photoURL;
    userName.textContent = user.displayName;
    userEmail.textContent = user.email;
  }
}
