import { auth, db } from './firebase.js';
import { signOutUser, onAuthStateChanged } from './auth.js';
import { collection, getDocs, doc, updateDoc, query, where, onSnapshot } from "firebase/firestore";

// DOM elements
const logoutBtn = document.getElementById('logoutBtn');
const adminAvatar = document.getElementById('adminAvatar');
const contentSections = document.querySelectorAll('.content-section');
const navLinks = document.querySelectorAll('.sidebar nav a');
const usersTable = document.getElementById('usersTable').querySelector('tbody');
const depositsTable = document.getElementById('depositsTable').querySelector('tbody');
const withdrawalsTable = document.getElementById('withdrawalsTable').querySelector('tbody');
const withdrawalFilter = document.getElementById('withdrawalFilter');

// Initialize admin panel
function initAdminPanel() {
    checkAuthState();
    setupEventListeners();
    loadDashboardData();
    loadUsers();
    loadDeposits();
    loadWithdrawals();
}

function checkAuthState() {
    onAuthStateChanged((user) => {
        if (user) {
            adminAvatar.src = user.photoURL || 'images/admin-icon.png';
            checkAdminStatus(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });
}

async function checkAdminStatus(uid) {
    const docRef = doc(db, "admins", uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
        window.location.href = 'index.html';
    }
}

function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (this.id === 'logoutBtn') return;
            
            const sectionId = this.getAttribute('data-section') + 'Section';
            showSection(sectionId);
            
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Logout
    logoutBtn.addEventListener('click', () => {
        signOutUser().then(() => {
            window.location.href = 'login.html';
        });
    });
    
    // Withdrawal filter
    withdrawalFilter.addEventListener('change', loadWithdrawals);
}

function showSection(sectionId) {
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

async function loadDashboardData() {
    // Total users
    const usersSnapshot = await getDocs(collection(db, "users"));
    document.getElementById('totalUsers').textContent = usersSnapshot.size;
    
    // Active today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
        collection(db, "users"),
        where("lastPlayed", ">=", today)
    );
    
    const activeSnapshot = await getDocs(q);
    document.getElementById('activeToday').textContent = activeSnapshot.size;
    
    // Total deposits and withdrawals would be calculated similarly
}

function loadUsers() {
    const usersRef = collection(db, "users");
    onSnapshot(usersRef, (snapshot) => {
        usersTable.innerHTML = '';
        snapshot.forEach((doc) => {
            const user = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div class="user-cell">
                        <img src="${user.photoURL || 'images/default-avatar.png'}" alt="${user.name}">
                        <div>
                            <div class="user-name">${user.name}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>₹${user.balance}</td>
                <td>${user.wins || 0}/${user.losses || 0}</td>
                <td>${user.lastPlayed ? user.lastPlayed.toDate().toLocaleString() : 'Never'}</td>
                <td>
                    <button class="action-btn edit-btn" data-uid="${doc.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-uid="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            usersTable.appendChild(row);
        });
    });
}

function loadDeposits() {
    const depositsRef = collection(db, "deposits");
    onSnapshot(depositsRef, (snapshot) => {
        depositsTable.innerHTML = '';
        snapshot.forEach((doc) => {
            const deposit = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${deposit.userName}</td>
                <td>₹${deposit.amount}</td>
                <td>${deposit.upiId}</td>
                <td><span class="status-badge ${deposit.status}">${deposit.status}</span></td>
                <td>
                    ${deposit.status === 'pending' ? `
                    <button class="action-btn approve-btn" data-id="${doc.id}">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn reject-btn" data-id="${doc.id}">
                        <i class="fas fa-times"></i> Reject
                    </button>
                    ` : ''}
                </td>
            `;
            
            depositsTable.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', () => updateDepositStatus(btn.dataset.id, 'approved'));
        });
        
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', () => updateDepositStatus(btn.dataset.id, 'rejected'));
        });
    });
}

async function updateDepositStatus(depositId, status) {
    const depositRef = doc(db, "deposits", depositId);
    await updateDoc(depositRef, { status });
    
    if (status === 'approved') {
        const depositSnap = await getDoc(depositRef);
        const deposit = depositSnap.data();
        
        // Update user balance
        const userRef = doc(db, "users", deposit.userId);
        const userSnap = await getDoc(userRef);
        const currentBalance = userSnap.data().balance || 0;
        
        await updateDoc(userRef, {
            balance: currentBalance + deposit.amount
        });
    }
}

function loadWithdrawals() {
    const statusFilter = withdrawalFilter.value;
    let withdrawalsRef = collection(db, "withdrawals");
    
    if (statusFilter !== 'all') {
        withdrawalsRef = query(withdrawalsRef, where("status", "==", statusFilter));
    }
    
    onSnapshot(withdrawalsRef, (snapshot) => {
        withdrawalsTable.innerHTML = '';
        snapshot.forEach((doc) => {
            const withdrawal = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${withdrawal.userName}</td>
                <td>₹${withdrawal.amount}</td>
                <td>${withdrawal.upiId}</td>
                <td><span class="status-badge ${withdrawal.status}">${withdrawal.status}</span></td>
                <td>
                    ${withdrawal.status === 'pending' ? `
                    <button class="action-btn approve-btn" data-id="${doc.id}">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="action-btn reject-btn" data-id="${doc.id}">
                        <i class="fas fa-times"></i> Reject
                    </button>
                    ` : ''}
                </td>
            `;
            
            withdrawalsTable.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', () => updateWithdrawalStatus(btn.dataset.id, 'approved'));
        });
        
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', () => updateWithdrawalStatus(btn.dataset.id, 'rejected'));
        });
    });
}

async function updateWithdrawalStatus(withdrawalId, status) {
    const withdrawalRef = doc(db, "withdrawals", withdrawalId);
    await updateDoc(withdrawalRef, { status });
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', initAdminPanel);
