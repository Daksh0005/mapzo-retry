// ========================================
// MAPZO - EVENT DISCOVERY PLATFORM
// COMPLETE FINAL SCRIPT
// Fixed: Login, Signup, GPS (Host), and "Enable Location" (User)
// ========================================

// ========================================
// 1. GLOBAL VARIABLES
// ========================================

// ✅ API KEY
const API_KEY = "AIzaSyBqeFuoFFt-z7YhRoWOIH2nKO_oV3hiQkk";

let currentUser = null;

// ✅ ADMIN ACCESS LIST
const ALLOWED_HOST_EMAILS = [
    "shreyashmishra506@gmail.com",
    "realdaksharora@gmail.com",
    "iitianshreyash25@gmail.com"
];

let map = null;
let uploadMap = null;
let eventMarkers = [];
let uploadMarker = null;
let selectedEventLocation = null;
let currentLocation = null;
let mapInitialized = false;
let selectedFiles = [];
let userLocationMarker = null; // New variable for user's blue dot

// ========================================
// 2. GOOGLE MAPS INITIALIZATION
// ========================================

window.initMap = function () {
    if (mapInitialized) return;

    const mapElement = document.querySelector('.map');
    if (!mapElement) return;

    // Default to Kharagpur if no location found
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
                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] }
            ]
        });

        mapInitialized = true;
        console.log('✅ Map initialized');

        google.maps.event.addListenerOnce(map, 'tilesloaded', function () {
            if (window.db) loadEventsFromFirebase();
            else setTimeout(loadEventsFromFirebase, 1500);
        });

    } catch (error) {
        console.error('❌ Map init failed:', error);
    }
};

// ========================================
// 3. UPLOAD MAP (Host Event Form)
// ========================================

function initUploadMap() {
    const uploadMapElement = document.getElementById('uploadMap');
    if (!uploadMapElement) return;

    const defaultCenter = currentLocation || { lat: 22.3200, lng: 87.3150 };

    uploadMap = new google.maps.Map(uploadMapElement, {
        center: defaultCenter,
        zoom: 14,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ]
    });

    uploadMap.addListener('click', function (e) {
        placeUploadMarker(e.latLng);
    });
}

function placeUploadMarker(location) {
    if (uploadMarker) uploadMarker.setMap(null);

    uploadMarker = new google.maps.Marker({
        position: location,
        map: uploadMap,
        animation: google.maps.Animation.DROP,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: "#1db954",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 4
        }
    });

    selectedEventLocation = {
        lat: location.lat(),
        lng: location.lng()
    };

    document.getElementById('selectedLocationText').textContent =
        `✅ Lat: ${location.lat().toFixed(4)}, Lng: ${location.lng().toFixed(4)}`;
}

// ========================================
// 4. GPS FUNCTIONS (Host & User)
// ========================================

// Function for HOST (Upload Page)
function useHostGPS() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
    }
    const statusText = document.getElementById('selectedLocationText');
    if(statusText) statusText.textContent = "⌛ Getting location...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const loc = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            if (uploadMap) {
                uploadMap.setCenter(loc);
                placeUploadMarker(loc);
                uploadMap.setZoom(16);
            }
        },
        (error) => {
            console.error(error);
            alert('Could not get location. Make sure GPS is enabled.');
        }
    );
}

// Function for HOST (Search)
function searchHostLocation() {
    const query = prompt("Enter a location to search:");
    if (!query) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            if (uploadMap) {
                uploadMap.setCenter(loc);
                placeUploadMarker(loc);
            }
        } else {
            alert('Location not found. Try a different name.');
        }
    });
}

// ✅ NEW: Function for USER (Main Page "Enable Location" Button)
// This fixes the "openLocationModal is not defined" error
function openLocationModal() {
    console.log("Getting User Location...");

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
            
            currentLocation = userPos; // Save globally

            if (map) {
                map.setCenter(userPos);
                map.setZoom(15);

                // Remove old user marker if exists
                if (userLocationMarker) userLocationMarker.setMap(null);

                // Add "You are here" Blue Dot
                userLocationMarker = new google.maps.Marker({
                    position: userPos,
                    map: map,
                    title: "You are here",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                    }
                });
                
                alert("Location found! 📍");
            }
        },
        (error) => {
            console.error("Error getting location:", error);
            alert("Could not get your location. Please check your browser permissions.");
        }
    );
}

