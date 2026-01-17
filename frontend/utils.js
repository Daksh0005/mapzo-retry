// Shared Frontend Utilities

// 1. Toast Notification System
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        Object.assign(container.style, {
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: '10000',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none'
        });
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
        success: '#1db954',
        error: '#ff4b2b',
        warning: '#ffa000',
        info: '#2196f3'
    };

    Object.assign(toast.style, {
        background: '#1a1a1a',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '30px',
        border: `1px solid ${colors[type] || colors.info}`,
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        fontSize: '0.9rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'toastIn 0.3s ease-out forwards',
        opacity: '0',
        whiteSpace: 'nowrap'
    });

    const icon = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-triangle-exclamation',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `<i class="fa-solid ${icon[type] || icon.info}" style="color:${colors[type]}"></i> ${message}`;
    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add Toast Animations to Style if not present
if (typeof document !== 'undefined' && !document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.innerHTML = `
        @keyframes toastIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes toastOut {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(20px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}
// 2. GLOBAL FIREBASE INIT
const firebaseConfig = {
    apiKey: "AIzaSyDIpZtXSSK99wcbwHGvKEWAykme_6OPp00",
    authDomain: "mapzo-26259.firebaseapp.com",
    projectId: "mapzo-26259",
    storageBucket: "mapzo-26259.firebasestorage.app",
    messagingSenderId: "701273875886",
    appId: "1:701273875886:web:00d1d079ba6875139dd43f",
    measurementId: "G-2PJ0TMZVJT"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Initialized in Utils");
}

let auth;
if (typeof firebase !== 'undefined') {
    auth = firebase.auth();
    window.auth = auth; // Make globally accessible
    console.log("🔐 Auth Object Initialized");
}

let db;
if (typeof firebase !== 'undefined') {
    db = firebase.firestore();
    window.db = db;
}
