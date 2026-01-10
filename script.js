// ========================================
// MAPZO - EVENT DISCOVERY PLATFORM
// ========================================

// 1. GLOBAL VARIABLES
let currentUser = null;
const ALLOWED_HOST_EMAILS = [
    "shreyashmishra506@gmail.com", 
    "realdaksharora@gmail.com",
    "iitianshreyash25@gmail.com" // Added from your screenshot
];

let map = null;
let uploadMap = null;
let eventMarkers = [];
let uploadMarker = null;
let selectedEventLocation = null;
let currentLocation = null;
let mapInitialized = false;
let selectedFiles = [];
let userLocationMarker = null; // To track the blue dot

// 2. GOOGLE MAPS INITIALIZATION
window.initMap = function () {
    if (mapInitialized) return;
    const mapElement = document.querySelector('.map');
    if (!mapElement) return;

    // Default: Kharagpur
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
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
            ]
        });

        mapInitialized = true;
        console.log('✅ Map initialized');

        // Load events
        google.maps.event.addListenerOnce(map, 'tilesloaded', function () {
            if (window.db) loadEventsFromFirebase();
            else setTimeout(loadEventsFromFirebase, 1000);
        });

        // Auto-detect location if allowed
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => updateUserLocationOnMap(pos),
                (err) => console.log("Location auto-detect failed/denied")
            );
        }

    } catch (error) {
        console.error('❌ Map init failed:', error);
    }
};

// 3. ENABLE LOCATION FUNCTION (Called by Button)
window.enableGPS = function() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }

    // Show loading state (optional)
    const locText = document.getElementById('locationDisplay');
    if(locText) locText.innerHTML = "Locating...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            updateUserLocationOnMap(position);
            
            // UI Updates
            if(locText) locText.innerHTML = "Location<br>Active";
            closeLocationModal();
            
            // Center map
            if(map) {
                map.setCenter({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                map.setZoom(15);
            }
        },
        (error) => {
            console.error("GPS Error:", error);
            alert("Please allow location access in your browser settings.");
            if(locText) locText.innerHTML = "Enable<br>Location";
        }
    );
}

// Helper to draw the Blue Dot
function updateUserLocationOnMap(position) {
    const userPos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
    };
    currentLocation = userPos;

    if (!map) return;

    // Remove old marker if exists
    if (userLocationMarker) userLocationMarker.setMap(null);

    // Add Blue Dot
    userLocationMarker = new google.maps.Marker({
        position: userPos,
        map: map,
        title: "You are here",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
        }
    });
}

// 4. UPLOAD MAP FUNCTIONS
function initUploadMap() {
    const uploadMapElement = document.getElementById('uploadMap');
    if (!uploadMapElement) return;
    const defaultCenter = currentLocation || { lat: 22.3200, lng: 87.3150 };

    uploadMap = new google.maps.Map(uploadMapElement, {
        center: defaultCenter,
        zoom: 14,
        styles: [{ elementType: "geometry", stylers: [{ color: "#242f3e" }] }]
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
            scale: 10,
            fillColor: "#1db954",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3
        }
    });
    selectedEventLocation = { lat: location.lat(), lng: location.lng() };
    document.getElementById('selectedLocationText').textContent = `✅ Pinned!`;
}

window.useHostGPS = function() {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition((pos) => {
        const loc = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        uploadMap.setCenter(loc);
        placeUploadMarker(loc);
    });
}

window.searchHostLocation = function() {
    const query = prompt("Enter location name:");
    if (!query) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results[0]) {
            uploadMap.setCenter(results[0].geometry.location);
            placeUploadMarker(results[0].geometry.location);
        } else alert('Location not found.');
    });
}

// 5. EVENT DISPLAY & LOADING
function renderEventCards(events) {
    const eventsScroll = document.querySelector('.eventsScroll');
    if (!eventsScroll) return;
    
    if (events.length === 0) {
        eventsScroll.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">No events found nearby.</p>';
        return;
    }

    eventsScroll.innerHTML = '';
    const now = new Date();

    events.forEach(event => {
        let displayImage = (event.images && event.images.length > 0) ? event.images[0] : (event.image || 'https://via.placeholder.com/400x220');
        
        // Live Logic
        let isLive = false;
        try {
            const eventDateObj = new Date(event.date);
            if (eventDateObj.toDateString() === now.toDateString() && event.time) {
                const [h, m] = event.time.split(':');
                const start = new Date(eventDateObj);
                start.setHours(h, m, 0);
                const end = new Date(start.getTime() + (3 * 3600000)); // 3 hours
                if (now >= start && now <= end) isLive = true;
            }
        } catch(e) {}

        const card = document.createElement('div');
        card.className = 'eventCard';
        card.innerHTML = `
            <div class="eventImage">
                ${isLive ? '<div class="live-badge">LIVE NOW</div>' : ''}
                <img src="${displayImage}" loading="lazy">
                <span class="eventCategory">${event.category}</span>
            </div>
            <div class="eventInfo">
                <h3 class="eventTitle">${event.title}</h3>
                <p class="eventDate"><i class="fa-regular fa-calendar"></i> ${event.date}</p>
                <p class="eventLocation"><i class="fa-solid fa-location-dot"></i> ${event.location}</p>
            </div>
        `;
        card.onclick = () => window.location.href = `event.html?id=${event.id}`;
        eventsScroll.appendChild(card);
    });
}