// ========================================
// 5. AUTH & SESSION MANAGEMENT
// ========================================

function checkSession() {
    const token = localStorage.getItem('userToken');
    const email = localStorage.getItem('userEmail');
    const uid = localStorage.getItem('userId');

    if (token && email) {
        currentUser = { email: email, uid: uid || 'user' };
        updateUIForLogin(currentUser);
    } else {
        currentUser = null;
        updateUIForLogout();
    }
}

function updateUIForLogin(user) {
    const logSignBox = document.querySelector(".logSignBox");
    const hostBar = document.querySelector(".hostBar");
    const userEmail = user.email ? user.email.toLowerCase() : "";

    if (logSignBox) {
        logSignBox.innerHTML = `<p style="font-size:0.9rem;color:#aaa;margin-bottom:10px;">${user.email}</p><button class="logSign" onclick="handleLogout()" style="background:#ff4444;color:white;">Log out</button>`;
    }
    if (hostBar) {
        hostBar.style.display = ALLOWED_HOST_EMAILS.includes(userEmail) ? "block" : "none";
    }
}

function updateUIForLogout() {
    const logSignBox = document.querySelector(".logSignBox");
    const hostBar = document.querySelector(".hostBar");

    if (logSignBox) {
        logSignBox.innerHTML = `<button class="logSign" onclick="openAuth('login')">Log in</button><button class="logSign" onclick="openAuth('signup')">Sign up</button>`;
    }
    if (hostBar) hostBar.style.display = "none";
}

function handleLogout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    currentUser = null;
    updateUIForLogout();
    alert("Logged out successfully.");
    window.location.reload();
}

