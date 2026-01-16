// ========================================
// MAPZO - FIXED VERSION
// ========================================

const API_BASE = "https://backend-jwqn.onrender.com";

// ========================================
// 1. AUTH HEADERS HELPER
// ========================================
function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

// ========================================
// 2. GLOBAL VARIABLES
// ========================================
let currentUser = null;
let map = null;
let uploadMap = null;
let eventMarkers = [];
let uploadMarker = null;
let selectedEventLocation = null;
let currentLocation = null;
let mapInitialized = false;
let selectedFiles = [];
let userLocationMarker = null;

const ALLOWED_HOST_EMAILS = [
    "shreyashmishra506@gmail.com",
    "realdaksharora@gmail.com",
    "iitianshreyash25@gmail.com",
    "aadityasingh1439@gmail.com"
];

const EVENT_EMOJIS = {
    'music': '🎵',
    'sports': '⚽',
    'food': '🍕',
    'party': '🎉',
    'tech': '💻',
    'default': '📍'
};

// ========================================
// 3. AUTHENTICATION - FIXED
// ========================================

// Check if user is logged in on page load
async function checkAuthStatus() {
    const token = localStorage.getItem("token");
    
    if (!token) {
        updateUIForLogout();
        return;
    }

    try {
        // Verify token with backend
        const res = await fetch(`${API_BASE}/auth/verify`, {
            headers: authHeaders()
        });

        if (!res.ok) {
            throw new Error("Invalid token");
        }

        const data = await res.json();
        currentUser = data.user;
        updateUIForLogin(currentUser);

    } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem("token");
        updateUIForLogout();
    }
}

// Login Form Handler - FIXED
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPass").value.trim();
            const btn = e.target.querySelector('button[type="submit"]');

            const oldText = btn.innerText;
            btn.innerText = "Logging in...";
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Login failed");
                }

                // Store JWT
                localStorage.setItem("token", data.token);

                closeAuth();
                showToast("Login successful! 🎉", "success");

                // Wait a moment then reload
                setTimeout(() => window.location.reload(), 500);

            } catch (err) {
                console.error("Login error:", err);
                showToast(err.message || "Login failed", "error");
            } finally {
                btn.innerText = oldText;
                btn.disabled = false;
            }
        });
    }

    // Signup Form Handler - FIXED
    const signupForm = document.getElementById("signupForm");
    
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("signupEmail").value.trim();
            const password = document.getElementById("signupPass").value.trim();
            const btn = e.target.querySelector('button[type="submit"]');

            if (password.length < 6) {
                showToast("Password must be at least 6 characters", "error");
                return;
            }

            const displayName = email.split("@")[0];

            const oldText = btn.innerText;
            btn.innerText = "Creating account...";
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/auth/signup`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password,
                        displayName
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Signup failed");
                }

                // Store JWT
                localStorage.setItem("token", data.token);

                closeAuth();
                showToast("Account created successfully! 🎉", "success");

                setTimeout(() => window.location.reload(), 500);

            } catch (err) {
                console.error("Signup error:", err);
                showToast(err.message || "Signup failed", "error");
            } finally {
                btn.innerText = oldText;
                btn.disabled = false;
            }
        });
    }

    // Google Login - FIXED
    document.getElementById("googleLoginBtn")?.addEventListener("click", handleGoogleLogin);
    document.getElementById("googleSignupBtn")?.addEventListener("click", handleGoogleLogin);

    // Check auth status on load
    checkAuthStatus();
});

async function handleGoogleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;

        const idToken = await user.getIdToken();

        const res = await fetch(`${API_BASE}/auth/google`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ idToken })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Google login failed");
        }

        localStorage.setItem("token", data.token);

        closeAuth();
        showToast("Logged in with Google! 🎉", "success");

        setTimeout(() => window.location.reload(), 500);

    } catch (err) {
        console.error("Google login error:", err);
        showToast(err.message || "Google login failed", "error");
    }
}

function updateUIForLogin(user) {
    const logSignBox = document.querySelector(".logSignBox");
    const hostBar = document.querySelector(".hostBar");
    const userEmail = user.email ? user.email.toLowerCase() : "";

    if (logSignBox) {
        logSignBox.innerHTML = `
            <div style="text-align:center;">
                <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email)}" 
                     style="width:40px; height:40px; border-radius:50%; object-fit:cover; margin-bottom:8px; border:2px solid #1db954;">
                <p style="font-size:0.8rem;color:#fff;margin-bottom:10px;font-weight:700;">${user.displayName || user.email}</p>
                
                <button class="logSign" onclick="handleLogout()" 
                        style="background:rgba(255, 68, 68, 0.2); border:1px solid #ff4444; color:#fff;">
                    Logout
                </button>
            </div>`;
    }

    if (hostBar) {
        hostBar.style.display = ALLOWED_HOST_EMAILS.includes(userEmail) ? "block" : "none";
    }
}

function updateUIForLogout() {
    const logSignBox = document.querySelector(".logSignBox");
    const hostBar = document.querySelector(".hostBar");

    if (logSignBox) {
        logSignBox.innerHTML = `
            <button class="logSign" onclick="openAuth('login')">Log in</button>
            <button class="logSign" onclick="openAuth('signup')">Sign up</button>`;
    }
    if (hostBar) hostBar.style.display = "none";
}

function handleLogout() {
    localStorage.removeItem("token");
    
    // Also sign out from Firebase if used
    if (firebase.auth().currentUser) {
        firebase.auth().signOut();
    }
    
    showToast("Logged out successfully", "success");
    setTimeout(() => window.location.reload(), 500);
}

// ========================================
// 4. UI HELPERS
// ========================================

function openAuth(mode) {
    const overlay = document.getElementById("authOverlay");
    overlay.classList.add("show");

    const loginPage = document.getElementById("loginPage");
    const signupPage = document.getElementById("signupPage");
    const title = document.getElementById("authTitle");

    if (mode === "signup") {
        loginPage.classList.remove("show");
        signupPage.classList.add("show");
        title.textContent = "Sign up";
    } else {
        signupPage.classList.remove("show");
        loginPage.classList.add("show");
        title.textContent = "Log in";
    }
}

function closeAuth() {
    document.getElementById("authOverlay").classList.remove("show");
}

function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// 5. MAP INITIALIZATION (Unchanged)
// ========================================

window.initMap = function () {
    if (mapInitialized) return;

    const mapElement = document.querySelector('.map');
    if (!mapElement) return;

    const defaultCenter = { lat: 22.3200, lng: 87.3150 };

    try {
        if (typeof google === 'undefined' || !google.maps) throw new Error('Google Maps not loaded');

        map = new google.maps.Map(mapElement, {
            center: currentLocation || defaultCenter,
            zoom: 14,
            disableDefaultUI: true,
            gestureHandling: 'greedy',
            styles: [
                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
            ]
        });

        mapInitialized = true;
        console.log('✅ Map initialized');

    } catch (error) {
        console.error('❌ Map init failed:', error);
    }
};

// ========================================
// 6. MENU TOGGLE
// ========================================

function toggleMenu() {
    document.querySelector(".menu").classList.toggle("menuShow");
    document.querySelector(".menuOverlay").classList.toggle("show");
}

// Export functions to window for onclick handlers
window.openAuth = openAuth;
window.closeAuth = closeAuth;
window.togglePassword = togglePassword;
window.handleLogout = handleLogout;
window.toggleMenu = toggleMenu;