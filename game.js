// Initialize game variables
let gameState = 'waiting'; // waiting, betting, result
let countdown = 30;
let timerInterval;
let bets = { red: 0, green: 0, violet: 0 };
let currentRound = {};
let userBalance = 0;

// DOM elements
const gameTimer = document.getElementById('gameTimer');
const colorWheel = document.getElementById('colorWheel');
const placeBetBtn = document.getElementById('placeBetBtn');
const cashOutBtn = document.getElementById('cashOutBtn');
const betButtons = document.querySelectorAll('.bet-btn');

// Initialize game
function initGame() {
    buildColorWheel();
    setupEventListeners();
    startGameLoop();
    checkAuthState();
}

function buildColorWheel() {
    // Create wheel segments
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
    // Bet buttons
    betButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            if (gameState === 'betting') {
                addBet(color);
            }
        });
    });
    
    // Place bet button
    placeBetBtn.addEventListener('click', placeBet);
    
    // Cash out button
    cashOutBtn.addEventListener('click', cashOut);
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
                startRound();
                break;
            case 'result':
                resetRound();
                break;
        }
    }
}

function startBettingPhase() {
    gameState = 'betting';
    countdown = 10;
    resetBets();
    updateUI();
}

function addBet(color) {
    if (userBalance < 10) {
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
    
    if (userBalance < totalBet) {
        alert('Insufficient balance!');
        return;
    }
    
    // Deduct from balance
    userBalance -= totalBet;
    updateUserBalance();
    
    // Disable betting
    gameState = 'processing';
    placeBetBtn.disabled = true;
}

function startRound() {
    gameState = 'processing';
    
    // Determine result with 35% win probability
    const isWin = Math.random() < 0.35;
    const colors = ['red', 'green', 'violet'];
    const resultColor = isWin ? 
        colors[Math.floor(Math.random() * 3)] : 
        colors.find(color => bets[color] === 0) || colors[Math.floor(Math.random() * 3)];
    
    // Calculate win amount
    let multiplier = 2;
    if (resultColor === 'violet') multiplier = 4;
    const winAmount = isWin ? bets[resultColor] * multiplier : 0;
    
    // Spin animation
    spinWheel(resultColor, winAmount);
}

function spinWheel(resultColor, winAmount) {
    // Calculate spin degrees (3 full rotations + segment position)
    const segmentDegrees = {
        red: 0,
        green: 120,
        violet: 240
    };
    const spinDegrees = 1080 + segmentDegrees[resultColor];
    
    colorWheel.style.transition = 'transform 3s ease-out';
    colorWheel.style.transform = `rotate(${spinDegrees}deg)`;
    
    // Show result after spin completes
    setTimeout(() => {
        showResult(resultColor, winAmount);
    }, 3500);
}

function showResult(resultColor, winAmount) {
    gameState = 'result';
    countdown = 5;
    
    if (winAmount > 0) {
        userBalance += winAmount;
        updateUserBalance();
        showWinNotification(winAmount, resultColor);
    } else {
        showLossNotification(resultColor);
    }
}

function resetRound() {
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);
