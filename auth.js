// Firebase configuration
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth state listener
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            currentUser = user;
            loadUserData();
            
            // Hide login page if we're on it
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'index.html';
            }
        } else {
            // User is signed out
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

// Google sign-in
function setupGoogleLogin() {
    const googleLoginBtn = document.getElementById('googleLogin');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(handleNewUser)
                .catch(handleAuthError);
        });
    }
}

// Handle new user registration
function handleNewUser(result) {
    const user = result.user;
    
    // Check if user exists in Firestore
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (!doc.exists) {
                // New user - add bonus
                db.collection('users').doc(user.uid).set({
                    name: user.displayName,
                    email: user.email,
                    balance: 10, // ₹10 bonus
                    wins: 0,
                    losses: 0,
                    joined: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            // Redirect to game page
            window.location.href = 'index.html';
        });
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupGoogleLogin();
});
