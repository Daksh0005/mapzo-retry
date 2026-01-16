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
    "aadityasingh1439@gmail.com",
    "testing@gmail.com"
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
// FILTER STATE
// ========================================
const filterState = {
  distanceKm: 50,        // default
  category: "all",       // "Music", "Tech", etc
  dateFrom: null,        // YYYY-MM-DD
  dateTo: null           // YYYY-MM-DD
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

// Robust Google login (replace existing handleGoogleLogin)
async function handleGoogleLogin() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();

    // start sign-in
    const result = await firebase.auth().signInWithPopup(provider);
    console.log("Google sign-in result:", result);

    // Attempt to obtain ID token from multiple possible places
    const user = result && result.user ? result.user : null;
    let idToken = null;

    try {
      if (user && typeof user.getIdToken === "function") {
        idToken = await user.getIdToken();
        console.log("idToken acquired from user.getIdToken()");
      }
    } catch (err) {
      console.warn("user.getIdToken() failed:", err);
    }

    // fallback to firebase.auth().currentUser
    if (!idToken && firebase.auth().currentUser) {
      try {
        idToken = await firebase.auth().currentUser.getIdToken();
        console.log("idToken acquired from firebase.auth().currentUser.getIdToken()");
      } catch (err) {
        console.warn("currentUser.getIdToken() failed:", err);
      }
    }

    // fallback to OAuth credential idToken (rare)
    if (!idToken && result && result.credential && result.credential.idToken) {
      idToken = result.credential.idToken;
      console.log("idToken acquired from result.credential.idToken");
    }

    if (!idToken) {
      // extra diagnostic: show user and auth state
      console.error("Failed to obtain Firebase ID token. Result and currentUser:", {
        result,
        currentUser: firebase.auth().currentUser
      });
      throw new Error(
        "Failed to obtain ID token. Check Firebase Google sign-in is enabled, popups aren't blocked, and your SDK is configured correctly."
      );
    }

    // send to backend
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Backend /auth/google response:", res.status, data);
      throw new Error(data.error || "Google login failed on server");
    }

    localStorage.setItem("token", data.token);
    closeAuth();
    showToast("Logged in with Google!", "success");

    // minimal delay to let UI update
    setTimeout(() => window.location.reload(), 400);

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
                if (userLocationMarker) userLocationMarker.setMap(null);

userLocationMarker = new google.maps.Marker({
    position: userPos,
    map,
    title: "Your Location",
    icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 7,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2
    }
});

            }

            document.querySelector(".locationOverlay")?.classList.remove("show");

            const locDisplay = document.getElementById("locationDisplay");
            if (locDisplay) {
                locDisplay.innerHTML = `${userPos.lat.toFixed(2)},<br>${userPos.lng.toFixed(2)}`;
            }

            showToast("Location found!", "success");
loadNearbyEvents();
saveUserLocation(userPos);
        },
        () => alert("Location permission denied")
    );
}
async function saveUserLocation(pos) {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        await fetch(`${API_BASE}/api/user/location`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
                latitude: pos.lat,
                longitude: pos.lng
            })
        });
    } catch (err) {
        console.warn("Failed to save user location");
    }
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
    filterState.distanceKm = 50;
    filterState.category = "all";
    filterState.dateFrom = null;
    filterState.dateTo = null;

    // UI reset
    document.getElementById("distanceInput").value = 50;
    document.getElementById("distanceRange").value = 50;

    document.querySelectorAll(".categoryCard").forEach(c => c.classList.remove("active"));
    document.querySelector('.categoryCard[data-category="all"]')?.classList.add("active");

    document.querySelectorAll(".quickFilterBtn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".calendarDay.selected").forEach(d => d.classList.remove("selected"));

    closeFilterModal();
    loadNearbyEvents();
}


