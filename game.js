import { auth, db } from './firebase.js';
import { onAuthStateChanged } from './auth.js';
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

// Game variables
let gameState = 'waiting'; // waiting, betting, results
let countdown = 30;
let timerInterval;
let currentUser = null;
let userData = { balance: 0, wins: 0, losses: 0 };
let bets = { red: 0, green: 0, violet: 0 };
let gameHistory = [];

// DOM elements
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userBalance = document.getElementById('userBalance');
const gameTimer = document.getElementById('gameTimer');
const colorWheel = document.getElementById('colorWheel');
const placeBetBtn = document.getElementById('placeBetBtn');
const cashOutBtn = document.getElementById('cashOutBtn');
const betButtons = document.querySelectorAll('.bet-btn');
const historyGrid = document.getElementById('historyGrid');
const adminLink = document.getElementById('adminLink');

// Initialize game
function initGame() {
    setupEventListeners();
    buildColorWheel();
    checkAuthState();
    loadGameHistory();
    startGameLoop();
}

function buildColorWheel() {
    const segments = [
        { color: 'red', degrees: 0 },
        { color: 'green', degrees: 120 },
        { color: 'violet', degrees: 240 }
    ];
    
    segments.forEach(seg => {
        const segment = document.createElement('div');
        segment.className = `wheel-segment ${seg.color}`;
        segment.style.transform = `rotate(${seg.degrees}deg)`;
        colorWheel.appendChild(segment);
    });
}

function setupEventListeners() {
    betButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            if (gameState === 'betting') {
                addBet(color);
            }
        });
    });
    
    placeBetBtn.addEventListener('click', placeBet);
    cashOutBtn.addEventListener('click', cashOut);
}

function checkAuthState() {
    onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            userAvatar.src = user.photoURL || 'images/default-avatar.png';
            userName.textContent = user.displayName || 'User';
            loadUserData(user.uid);
            
            // Check if user is admin
            checkAdminStatus(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });
}

async function checkAdminStatus(uid) {
    const docRef = doc(db, "admins", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        adminLink.style.display = 'block';
    } else {
        adminLink.style.display = 'none';
    }
}

async function loadUserData(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
        userData = docSnap.data();
        updateBalance();
    } else {
        // New user - give bonus
        userData = { balance: 10, wins: 0, losses: 0 };
        await setDoc(docRef, userData);
        updateBalance();
    }
}

function loadGameHistory() {
    const historyRef = collection(db, "gameHistory");
    onSnapshot(historyRef, (snapshot) => {
        gameHistory = [];
        snapshot.forEach((doc) => {
            gameHistory.push(doc.data());
        });
        renderHistory();
    });
}

function startGameLoop() {
    timerInterval = setInterval(updateGame, 1000);
}

function updateGame() {
    countdown--;
    gameTimer.textContent = countdown;
    
    if (countdown <= 0) {
        switch (gameState) {
            case 'waiting':
                startBettingPhase();
                break;
            case 'betting':
                startResultPhase();
                break;
            case 'results':
                startNewRound();
                break;
        }
    }
}

function startBettingPhase() {
    gameState = 'betting';
    countdown = 30;
    resetBets();
    updateUI();
}

function addBet(color) {
    if (userData.balance < 10) {
        alert('Insufficient balance!');
        return;
    }
    
    bets[color] += 10;
    updateUI();
}

function placeBet() {
    const totalBet = bets.red + bets.green + bets.violet;
    if (totalBet === 0) {
        alert('Please place at least ₹10 bet!');
        return;
    }
    
    if (userData.balance < totalBet) {
        alert('Insufficient balance!');
        return;
    }
    
    // Deduct from balance
    userData.balance -= totalBet;
    updateUserData();
    
    // Disable betting
    gameState = 'processing';
    placeBetBtn.disabled = true;
}

function startResultPhase() {
    gameState = 'processing';
    
    // Determine result with 35% win probability
    const isWin = Math.random() < 0.35;
    const colors = ['red', 'green', 'violet'];
    const resultColor = isWin ? 
        colors[Math.floor(Math.random() * 3)] : 
        colors.find(color => bets[color] === 0) || colors[Math.floor(Math.random() * 3)];
    
    // Calculate win amount
    let multiplier = resultColor === 'violet' ? 4 : 2;
    const winAmount = isWin ? bets[resultColor] * multiplier : 0;
    
    // Save game result
    saveGameResult(resultColor, winAmount);
    
    // Spin animation
    spinWheel(resultColor, winAmount);
}

function spinWheel(resultColor, winAmount) {
    const segmentDegrees = {
        red: 0,
        green: 120,
        violet: 240
    };
    const spinDegrees = 1080 + segmentDegrees[resultColor];
    
    colorWheel.style.transition = 'transform 3s ease-out';
    colorWheel.style.transform = `rotate(${spinDegrees}deg)`;
    
    setTimeout(() => {
        showResult(resultColor, winAmount);
    }, 3500);
}

function showResult(resultColor, winAmount) {
    gameState = 'results';
    countdown = 5;
    
    if (winAmount > 0) {
        userData.balance += winAmount;
        userData.wins += 1;
        updateUserData();
        showNotification(`You won ₹${winAmount}!`, 'success');
    } else {
        userData.losses += 1;
        updateUserData();
        showNotification('Better luck next time!', 'error');
    }
}

function startNewRound() {
    gameState = 'waiting';
    countdown = 30;
    resetBets();
    updateUI();
    
    // Reset wheel
    colorWheel.style.transition = 'none';
    colorWheel.style.transform = 'rotate(0deg)';
    setTimeout(() => {
        colorWheel.style.transition = 'transform 3s ease-out';
    }, 10);
}

function updateUI() {
    document.getElementById('redAmount').textContent = bets.red;
    document.getElementById('greenAmount').textContent = bets.green;
    document.getElementById('violetAmount').textContent = bets.violet;
    
    const total = bets.red + bets.green + bets.violet;
    document.getElementById('totalBet').textContent = total;
}

function updateBalance() {
    userBalance.textContent = `₹${userData.balance}`;
}

async function updateUserData() {
    if (!currentUser) return;
    
    await updateDoc(doc(db, "users", currentUser.uid), {
        balance: userData.balance,
        wins: userData.wins,
        losses: userData.losses,
        lastPlayed: new Date()
    });
    
    updateBalance();
}

async function saveGameResult(color, winAmount) {
    if (!currentUser) return;
    
    const resultData = {
        color,
        winAmount,
        timestamp: new Date(),
        userId: currentUser.uid,
        bets: { ...bets }
    };
    
    await addDoc(collection(db, "gameHistory"), resultData);
}

function renderHistory() {
    historyGrid.innerHTML = '';
    const recentHistory = gameHistory.slice(-10).reverse();
    
    recentHistory.forEach(result => {
        const item = document.createElement('div');
        item.className = `history-item ${result.color}`;
        item.textContent = result.color.charAt(0).toUpperCase();
        historyGrid.appendChild(item);
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize game
document.addEventListener('DOMContentLoaded', initGame);
