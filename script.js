// ========================================
// MAPZO - EVENT DISCOVERY PLATFORM
// 3D Cards + Multiple Base64 Images
// ========================================

// ========================================
// 1. GLOBAL VARIABLES
// ========================================

let currentUser = null;

// ✅ ADMIN ACCESS LIST
const ALLOWED_HOST_EMAILS = [
  "shreyashmishra506@gmail.com",
  "realdaksharora@gmail.com"
];

let map = null;
let uploadMap = null;
let eventMarkers = [];
let uploadMarker = null;
let selectedEventLocation = null;
let currentLocation = null;
let selectedManualLocation = null;
let searchTimeout = null;
let mapInitialized = false;
let selectedFiles = []; // New global to hold selected files

let currentFilters = {
    date: null,
    distance: 50,
    category: 'all'
};

let currentDate = new Date();
let selectedDate = null;

// ========================================
// 2. GOOGLE MAPS INITIALIZATION (Standard)
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
            else setTimeout(loadEventsFromFirebase, 1000);
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

function useHostGPS() {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const loc = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            uploadMap.setCenter(loc); placeUploadMarker(loc);
        },
        () => alert('Could not get location.')
    );
}

function searchHostLocation() {
    const query = prompt("Enter location:");
    if (!query) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results[0]) {
            uploadMap.setCenter(results[0].geometry.location);
            placeUploadMarker(results[0].geometry.location);
        } else alert('Location not found.');
    });
}

// ========================================
// 4. AUTH & ADMIN
// ========================================

auth.onAuthStateChanged((user) => {
    const logSignBox = document.querySelector(".logSignBox");
    const hostBar = document.querySelector(".hostBar");

    if (user) {
        currentUser = user;
        const userEmail = user.email ? user.email.toLowerCase() : "";
        if (logSignBox) {
            logSignBox.innerHTML = `<p style="font-size:0.9rem;color:#aaa;margin-bottom:10px;">${user.email}</p><button class="logSign" onclick="auth.signOut()" style="background:#ff4444;color:white;">Log out</button>`;
        }
        if (hostBar) hostBar.style.display = ALLOWED_HOST_EMAILS.includes(userEmail) ? "block" : "none";
    } else {
        currentUser = null;
        if (logSignBox) {
            logSignBox.innerHTML = `<button class="logSign" onclick="openAuth('login')">Log in</button><button class="logSign" onclick="openAuth('signup')">Sign up</button>`;
        }
        if (hostBar) hostBar.style.display = "none";
    }
});