function applyFilters() {
    closeFilterModal();
    loadNearbyEvents();
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
// 7A. LOAD & DISPLAY EVENTS (PostgreSQL)
// ========================================

async function loadNearbyEvents() {
    if (!currentLocation) {
        console.log("No location available yet");
        return;
    }

    try {
        const params = new URLSearchParams({
  latitude: currentLocation.lat,
  longitude: currentLocation.lng,
  radius: filterState.distanceKm
});

if (filterState.category !== "all") {
  params.append("category", filterState.category);
}

if (filterState.dateFrom) {
  params.append("dateFrom", filterState.dateFrom);
}

if (filterState.dateTo) {
  params.append("dateTo", filterState.dateTo);
}

const res = await fetch(
  `${API_BASE}/api/events/nearby?${params.toString()}`,
  { headers: authHeaders() }
);


        if (!res.ok) throw new Error("Failed to fetch events");

        const data = await res.json();
        displayEventsOnMap(data.events || []);
        displayEventsInList(data.events || []);

    } catch (err) {
        console.error("Error loading events:", err);
        showToast("Failed to load nearby events", "error");
    }
}

function displayEventsOnMap(events) {
    eventMarkers.forEach(m => m.setMap(null));
    eventMarkers = [];

    events.forEach(event => {
        if (!event.latitude || !event.longitude) return;

        const emoji = EVENT_EMOJIS[event.category?.toLowerCase()] || EVENT_EMOJIS.default;

        const marker = new google.maps.Marker({
            position: {
                lat: parseFloat(event.latitude),
                lng: parseFloat(event.longitude)
            },
            map,
            title: event.title,
            label: { text: emoji, fontSize: "22px" }
        });

        marker.addListener("click", () => {
            window.location.href = `event.html?id=${event.id}`;
        });

        eventMarkers.push(marker);
    });
}

function displayEventsInList(events) {
    const container = document.querySelector(".eventsScroll");
    if (!container) return;

    container.innerHTML = "";

    if (events.length === 0) {
        container.innerHTML = `<p style="padding:20px;text-align:center;color:#666;">
            No events found nearby
        </p>`;
        return;
    }

    events.forEach(event => {
        const card = document.createElement("div");
        card.className = "eventCard";

        const emoji = EVENT_EMOJIS[event.category?.toLowerCase()] || EVENT_EMOJIS.default;

        card.innerHTML = `
            <div class="eventImage">${emoji}</div>
            <div class="eventInfo">
                <h4>${event.title}</h4>
                <p>${event.venue_name || event.address || ""}</p>
                <p>${new Date(event.event_date).toLocaleDateString()}</p>
            </div>
        `;

        card.onclick = () => {
            window.location.href = `event.html?id=${event.id}`;
        };

        container.appendChild(card);
    });
}


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

async function handleEventSubmit() {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please log in first");

    if (!selectedEventLocation) {
        alert("Select event location on map");
        return;
    }

    const data = {
        title: document.getElementById("eventName").value.trim(),
        category: document.getElementById("uploadEventCategory").value,
        venue_name: document.getElementById("eventLocation").value.trim(),
        address: document.getElementById("eventLocation").value.trim(),
        latitude: selectedEventLocation.lat,
        longitude: selectedEventLocation.lng,
        event_date: document.getElementById("eventDate").value,
        description: document.getElementById("eventDescription").value.trim()
    };

    if (!data.title || !data.category || !data.event_date) {
        alert("Missing required fields");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/events`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(data)
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        showToast("Event created successfully", "success");
        closeUploadForm();
        loadNearbyEvents();

    } catch (err) {
        alert(err.message || "Failed to create event");
    }
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

// ---------- Filter UI helpers ----------
(function initFilterUI() {
  // Tabs
  document.querySelectorAll('.filterTab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filterTab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.filterTabContent').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      document.getElementById(tabName + 'Tab').classList.add('active');
    });
  });

  // Quick filter buttons
  document.querySelectorAll('.quickFilterBtn').forEach(q => {
    q.addEventListener('click', (e) => {
      // if button is a date quick filter (data-quick)
      const quick = e.currentTarget.dataset.quick;
      const distance = e.currentTarget.dataset.distance;

      if (quick) {
        // set calendar / chosen date filter - simple behavior
        document.querySelectorAll('.calendarDay.selected')
  .forEach(d => d.classList.remove('selected'));

        document.querySelectorAll('.quickFilterBtn[data-quick]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // for UI feedback: show chosen range in a hidden filter state
       const today = new Date();
let from, to;

if (quick === "today") {
  from = to = today;
}
if (quick === "tomorrow") {
  from = to = new Date(today.getTime() + 86400000);
}
if (quick === "week") {
  from = today;
  to = new Date(today.getTime() + 7 * 86400000);
}
if (quick === "month") {
  from = today;
  to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
}

filterState.dateFrom = from.toISOString().slice(0, 10);
filterState.dateTo = to.toISOString().slice(0, 10);

        // you can map 'today' => set date query etc
      }

      if (distance) {
        document.querySelectorAll('.quickFilterBtn[data-distance]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const km = parseInt(distance, 10);
        document.getElementById('distanceInput').value = km;
        document.getElementById('distanceRange').value = Math.min(km, 500);
        filterState.distanceKm = km;
      }
    });
  });

  // Distance slider sync
  const distanceRange = document.getElementById('distanceRange');
  const distanceInput = document.getElementById('distanceInput');
  if (distanceRange && distanceInput) {
    distanceRange.addEventListener('input', () => {
  distanceInput.value = distanceRange.value;
  filterState.distanceKm = parseInt(distanceRange.value, 10);
});

   distanceInput.addEventListener('input', () => {
  let v = parseInt(distanceInput.value || 0, 10);
  if (isNaN(v)) v = 0;
  if (v < parseInt(distanceRange.min)) v = distanceRange.min;
  if (v > parseInt(distanceRange.max)) v = distanceRange.max;

  distanceRange.value = v;
  filterState.distanceKm = v;
});
}

  //autodetect location checkbox
  // Auto-detect location on load
if (navigator.geolocation) {
    setTimeout(() => {
        if (!currentLocation && mapInitialized) enableGPS();
    }, 800);
}


  // Category grid selection
  document.querySelectorAll('.categoryCard').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.categoryCard').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      filterState.category = card.dataset.category;
    });
  });

  // Calendar: minimal generator for the element #calendarDays
  const calendarDays = document.getElementById('calendarDays');
  const currentMonthSpan = document.getElementById('currentMonth');
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');

  let today = new Date();
  let calYear = today.getFullYear(), calMonth = today.getMonth();

  function renderCalendar(year, month) {
    if (!calendarDays || !currentMonthSpan) return;
    calendarDays.innerHTML = '';
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay(); // 0..6
    // fill leading blanks
    for (let i = 0; i < startWeekday; i++) {
      const blank = document.createElement('div');
      blank.className = 'calendarDay empty';
      calendarDays.appendChild(blank);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const el = document.createElement('button');
      el.className = 'calendarDay';
      el.type = 'button';
      el.innerText = d;
      el.addEventListener('click', () => {
  document.querySelectorAll('.calendarDay.selected').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');

  const selectedDate =
    `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  filterState.dateFrom = selectedDate;
  filterState.dateTo = selectedDate;

  const dateInput = document.getElementById('eventDate');
  if (dateInput) dateInput.value = selectedDate;
});
calendarDays.appendChild(el);


      calendarDays.appendChild(el);
    }
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    currentMonthSpan.textContent = `${monthNames[month]} ${year}`;
  }

  if (prevBtn) prevBtn.addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar(calYear, calMonth);
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar(calYear, calMonth);
  });

  renderCalendar(calYear, calMonth);
})();

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