// ========================================
// 6. HELPER: COMPRESS IMAGE TO BASE64
// ========================================
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const maxWidth = 800; 
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const elem = document.createElement('canvas');
                const scaleFactor = maxWidth / img.width;
                elem.width = maxWidth;
                elem.height = img.height * scaleFactor;
                const ctx = elem.getContext('2d');
                ctx.drawImage(img, 0, 0, elem.width, elem.height);
                resolve(elem.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

// ========================================
// 7. EVENT DISPLAY
// ========================================

function renderEventCards(events) {
    const eventsScroll = document.querySelector('.eventsScroll');
    if (!eventsScroll) return;

    if (events.length === 0) {
        eventsScroll.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px;">No events found</p>';
        return;
    }

    eventsScroll.innerHTML = '';

    events.forEach(event => {
        let displayImage = 'https://via.placeholder.com/400x220?text=Event';
        if (event.images && Array.isArray(event.images) && event.images.length > 0) {
            displayImage = event.images[0];
        } else if (event.image) {
            displayImage = event.image;
        }

        const card = document.createElement('div');
        card.className = 'eventCard';
        card.innerHTML = `
            <div class="eventImage">
                <img src="${displayImage}" alt="${event.title}" loading="lazy">
                <span class="eventCategory">${event.category}</span>
            </div>
            <div class="eventInfo">
                <h3 class="eventTitle">${event.title}</h3>
                <p class="eventDate"><i class="fa-regular fa-calendar"></i> ${event.date}</p>
                <p class="eventLocation"><i class="fa-solid fa-location-dot"></i> ${event.location}</p>
            </div>
        `;
        card.addEventListener('click', () => {
            window.location.href = `event.html?id=${event.id}`;
        });
        eventsScroll.appendChild(card);
    });
}

function addEventMarkers(events) {
    eventMarkers.forEach(marker => marker.setMap(null));
    eventMarkers = [];
    if (!map) return;

    events.forEach(event => {
        if (!event.lat || !event.lng) return;
        const marker = new google.maps.Marker({
            position: { lat: event.lat, lng: event.lng },
            map: map,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#1db954", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }
        });
        
        marker.addListener('click', () => {
             window.location.href = `event.html?id=${event.id}`;
        });
        eventMarkers.push(marker);
    });
}

// ========================================
// 8. UPLOAD EVENT
// ========================================

async function handleEventSubmit() {
    const submitBtn = document.querySelector('.uploadSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = "Posting...";

    const eventName = document.getElementById('eventName').value;
    const eventCategory = document.getElementById('uploadEventCategory').value;
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventLocation = document.getElementById('eventLocation').value;
    const eventDescription = document.getElementById('eventDescription').value;
    const eventHashtags = document.getElementById('eventHashtags').value;

    if (!eventName || !eventCategory || !eventDate || !eventLocation || !selectedEventLocation) {
        alert('Please fill required fields and pin location.');
        submitBtn.disabled = false; submitBtn.textContent = "Post";
        return;
    }

    if (!window.db) return alert("DB Error. Reload.");

    try {
        let imageUrls = [];
        if (selectedFiles.length > 0) {
            const uploadPromises = selectedFiles.map(file => compressImage(file));
            imageUrls = await Promise.all(uploadPromises);
        }

        const newEvent = {
            title: eventName,
            category: eventCategory,
            date: new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: eventTime,
            location: eventLocation,
            description: eventDescription,
            tags: eventHashtags.split(' ').filter(tag => tag.startsWith('#')),
            images: imageUrls, 
            lat: selectedEventLocation.lat,
            lng: selectedEventLocation.lng,
            createdAt: new Date(),
            hostId: currentUser ? currentUser.uid : 'anon', 
            hostEmail: currentUser ? currentUser.email : 'anon', 
            views: 0 
        };

        await window.db.collection('events').add(newEvent);

        document.getElementById('eventUploadForm').reset();
        selectedFiles = []; 
        document.getElementById('imagePreviewContainer').style.display = 'none';
        document.getElementById('uploadPlaceholder').style.display = 'flex';
        document.getElementById('selectedLocationText').textContent = '📍 No location pinned yet';
        if (uploadMarker) { uploadMarker.setMap(null); uploadMarker = null; }
        selectedEventLocation = null;

        closeUploadForm();
        alert('Event posted successfully! 🎉');
        loadEventsFromFirebase();

    } catch (error) {
        console.error('Error:', error);
        alert('Failed: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Post";
    }
}

// ========================================
// 9. UI CONTROLS & INIT
// ========================================

function toggleMenu() { document.querySelector(".menu").classList.toggle("menuShow"); document.querySelector(".menuOverlay").classList.toggle("show"); }
function openAuth(mode) {
    const overlay = document.getElementById("authOverlay"); overlay.classList.add("show");
    document.getElementById(mode === "signup" ? "signupPage" : "loginPage").classList.add("show");
    document.getElementById(mode === "signup" ? "loginPage" : "signupPage").classList.remove("show");
    document.getElementById("authTitle").textContent = mode === "signup" ? "Sign up" : "Log in";
}
function closeAuth() { document.getElementById("authOverlay").classList.remove("show"); }

function openUploadForm() {
    if (!currentUser) return alert("Log in first.");
    const userEmail = currentUser.email ? currentUser.email.toLowerCase() : "";
    if (!ALLOWED_HOST_EMAILS.includes(userEmail)) return alert("Not authorized.");
    document.querySelector(".uploadOverlay").classList.add("show");
    setTimeout(() => { if (!uploadMap) initUploadMap(); }, 300);
}
function closeUploadForm() { document.querySelector(".uploadOverlay").classList.remove("show"); }

// Init Listeners
document.addEventListener("DOMContentLoaded", () => {
    // 1. Check Login on Load
    checkSession();

    // 2. Init Map
    if (typeof google !== 'undefined' && google.maps && !mapInitialized) window.initMap();
    
    // 3. File Input Listener
    const eventImageInput = document.getElementById("uploadEventImage");
    if (eventImageInput) {
        eventImageInput.addEventListener("change", (e) => {
            selectedFiles = Array.from(e.target.files).slice(0, 3);
            const placeholder = document.getElementById("uploadPlaceholder");
            const previewContainer = document.getElementById("imagePreviewContainer");
            const countSpan = document.getElementById("imageCount");

            if (selectedFiles.length > 0) {
                placeholder.style.display = "none";
                previewContainer.style.display = "block";
                countSpan.textContent = selectedFiles.length;
            } else {
                placeholder.style.display = "flex";
                previewContainer.style.display = "none";
            }
        });
    }

    // 4. UI Listeners
    document.getElementById("authCloseBtn")?.addEventListener("click", closeAuth);
    document.getElementById("goSignupBtn")?.addEventListener("click", () => openAuth("signup"));
    document.getElementById("goLoginBtn")?.addEventListener("click", () => openAuth("login"));

    // ✅ LOGIN LISTENER
    document.getElementById("loginForm")?.addEventListener("submit", async (e) => { 
        e.preventDefault(); 
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPass").value.trim();
        const btn = e.target.querySelector('button');
        const oldText = btn.innerText;
        btn.innerText = "Checking...";
        btn.disabled = true;

        try {
            const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, returnSecureToken: true })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('userToken', data.idToken);
                localStorage.setItem('userEmail', data.email);
                localStorage.setItem('userId', data.localId);
                checkSession(); 
                closeAuth();
                alert("Login Successful!");
            } else {
                const errMsg = data.error ? data.error.message : "Login Failed";
                if(errMsg === "INVALID_LOGIN_CREDENTIALS" || errMsg === "INVALID_PASSWORD") alert("Incorrect Email or Password.");
                else if(errMsg === "EMAIL_NOT_FOUND") alert("User not found. Please Sign Up first.");
                else alert(errMsg);
            }
        } catch (error) { 
            console.error(error);
            alert("Network Error: " + error.message); 
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });

    // ✅ SIGNUP LISTENER
    const signupForm = document.getElementById("signupForm") || document.querySelector('#signupPage form');
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById("signupEmail") || signupForm.querySelector('input[type="email"]');
            const passInput = document.getElementById("signupPass") || signupForm.querySelector('input[type="password"]');
            
            if(!emailInput || !passInput) return alert("Error: Could not find Signup Inputs in HTML");

            const email = emailInput.value.trim();
            const password = passInput.value.trim();
            const btn = e.target.querySelector('button');
            const oldText = btn.innerText;
            btn.innerText = "Creating...";
            btn.disabled = true;

            try {
                const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, returnSecureToken: true })
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Account Created! Logging in...");
                    localStorage.setItem('userToken', data.idToken);
                    localStorage.setItem('userEmail', data.email);
                    localStorage.setItem('userId', data.localId);
                    checkSession(); 
                    closeAuth();
                } else {
                    const errMsg = data.error ? data.error.message : "Sign Up Failed";
                    if(errMsg === "EMAIL_EXISTS") alert("Email already registered. Please Log In.");
                    else alert(errMsg);
                }
            } catch (error) {
                console.error(error);
                alert("Network Error: " + error.message);
            } finally {
                btn.innerText = oldText;
                btn.disabled = false;
            }
        });
    }

    // Navigation Listeners
    document.querySelectorAll('.navItem').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.navItem').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