function addEventMarkers(events) {
    eventMarkers.forEach(m => m.setMap(null));
    eventMarkers = [];
    if (!map) return;
    events.forEach(event => {
        if (!event.lat || !event.lng) return;
        const marker = new google.maps.Marker({
            position: { lat: event.lat, lng: event.lng },
            map: map,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#1db954", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 }
        });
        marker.addListener('click', () => window.location.href = `event.html?id=${event.id}`);
        eventMarkers.push(marker);
    });
}

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

// 6. MODAL & UI FUNCTIONS
window.openLocationModal = () => document.querySelector('.locationOverlay').classList.add('show');
window.closeLocationModal = () => document.querySelector('.locationOverlay').classList.remove('show');
window.openFilterModal = () => document.querySelector('.filterOverlay').classList.add('show');
window.closeFilterModal = () => document.querySelector('.filterOverlay').classList.remove('show');

// 7. AUTH HANDLING
auth.onAuthStateChanged((user) => {
    const logSignBox = document.querySelector(".logSignBox");
    const hostBar = document.querySelector(".hostBar");
    if (user) {
        currentUser = user;
        if(logSignBox) logSignBox.innerHTML = `<p style="color:#aaa;font-size:0.8rem;margin-bottom:8px;">${user.email}</p><button class="logSign" onclick="auth.signOut()" style="background:#d32f2f;">Log Out</button>`;
        if(hostBar) hostBar.style.display = ALLOWED_HOST_EMAILS.includes(user.email) ? "block" : "none";
    } else {
        currentUser = null;
        if(logSignBox) logSignBox.innerHTML = `<button class="logSign" onclick="openAuth('login')">Log In</button><button class="logSign" onclick="openAuth('signup')">Sign Up</button>`;
        if(hostBar) hostBar.style.display = "none";
    }
});

// Auth Modal Controls
window.openAuth = (mode) => {
    document.getElementById("authOverlay").classList.add("show");
    document.getElementById(mode === "signup" ? "signupPage" : "loginPage").classList.add("show");
    document.getElementById(mode === "signup" ? "loginPage" : "signupPage").classList.remove("show");
};
window.closeAuth = () => document.getElementById("authOverlay").classList.remove("show");

// 8. EVENT UPLOAD SUBMIT
window.handleEventSubmit = async function() {
    const btn = document.querySelector('.uploadSubmit');
    btn.textContent = "Posting..."; btn.disabled = true;

    try {
        const name = document.getElementById('eventName').value;
        const cat = document.getElementById('uploadEventCategory').value;
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        const locName = document.getElementById('eventLocation').value;
        const desc = document.getElementById('eventDescription').value;
        
        if(!name || !date || !selectedEventLocation) throw new Error("Please fill name, date, and pin location.");

        // Compress Images
        let imageUrls = [];
        if(selectedFiles.length > 0) {
            imageUrls = await Promise.all(selectedFiles.map(file => compressImage(file)));
        }

        await window.db.collection('events').add({
            title: name,
            category: cat,
            date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: time,
            location: locName,
            description: desc,
            images: imageUrls,
            lat: selectedEventLocation.lat,
            lng: selectedEventLocation.lng,
            hostId: currentUser.uid,
            hostEmail: currentUser.email,
            views: 0,
            createdAt: new Date()
        });

        alert("Event Posted!");
        closeUploadForm();
        document.getElementById('eventUploadForm').reset();
        loadEventsFromFirebase();

    } catch(e) {
        alert(e.message);
    } finally {
        btn.textContent = "Post"; btn.disabled = false;
    }
};

// Helper: Compress Image
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const cvs = document.createElement('canvas');
                const scale = 800 / img.width;
                cvs.width = 800; cvs.height = img.height * scale;
                cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height);
                resolve(cvs.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}

// 9. INITIALIZE
document.addEventListener("DOMContentLoaded", () => {
    if (typeof google !== 'undefined' && google.maps && !mapInitialized) window.initMap();
    
    // Listeners
    document.getElementById("authCloseBtn")?.addEventListener("click", closeAuth);
    document.getElementById("goSignupBtn")?.addEventListener("click", () => openAuth("signup"));
    document.getElementById("goLoginBtn")?.addEventListener("click", () => openAuth("login"));
    
    // ==========================================
// ✅ REPLACE THIS PART (The Login Logic)
// ==========================================

// [DELETE from here...]
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
   // ... old broken code ...
});
// [...to here]


// [PASTE THE NEW CODE HERE]
document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = "AIzaSyBqeFuoFfT-z7YhRoWOIH2nKO_oV3hiQkk"; // Don't forget to paste your key!
    // ... rest of the new script ...
});

    // File Input
    document.getElementById("uploadEventImage")?.addEventListener("change", (e) => {
        selectedFiles = Array.from(e.target.files).slice(0, 3);
        const count = document.getElementById("imageCount");
        if(count) count.textContent = selectedFiles.length + " selected";
    });
});

// Extra Modal Functions
window.openUploadForm = () => {
    if(!currentUser) return openAuth('login');
    document.querySelector('.uploadOverlay').classList.add('show');
    setTimeout(initUploadMap, 200);
}
window.closeUploadForm = () => document.querySelector('.uploadOverlay').classList.remove('show');
window.showManualInput = () => document.querySelector('.manualLocationOverlay').classList.add('show');
window.backToLocationOptions = () => document.querySelector('.manualLocationOverlay').classList.remove('show');