// ========================================
// 5. HELPER: COMPRESS IMAGE TO BASE64
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
                // Compress to JPEG at 0.7 quality
                resolve(elem.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

// ========================================
// 6. EVENT DISPLAY (Updated for 3D & Arrays)
// ========================================

function renderEventCards(events) {
    const eventsScroll = document.querySelector('.eventsScroll');
    if (!eventsScroll) return;

    if (events.length === 0) {
        eventsScroll.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px;">No events found</p>';
        return;
    }

    eventsScroll.innerHTML = '';
    const now = new Date();

    events.forEach(event => {
        let displayImage = 'https://via.placeholder.com/400x220?text=Event';
        if (event.images && Array.isArray(event.images) && event.images.length > 0) {
            displayImage = event.images[0];
        } else if (event.image) {
            displayImage = event.image;
        }

        // --- 🔴 LIVE NOW LOGIC START ---
        // Parse event date "Dec 25, 2025"
        const eventDateObj = new Date(event.date); 
        const isSameDay = eventDateObj.toDateString() === now.toDateString();
        
        // Parse time "14:30"
        let isLive = false;
        if (isSameDay && event.time) {
            const [hours, mins] = event.time.split(':');
            const eventStart = new Date(eventDateObj);
            eventStart.setHours(hours, mins, 0);
            
            // Assume event lasts 3 hours (you can make this a field later)
            const eventEnd = new Date(eventStart.getTime() + (3 * 60 * 60 * 1000));
            
            if (now >= eventStart && now <= eventEnd) {
                isLive = true;
            }
        }
        // --- 🔴 LIVE NOW LOGIC END ---

        const card = document.createElement('div');
        card.className = 'eventCard';
        card.innerHTML = `
            <div class="eventImage">
                ${isLive ? '<div class="live-badge">LIVE NOW</div>' : ''}
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
// 7. UPLOAD EVENT (MULTIPLE BASE64)
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
        // ✅ Process Multiple Images in parallel
        let imageUrls = [];
        if (selectedFiles.length > 0) {
            console.log(`Compressing ${selectedFiles.length} images...`);
            // Create an array of promises
            const uploadPromises = selectedFiles.map(file => compressImage(file));
            // Wait for all to finish
            imageUrls = await Promise.all(uploadPromises);
            console.log("All images processed.");
        }

    const newEvent = {
            title: eventName,
            category: eventCategory,
            date: new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: eventTime,
            location: eventLocation,
            description: eventDescription,
            tags: eventHashtags.split(' ').filter(tag => tag.startsWith('#')),
            // ✅ Store array of strings instead of single string
            images: imageUrls, 
            lat: selectedEventLocation.lat,
            lng: selectedEventLocation.lng,
            createdAt: new Date(),

            // ✅ NEW LINES ADDED HERE:
            hostId: currentUser ? currentUser.uid : null, 
            hostEmail: currentUser ? currentUser.email : null, 
            views: 0 
        };

        await window.db.collection('events').add(newEvent);

        // Reset Form & Globals
        document.getElementById('eventUploadForm').reset();
        selectedFiles = []; // Clear selected files
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
// 8. UI CONTROLS & INIT
// ========================================

// ... (Standard Menu/Auth/Filter functions omitted for brevity - keep your existing ones) ...
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
    if (typeof google !== 'undefined' && google.maps && !mapInitialized) window.initMap();
    
    // ✅ NEW: Multiple File Selection Listener
    const eventImageInput = document.getElementById("uploadEventImage");
    if (eventImageInput) {
        eventImageInput.addEventListener("change", (e) => {
            // Convert fileList to Array and limit to 3
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

    // Auth Listeners
    document.getElementById("authCloseBtn")?.addEventListener("click", closeAuth);
    document.getElementById("goSignupBtn")?.addEventListener("click", () => openAuth("signup"));
    document.getElementById("goLoginBtn")?.addEventListener("click", () => openAuth("login"));
    document.getElementById("loginForm")?.addEventListener("submit", async (e) => { e.preventDefault(); try { await auth.signInWithEmailAndPassword(document.getElementById("loginEmail").value.trim(), document.getElementById("loginPass").value.trim()); closeAuth(); } catch (error) { alert(error.message); } });

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
        let events = []; snapshot.forEach((doc) => { events.push({ id: doc.id, ...doc.data() }); });
        renderEventCards(events); addEventMarkers(events);
    });
}
// ========================================
// 9. SMART SEARCH (Autocomplete)
// ========================================
const searchInput = document.querySelector('.navSrchBar');
const searchForm = document.querySelector('.navSearch');

if (searchInput) {
    // Create Dropdown Element
    const resultsBox = document.createElement('div');
    resultsBox.className = 'searchResultsBox';
    searchForm.style.position = 'relative'; // Ensure relative positioning
    searchForm.appendChild(resultsBox);

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        resultsBox.innerHTML = '';
        
        if (query.length < 2) {
            resultsBox.style.display = 'none';
            return;
        }

        // Filter currently loaded events (window.db events should be cached in a global variable for best performance, 
        // but here we can grab cards from DOM or fetch fresh. Ideally, maintain a global 'allEvents' array in loadEventsFromFirebase)
        
        // Assuming you updated loadEventsFromFirebase to save to window.allEvents:
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

    // Hide when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) resultsBox.style.display = 'none';
    });
}

// Update loadEventsFromFirebase to store global data for search
// Replace your existing loadEventsFromFirebase with this:
function loadEventsFromFirebase() {
    if(!window.db) return;
    window.db.collection('events').orderBy('createdAt', 'desc').get().then((snapshot) => {
        let events = []; 
        snapshot.forEach((doc) => { events.push({ id: doc.id, ...doc.data() }); });
        
        window.allEvents = events; // STORE GLOBALLY FOR SEARCH
        
        renderEventCards(events); 
        addEventMarkers(events);
    });
}

// ========================================
// 10. DARK/LIGHT MODE TOGGLE
// ========================================
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Init Theme on Load
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') document.body.classList.add('light-mode');

// Add Toggle Button to Menu (Call this inside your existing DOMContentLoaded or manually add button in HTML)
// Example: Add a button to .navMain or .menu in HTML:
// <button onclick="toggleTheme()" class="themeToggle"><i class="fa-solid fa-circle-half-stroke"></i></button>