function loadEventsFromFirebase() {
    if(!window.db) return;
    window.db.collection('events').orderBy('createdAt', 'desc').get().then((snapshot) => {
        let events = []; 
        snapshot.forEach((doc) => { events.push({ id: doc.id, ...doc.data() }); });
        window.allEvents = events; 
        renderEventCards(events); 
        addEventMarkers(events);
    });
}

// ========================================
// 10. SMART SEARCH
// ========================================
const searchInput = document.querySelector('.navSrchBar');
const searchForm = document.querySelector('.navSearch');

if (searchInput) {
    const resultsBox = document.createElement('div');
    resultsBox.className = 'searchResultsBox';
    searchForm.style.position = 'relative';
    searchForm.appendChild(resultsBox);

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        resultsBox.innerHTML = '';
        
        if (query.length < 2) {
            resultsBox.style.display = 'none';
            return;
        }

        const matches = (window.allEvents || []).filter(event => 
            event.title.toLowerCase().includes(query) || 
            event.category.toLowerCase().includes(query)
        );

        if (matches.length > 0) {
            resultsBox.style.display = 'block';
            matches.slice(0, 5).forEach(event => {
                const div = document.createElement('div');
                div.className = 'searchResultItem';
                div.innerHTML = `
                    <i class="fa-solid fa-calendar-day"></i>
                    <div>
                        <p style="font-weight:700; margin:0; font-size:0.9rem;">${event.title}</p>
                        <p style="margin:0; font-size:0.75rem; color:#888;">${event.location}</p>
                    </div>
                `;
                div.onclick = () => window.location.href = `event.html?id=${event.id}`;
                resultsBox.appendChild(div);
            });
        } else {
            resultsBox.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) resultsBox.style.display = 'none';
    });
}
