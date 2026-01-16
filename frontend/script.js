// ========================================
// MAPZO - COMPLETE WORKING VERSION
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
    'cultural': '🎭',
    'default': '📍'
};

// ========================================
// 3. AUTHENTICATION
// ========================================

async function checkAuthStatus() {
    const token = localStorage.getItem("token");
    
    if (!token) {
        updateUIForLogout();
        return;
    }

    try {
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

function toggleMenu() {
    document.querySelector(".menu").classList.toggle("menuShow");
    document.querySelector(".menuOverlay").classList.toggle("show");
}

// ========================================
// 5. LOCATION FUNCTIONS - FIXED
// ========================================

function openLocationModal() {
    document.querySelector(".manualLocationOverlay")?.classList.remove("show");
    document.querySelector(".locationOverlay")?.classList.add("show");
}


function closeLocationModal() {
    document.querySelector(".locationOverlay")?.classList.remove("show");
}


function enableGPS() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            currentLocation = userPos;

            if (map) {
                map.setCenter(userPos);
                map.setZoom(15);
            }

            document.querySelector(".locationOverlay")?.classList.remove("show");

            const locDisplay = document.getElementById("locationDisplay");
            if (locDisplay) {
                locDisplay.innerHTML = `${userPos.lat.toFixed(2)},<br>${userPos.lng.toFixed(2)}`;
            }

            showToast("Location found!", "success");
        },
        () => alert("Location permission denied")
    );
}


function showManualInput() {
    document.querySelector(".locationOverlay")?.classList.remove("show");
    document.querySelector(".manualLocationOverlay")?.classList.add("show");
}

function backToLocationOptions() {
    document.querySelector(".manualLocationOverlay")?.classList.remove("show");
    document.querySelector(".locationOverlay")?.classList.add("show");
}

function confirmManualLocation() {
    document.querySelector(".manualLocationOverlay")?.classList.remove("show");
}

function handleLocationSearch(value) {
    console.log("Searching:", value);
}


// ========================================
// 6. FILTER FUNCTIONS
// ========================================

function openFilterModal() {
    document.querySelector('.filterOverlay').classList.add('show');
}

function closeFilterModal() {
    document.querySelector('.filterOverlay').classList.remove('show');
}

function resetFilters() {
    console.log("Filters reset");
    closeFilterModal();
}

function applyFilters() {
    console.log("Filters applied");
    closeFilterModal();
}

// ========================================
// 7. MAP INITIALIZATION
// ========================================

window.initMap = function () {
    if (mapInitialized) return;

    const mapElement = document.querySelector('.map');
    if (!mapElement) return;

    const defaultCenter = { lat: 22.3200, lng: 87.3150 };

    try {
        if (typeof google === 'undefined' || !google.maps) {
            throw new Error('Google Maps not loaded');
        }

        map = new google.maps.Map(mapElement, {
    center: currentLocation || defaultCenter,
    zoom: 14,
    disableDefaultUI: true,
    gestureHandling: "greedy",
    styles: [
        { elementType: "geometry", stylers: [{ color: "#1d1f21" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1d1f21" }] },

        { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1f1f1f" }] },

        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f252e" }] },

        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#242424" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1b2b1f" }] }
    ]
});

        mapInitialized = true;
        console.log('✅ Map initialized');

    } catch (error) {
        console.error('❌ Map init failed:', error);
    }
};

// ========================================
// 8. UPLOAD FORM
// ========================================

function openUploadForm() {
    if (!currentUser) {
        alert("Please log in first.");
        return;
    }
    
    const userEmail = currentUser.email ? currentUser.email.toLowerCase() : "";
    if (!ALLOWED_HOST_EMAILS.includes(userEmail)) {
        alert("You are not authorized to host events.");
        return;
    }
    
    document.querySelector(".uploadOverlay").classList.add("show");
}

function closeUploadForm() {
    document.querySelector(".uploadOverlay").classList.remove("show");
}

function handleEventSubmit() {
    alert("Event submission feature coming soon!");
}

function useHostGPS() {
    alert("Host GPS feature coming soon!");
}

function searchHostLocation() {
    alert("Search location feature coming soon!");
}

// ========================================
// 9. DOM READY
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Mapzo initializing...");

    // Initialize map if Google Maps loaded
    if (typeof google !== 'undefined' && google.maps && !mapInitialized) {
        window.initMap();
    }
    

    // Login Form Handler
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

                localStorage.setItem("token", data.token);

                closeAuth();
                showToast("Login successful! 🎉", "success");

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

    // Signup Form Handler
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

    // Google Login Buttons
    document.getElementById("googleLoginBtn")?.addEventListener("click", handleGoogleLogin);
    document.getElementById("googleSignupBtn")?.addEventListener("click", handleGoogleLogin);
    // FIX C: Auth back button (login/signup close)
const authCloseBtn = document.getElementById("authCloseBtn");
if (authCloseBtn) {
    authCloseBtn.addEventListener("click", closeAuth);
}
// FIX D: Menu login/signup buttons (data-open-auth)
document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-auth]");
    if (!btn) return;

    const mode = btn.dataset.openAuth; // "login" or "signup"
    openAuth(mode);
});



    // Check auth status
    checkAuthStatus();

    // Update year in footer
    const yearSpan = document.getElementById("year");
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
});

// ========================================
// 10. EXPORT TO WINDOW
// ========================================

window.openAuth = openAuth;
window.closeAuth = closeAuth;
window.togglePassword = togglePassword;
window.handleLogout = handleLogout;
window.toggleMenu = toggleMenu;
window.openLocationModal = openLocationModal;
window.closeLocationModal = closeLocationModal;
window.enableGPS = enableGPS;
window.showManualInput = showManualInput;
window.backToLocationOptions = backToLocationOptions;
window.confirmManualLocation = confirmManualLocation;
window.handleLocationSearch = handleLocationSearch;
window.openFilterModal = openFilterModal;
window.closeFilterModal = closeFilterModal;
window.resetFilters = resetFilters;
window.applyFilters = applyFilters;
window.openUploadForm = openUploadForm;
window.closeUploadForm = closeUploadForm;
window.handleEventSubmit = handleEventSubmit;
window.useHostGPS = useHostGPS;
window.searchHostLocation = searchHostLocation;