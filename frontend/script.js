// ========================================
// MAPZO - EVENT DISCOVERY PLATFORM
// ENHANCED SCRIPT WITH EMOJI PINS & REAL-TIME CHAT
// Features: 
// 1. Event location pins with category-based emojis
// 2. Real-time chat for live events
// ========================================

// ========================================
// 1. GLOBAL VARIABLES
// ========================================

// ✅ API KEY
const API_KEY = "AIzaSyDIpZtXSSK99wcbwHGvKEWAykme_6OPp00";

let currentUser = null;

// ✅ ADMIN ACCESS LIST
const API_URL = window.API_URL; // Explicitly define for local usage scope

let map = null;
let uploadMap = null;
let eventMarkers = [];
let eventMarkersMap = new Map(); // Stores {eventId: marker}
let uploadMarker = null;
let selectedEventLocation = null;
let currentLocation = null;
let mapInitialized = false;
let selectedFiles = [];
let userLocationMarker = null;
let hashtagCounts = {}; // Global map for hashtag frequency

// ========================================
// 2. EVENT EMOJI MAPPING
// ========================================

const EVENT_EMOJIS = {
    'music': '🎵',
    'sports': '⚽',
    'food': '🍕',
    'party': '🎉',
    'conference': '💼',
    'workshop': '🎓',
    'festival': '🎪',
    'meetup': '👥',
    'exhibition': '🖼️',
    'performance': '🎭',
    'tech': '💻',
    'health': '🏥',
    'travel': '✈️',
    'education': '📚',
    'business': '💼',
    'default': '📍'
};

// ========================================
// 3. CHAT GLOBAL VARIABLES
// ========================================

let chatListener = null;
let currentChatEventId = null;

// ========================================
// 4. GOOGLE MAPS INITIALIZATION
// ========================================

window.initMap = function () {
    if (mapInitialized) return;

    const mapElement = document.getElementById('mapCanvas');
    if (!mapElement) return;

    // Default to Kharagpur if no location found
    const defaultCenter = { lat: 22.3200, lng: 87.3150 };

    try {
        if (typeof google === 'undefined' || !google.maps) throw new Error('Google Maps not loaded');

        map = new google.maps.Map(mapElement, {
            center: currentLocation || defaultCenter,
            zoom: 14,
            disableDefaultUI: true, // You have custom buttons, so keep this true
            gestureHandling: 'greedy', // 'greedy' allows one-finger panning (good for apps)
            clickableIcons: false, // Prevents clicking random map POIs which can be annoying on mobile
            styles: [
                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
                { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
                { featureType: "poi", stylers: [{ visibility: "off" }] } // Hide all POIs (hospitals, schools, etc)
            ]
        });

        mapInitialized = true;
        console.log('✅ Map initialized');

        google.maps.event.addListenerOnce(map, 'tilesloaded', function () {
            if (typeof loadEventsFromAPI === 'function') loadEventsFromAPI();
            else setTimeout(loadEventsFromAPI, 1500);
        });

        // --- Custom Map Controls Support ---
        const recenterBtn = document.getElementById("recenterBtn");
        const fullscreenBtn = document.getElementById("fullscreenBtn");

        if (recenterBtn) {
            recenterBtn.addEventListener("click", () => {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const pos = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude,
                            };
                            map.setCenter(pos);
                            map.setZoom(15);
                            currentLocation = pos; // Update global

                            // Update/Create 'You are here' marker
                            if (window.userLocationMarker) window.userLocationMarker.setMap(null);
                            window.userLocationMarker = new google.maps.Marker({
                                position: pos,
                                map: map,
                                title: "You are here",
                                icon: {
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 10,
                                    fillColor: "#1db954", // Green
                                    fillOpacity: 1,
                                    strokeColor: "white",
                                    strokeWeight: 3,
                                }
                            });
                        },
                        () => {
                            showToast("Location access denied. Centering to default.", "warning");
                            map.setCenter(defaultCenter);
                        }
                    );
                }
            });
        }

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener("click", () => {
                const mapContainer = document.querySelector(".map-container");
                if (mapContainer) {
                    if (!document.fullscreenElement) {
                        mapContainer.requestFullscreen().catch(err => {
                            console.error(`Error enabling fullscreen: ${err.message}`);
                        });
                    } else {
                        document.exitFullscreen();
                    }
                }
            });
        }

    } catch (error) {
        console.error('❌ Map init failed:', error);
    }
};

// ========================================
// 5. UPLOAD MAP (Host Event Form) - USES GOOGLE MAPS API
// ========================================

function initUploadMap() {
    const uploadMapElement = document.getElementById('uploadMap');
    if (!uploadMapElement) return;

    const defaultCenter = currentLocation || { lat: 22.3200, lng: 87.3150 };

    uploadMap = new google.maps.Map(uploadMapElement, {
        center: defaultCenter,
        zoom: 14,
        disableDefaultUI: true,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] }
        ]
    });

    uploadMap.addListener('click', function (e) {
        placeUploadMarker(e.latLng);
    });

    // 1. AUTOCOMPLETE LOGIC
    const input = document.getElementById("eventLocation");
    if (input) {
        const autocomplete = new google.maps.places.Autocomplete(input);
        autocomplete.bindTo("bounds", uploadMap);

        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) {
                showToast("No details available for input: '" + place.name + "'", "warning");
                return;
            }
            if (place.geometry.viewport) {
                uploadMap.fitBounds(place.geometry.viewport);
            } else {
                uploadMap.setCenter(place.geometry.location);
                uploadMap.setZoom(17);
            }
            placeUploadMarker(place.geometry.location);
            input.value = place.formatted_address || place.name;
        });
    }

    // 2. RECENTER BUTTON
    const recenterBtn = document.getElementById("uploadRecenterBtn");
    if (recenterBtn) {
        recenterBtn.addEventListener("click", () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        uploadMap.setCenter(pos);
                        uploadMap.setZoom(15);
                        placeUploadMarker(new google.maps.LatLng(pos.lat, pos.lng));
                    },
                    () => showToast("Location access denied.", "error")
                );
            }
        });
    }

    // 3. FULLSCREEN BUTTON
    const fullscreenBtn = document.getElementById("uploadFullscreenBtn");
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", () => {
            const wrapper = document.querySelector(".uploadMapWrapper");
            if (wrapper) {
                if (!document.fullscreenElement) {
                    wrapper.requestFullscreen().catch(err => console.log(err));
                } else {
                    document.exitFullscreen();
                }
            }
        });
    }
}

function placeUploadMarker(location) {
    if (uploadMarker) uploadMarker.setMap(null);

    uploadMarker = new google.maps.Marker({
        position: location,
        map: uploadMap,
        animation: google.maps.Animation.DROP,
        draggable: true, // Enable dragging
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#1db954",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3
        }
    });

    // Update location on drag end
    uploadMarker.addListener("dragend", (event) => {
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();

        selectedEventLocation = { lat: newLat, lng: newLng };

        // Update Status Text
        const statusText = document.getElementById('selectedLocationText');
        if (statusText) {
            statusText.textContent = `✅ Selected: ${newLat.toFixed(4)}, ${newLng.toFixed(4)}`;
            statusText.style.color = "#1db954";
        }

        // Reverse Geocode (Optional: Update input text)
        // const geocoder = new google.maps.Geocoder();
        // geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
        //    if (status === "OK" && results[0]) document.getElementById("eventLocation").value = results[0].formatted_address;
        // });
    });

    selectedEventLocation = {
        lat: location.lat(),
        lng: location.lng()
    };

    const statusText = document.getElementById('selectedLocationText');
    if (statusText) {
        statusText.textContent = `✅ Selected: ${location.lat().toFixed(4)}, ${location.lng().toFixed(4)}`;
        statusText.style.color = "#1db954";
    }
}

// ========================================
// 6. GPS FUNCTIONS (Host & User)
// ========================================

function useHostGPS() {
    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", "error");
        return;
    }
    const statusText = document.getElementById('selectedLocationText');
    if (statusText) {
        statusText.textContent = "⌛ Getting location...";
        statusText.style.color = "#aaa";
    }

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
            showToast("Could not get location. Make sure GPS is enabled.", "error");
        }
    );
}

function searchHostLocation() {
    const query = document.getElementById('eventLocation').value;
    if (!query) {
        showToast("Please type a location in the 'Set Location' box first.", "warning");
        return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const loc = results[0].geometry.location;
            if (uploadMap) {
                uploadMap.setCenter(loc);
                placeUploadMarker(loc);
            }
        } else {
            showToast("Location not found. Try being more specific.", "warning");
        }
    });
}

function openLocationModal() {
    toggleBodyScroll(true);
    console.log("Getting User Location...");

    if (!navigator.geolocation) {
        showToast("Geolocation is not supported by your browser.", "error");
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
                    map: map,
                    title: "You are here",
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#1db954", // Green
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                    }
                });

                showToast("Location found! 📍", "success");
            }
        },
        (error) => {
            console.error("Error getting location:", error);
            showToast("Could not get your location. Please check your browser permissions.", "error");
        }
    );
}

// ========================================
// 7. AUTH & SESSION MANAGEMENT
// ========================================

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

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        updateUIForLogin(user);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);
    } else {
        currentUser = null;
        updateUIForLogout();
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
    }
});

async function updateUIForLogin(user) {
    // Fetch full profile (is_host check) & Sync
    let isHost = false;
    let token = await user.getIdToken();
    try {
        // ALWAYS Sync on load to ensure Admin status is up-to-date
        // This replaces the lazy /api/user/me check
        const syncRes = await fetch(`${window.API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token })
        });
        const data = await syncRes.json();

        if (data.success) {
            isHost = data.user.is_host;
            console.log("User Synced:", data.user.email, "| Host:", isHost);
        }
    } catch (e) { console.error("Profile sync error", e); }

    const logSignBox = document.querySelector(".logSignBox");
    const hostBar = document.querySelector(".hostBar");

    // Modified to link to Profile Page
    if (logSignBox) {
        logSignBox.innerHTML = `
            <div style="text-align:center;">
                <img src="${user.photoURL || 'https://via.placeholder.com/40'}" 
                     style="width:40px; height:40px; border-radius:50%; object-fit:cover; margin-bottom:8px; border:2px solid #1db954;">
                <p style="font-size:0.8rem;color:#fff;margin-bottom:10px;font-weight:700;">${user.displayName || 'User'}</p>
                
                <button class="logSign" onclick="window.location.href='profile.html'" 
                        style="background:rgba(29, 185, 84, 0.2); border:1px solid #1db954; color:#fff; margin-bottom:8px;">
                    View Profile
                </button>
            </div>`;
    }

    if (hostBar) {
        hostBar.style.display = isHost ? "flex" : "none";
    }

    // Auto-Trigger Location Check-in
    checkInLocation();

    // Ensure User Doc Exists in Firestore (Legacy / Optional if fully migrating)
    const userRef = window.db.collection('users').doc(user.uid);
    userRef.get().then((doc) => {
        if (!doc.exists) {
            userRef.set({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
}

// Helper: Smart Location Check-in
function checkInLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // Reverse Geocode to get City Name
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLocation.lat}&lon=${currentLocation.lng}`);
                const data = await res.json();
                const city = data.address.city || data.address.town || data.address.village || "Unknown Location";

                // Update Header UI
                const locationDisplay = document.getElementById('locationDisplay');
                if (locationDisplay) locationDisplay.innerHTML = `<span style="font-size:1.1em; font-weight:bold;">${city}</span><br><span style="font-size:0.8em; color:#aaa;">Current Location</span>`;

                if (window.userLocationMarker) window.userLocationMarker.setMap(null);
                // Re-center map if not already done
                if (map) map.setCenter(currentLocation);

            } catch (err) {
                console.error("Reverse geocode failed:", err);
                const locationDisplay = document.getElementById('locationDisplay');
                if (locationDisplay) locationDisplay.innerHTML = "Location<br>Enabled";
            }
        }, (err) => {
            console.log("Auto-location denied or failed:", err);
        });
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
    auth.signOut().then(() => {
        showToast("Logged out successfully.", "success");
        window.location.reload();
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();

    auth.signInWithPopup(provider)
        .then(async (result) => {
            const user = result.user;
            console.log("Google Sign In Success:", user.email);

            // SYNC WITH BACKEND
            try {
                const idToken = await user.getIdToken();
                const res = await fetch(`${API_URL}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken })
                });
                const data = await res.json();

                if (data.success) {
                    console.log("Backend Sync Success:", data.user);
                    // Force UI update with correct host status
                    await updateUIForLogin(user);
                }
            } catch (err) {
                console.error("Backend Sync Failed:", err);
            }

            closeAuth();
            showToast(`Welcome, ${user.displayName || 'User'}! 🚀`, "success");
        })
        .catch((error) => {
            console.error("Google Error:", error);
            showToast("Google Sign In Failed", "error");
        });
}

// ========================================
// 8. UI CONTROLS & INIT
// ========================================

function toggleMenu() {
    document.querySelector(".menu").classList.toggle("menuShow");
    document.querySelector(".menuOverlay").classList.toggle("show");
}

function openAuth(mode) {
    toggleBodyScroll(true);
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
    toggleBodyScroll(false);
}

function openUploadForm() {
    if (!currentUser) return showToast("Log in first.", "warning");
    const userEmail = currentUser.email ? currentUser.email.toLowerCase() : "";
    const hostBar = document.querySelector(".hostBar");
    if (hostBar.style.display === "none") return showToast("Not authorized. Please verify as host.", "warning");
    document.querySelector(".uploadOverlay").classList.add("show");
    toggleBodyScroll(true);
    setTimeout(() => {
        if (!uploadMap) {
            initUploadMap();
        } else {
            google.maps.event.trigger(uploadMap, 'resize');
            if (selectedEventLocation) {
                uploadMap.setCenter(selectedEventLocation);
            }
        }
    }, 300);
}

function closeUploadForm() {
    document.querySelector(".uploadOverlay").classList.remove("show");
    toggleBodyScroll(false);
}

// ========================================
// 9. EVENT DISPLAY (ENHANCED WITH CHAT)
// ========================================

async function loadEventsFromAPI(filters = {}) {
    // Determine the API endpoint
    // If we have specific coordinates filter, might want to use a different endpoint or params
    // For now, fetch all or search query

    let url = `${API_URL}/api/events`;
    const params = new URLSearchParams();

    // Add search query if present
    if (filters.search) {
        params.append('search', filters.search);
    }

    try {
        const res = await fetch(`${url}?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch events');

        const data = await res.json();

        if (data.success) {
            window.allEvents = data.events; // Store globally
            renderEventCards(data.events);
            addEventMarkers(data.events);

            // If location is available, we could sort by distance (optional)
            if (currentLocation) {
                // Trigger sort logic here if needed
                // applyFilters(); 
            }
        } else {
            console.error("API returned error:", data.error);
            showToast("Failed to load events", "error");
        }
    } catch (err) {
        console.error("Error loading events:", err);
        // Don't show toast on initial load to avoid spam if offline/cached
        if (filters.search) showToast("Network error searching events", "error");
    }
}


function renderEventCards(events) {
    const eventsScroll = document.querySelector('.eventsScroll');
    if (!eventsScroll) return;

    if (events.length === 0) {
        eventsScroll.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 40px;">No events found</p>';
        return;
    }

    eventsScroll.innerHTML = '';

    events.forEach(event => {
        let displayImage = 'images/Untitled.png'; // Updated reliable placeholder
        if (event.image_url) {
            displayImage = event.image_url;
        } else if (event.images && event.images.length > 0) {
            displayImage = event.images[0];
        }

        // Check if event is live (current date/time matches event date)
        const isLive = checkIfEventIsLive(event);
        const liveBadge = isLive ? '<span class="liveBadge">🔴 LIVE</span>' : '';
        const chatButton = isLive ? `<button class="chatBtn" onclick="openChatModal('${event.id}')">💬 Chat</button>` : '';

        // Format Date
        const dateObj = new Date(event.event_date);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const locationStr = event.venue_name || event.address || event.location || "Unknown Location";

        const card = document.createElement('div');
        card.className = 'eventCard';
        card.innerHTML = `
            <div class="eventImage">
                <img src="${displayImage}" alt="${event.title}" loading="lazy">
                <span class="eventCategory">${event.category}</span>
                ${liveBadge}
            </div>
            <div class="eventInfo">
                <h3 class="eventTitle">${event.title}</h3>
                <p class="eventDate"><i class="fa-regular fa-calendar"></i> ${dateStr}</p>
                <p class="eventLocation"><i class="fa-solid fa-location-dot"></i> ${locationStr}</p>
                <div class="eventActions">
                    ${chatButton}
                </div>
            </div>
        `;

        // INTERACTIVE MAP HOVER EFFECT
        card.addEventListener('mouseenter', () => {
            const marker = eventMarkersMap.get(event.id);
            if (marker) {
                marker.setAnimation(google.maps.Animation.BOUNCE);
                marker.setZIndex(9999);
                // Optional: Pan to event
                // map.panTo(marker.getPosition());
            }
        });

        card.addEventListener('mouseleave', () => {
            const marker = eventMarkersMap.get(event.id);
            if (marker) {
                marker.setAnimation(null);
                marker.setZIndex(null);
            }
        });

        card.addEventListener('click', (e) => {
            // Don't navigate if clicking chat button
            if (e.target.classList.contains('chatBtn')) return;
            window.location.href = `event.html?id=${event.id}`;
        });
        eventsScroll.appendChild(card);
    });
}

// ========================================
// 10. EMOJI MARKERS FOR EVENT LOCATIONS
// ========================================

function addEventMarkers(events) {
    // Clear existing markers
    eventMarkers.forEach(marker => marker.setMap(null));
    eventMarkers = [];
    eventMarkersMap.clear();

    console.log("Adding markers for", events.length, "events. Map exists?", !!map); // Debug Log
    if (!map) return;

    events.forEach(event => {
        if (!event.latitude || !event.longitude) return;

        // Create icon: Image if available, else Emoji
        // Create icon: Always use Emoji as per new aesthetic request
        let icon;
        const emoji = EVENT_EMOJIS[event.category.toLowerCase()] || EVENT_EMOJIS['default'];
        icon = createEmojiIcon(emoji);

        // Create custom badge-like marker
        const marker = new google.maps.Marker({
            position: { lat: event.latitude, lng: event.longitude },
            map: map,
            icon: icon,
            title: event.title,
            animation: google.maps.Animation.DROP
        });

        // Add to storage
        eventMarkers.push(marker);
        eventMarkersMap.set(event.id, marker);

        // Add click listener -> Redirect
        marker.addListener('click', () => {
            window.location.href = `event.html?id=${event.id}`;
        });

        // Hover listener -> Highlight on Map (Scale Up)
        marker.addListener('mouseover', () => {
            marker.setZIndex(9999);
            // Could add custom scaling if icon supports it, or just Z-index
        });
    });

    // Fit bounds if we have markers
    if (eventMarkers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        eventMarkers.forEach(m => bounds.extend(m.getPosition()));
        map.fitBounds(bounds);

        // Don't zoom in too close for single marker
        const listener = google.maps.event.addListener(map, "idle", () => {
            if (map.getZoom() > 15) map.setZoom(15);
            google.maps.event.removeListener(listener);
        });
    }
}

function createEmojiIcon(emoji) {
    // Premium Badge-like Pin with Emoji
    const svg = `
    <svg width="60" height="70" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.5)"/>
            </filter>
        </defs>
        <!-- Black Body, Green Border -->
        <path d="M25 0 C11.2 0 0 11.2 0 25 C0 42 25 60 25 60 C25 60 50 42 50 25 C50 11.2 38.8 0 25 0 Z" 
              fill="#121212" filter="url(#shadow)" stroke="#1db954" stroke-width="3"/>
        <text x="25" y="32" text-anchor="middle" font-family="Segoe UI, Emoji, sans-serif" font-size="24">${emoji}</text>
    </svg>`;

    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(60, 70),
        anchor: new google.maps.Point(30, 70),
        labelOrigin: new google.maps.Point(30, 30)
    };
}

function createImagePin(imageUrl) {
    // Pin with Embedded Image
    // Note: External images in data URIs might be blocked by some CSPs or Map renderers.
    // If it fails, it will show the green pin.
    const svg = `
    <svg width="60" height="70" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.5)"/>
            </filter>
            <clipPath id="circleView">
                <circle cx="25" cy="25" r="20" fill="#fff" />
            </clipPath>
        </defs>
        <path d="M25 0 C11.2 0 0 11.2 0 25 C0 42 25 60 25 60 C25 60 50 42 50 25 C50 11.2 38.8 0 25 0 Z" 
              fill="#1db954" filter="url(#shadow)" stroke="#ffffff" stroke-width="2"/>
        <circle cx="25" cy="25" r="20" fill="#121212" />
        <image x="5" y="5" width="40" height="40" href="${imageUrl}" clip-path="url(#circleView)" preserveAspectRatio="xMidYMid slice" />
    </svg>`;

    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(60, 70),
        anchor: new google.maps.Point(30, 70)
    };
}



// ========================================
// 11. CHAT FUNCTIONALITY
// ========================================

// Check if event is currently live
// Check if event is currently live
function checkIfEventIsLive(event) {
    const d = event.event_date || event.fullDate || event.date;
    const end = event.end_time;
    if (!d) return false;

    const eventDate = new Date(d);
    const now = new Date();

    // If End Time exists, Live = Start <= Now <= End
    if (end) {
        const endDate = new Date(end);
        return now >= eventDate && now <= endDate;
    }

    // Legacy Fallback: Live if within 2 hours of start
    const timeDiff = Math.abs(now - eventDate);
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff <= 2;
}

// Open chat modal for an event
function openChatModal(eventId) {
    if (!currentUser) {
        showToast('Please log in to join the chat.', 'error');
        openAuth('login');
        return;
    }

    currentChatEventId = eventId;

    // Create chat modal if it doesn't exist
    let chatModal = document.getElementById('chatModal');
    if (!chatModal) {
        createChatModal();
        chatModal = document.getElementById('chatModal');
    }

    // Show modal
    chatModal.classList.add('show');

    // Load event info and messages
    loadEventChatInfo(eventId);
    loadChatMessages(eventId);

    // Focus on input
    const messageInput = document.getElementById('chatMessageInput');
    if (messageInput) {
        messageInput.focus();
    }
}

// Create chat modal HTML
function createChatModal() {
    const modalHTML = `
        <div id="chatModal" class="chatModal">
            <div class="chatModalContent">
                <div class="chatHeader">
                    <h3 id="chatEventTitle">Event Chat</h3>
                    <button class="chatCloseBtn" onclick="closeChatModal()">&times;</button>
                </div>
                <div class="chatMessages" id="chatMessages"></div>
                <div class="chatInputContainer">
                    <input type="text" id="chatMessageInput" placeholder="Type a message..." 
                           onkeypress="handleChatKeyPress(event)">
                    <button onclick="sendChatMessage()">Send</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add chat styles
    const chatStyles = `
        <style>
            .chatModal {
                display: none;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
            }
            
            .chatModal.show {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .chatModalContent {
                background: #242f3e;
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
                height: 80%;
                max-height: 600px;
                display: flex;
                flex-direction: column;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            
            .chatHeader {
                padding: 20px;
                border-bottom: 1px solid #38414e;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .chatHeader h3 {
                margin: 0;
                color: #fff;
            }
            
            .chatCloseBtn {
                background: none;
                border: none;
                color: #fff;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            }
            
            .chatMessages {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .chatMessage {
                padding: 10px 15px;
                border-radius: 15px;
                max-width: 80%;
                word-wrap: break-word;
            }
            
            .chatMessage.own {
                background: #1db954;
                color: white;
                align-self: flex-end;
            }
            
            .chatMessage.other {
                background: #38414e;
                color: #fff;
                align-self: flex-start;
            }
            
            .chatMessage .sender {
                font-size: 0.8em;
                opacity: 0.7;
                margin-bottom: 5px;
            }
            
            .chatInputContainer {
                padding: 20px;
                border-top: 1px solid #38414e;
                display: flex;
                gap: 10px;
            }
            
            .chatInputContainer input {
                flex: 1;
                padding: 10px;
                border: 1px solid #38414e;
                border-radius: 20px;
                background: #1a2332;
                color: #fff;
                outline: none;
            }
            
            .chatInputContainer button {
                padding: 10px 20px;
                background: #1db954;
                color: white;
                border: none;
                border-radius: 20px;
                cursor: pointer;
            }
            
            .chatInputContainer button:hover {
                background: #18a449;
            }
            
            /* Live badge for event cards */
            .liveBadge {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #ff4444;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.7rem;
                font-weight: bold;
            }
            
            /* Chat button for event cards */
            .chatBtn {
                background: #1db954;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 15px;
                cursor: pointer;
                font-size: 0.9rem;
                margin-top: 10px;
            }
            
            .chatBtn:hover {
                background: #18a449;
            }
            
            .eventActions {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', chatStyles);
}

// Load event info for chat header
function loadEventChatInfo(eventId) {
    window.db.collection('events').doc(eventId).get()
        .then((doc) => {
            if (doc.exists) {
                const event = doc.data();
                const titleElement = document.getElementById('chatEventTitle');
                if (titleElement) {
                    titleElement.textContent = `💬 ${event.title}`;
                }
            }
        })
        .catch((error) => {
            console.error("Error loading event info:", error);
        });
}

// Load chat messages for an event
function loadChatMessages(eventId) {
    // Remove existing listener
    if (chatListener) {
        chatListener();
    }

    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    // Clear existing messages
    messagesContainer.innerHTML = '';

    // Set up real-time listener
    chatListener = window.db.collection('chats')
        .doc(eventId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    addChatMessageToUI(message);
                }
            });

            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, (error) => {
            console.error("Error loading messages:", error);
        });
}

// Add a message to the chat UI
function addChatMessageToUI(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    const isOwnMessage = currentUser && message.senderId === currentUser.uid;

    messageDiv.className = `chatMessage ${isOwnMessage ? 'own' : 'other'}`;

    if (isOwnMessage) {
        messageDiv.innerHTML = `
            <div>${message.text}</div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="sender">${message.senderName}</div>
            <div>${message.text}</div>
        `;
    }

    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send a chat message
function sendChatMessage() {
    if (!currentChatEventId || !currentUser) return;

    const messageInput = document.getElementById('chatMessageInput');
    const messageText = messageInput.value.trim();

    if (!messageText) return;

    const messageData = {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email.split('@')[0],
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    window.db.collection('chats')
        .doc(currentChatEventId)
        .collection('messages')
        .add(messageData)
        .then(() => {
            messageInput.value = '';
        })
        .catch((error) => {
            console.error("Error sending message:", error);
            showToast("Failed to send message.", "error");
        });
}

// Handle Enter key in chat input
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

// Close chat modal
function closeChatModal() {
    const chatModal = document.getElementById('chatModal');
    if (chatModal) {
        chatModal.classList.remove('show');
    }

    // Remove listener
    if (chatListener) {
        chatListener();
        chatListener = null;
    }

    currentChatEventId = null;
}

// ========================================
// 12. UPLOAD EVENT (ENHANCED WITH CHAT SETUP)
// ========================================
// ========================================
// HELPER: IMAGE COMPRESSION
// ========================================
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Resize logic: Max width 800px to save DB space
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Return Base64 string (JPEG at 70% quality)
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };

            img.onerror = (error) => reject(error);
        };

        reader.onerror = (error) => reject(error);
    });
}

// ✅ Fix: Add Image Input Listener
const uploadImageInput = document.getElementById('uploadEventImage');
if (uploadImageInput) {
    uploadImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedFiles = [file];
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('imagePreview').src = e.target.result;
                document.getElementById('imagePreviewContainer').style.display = 'block';
                document.getElementById('uploadPlaceholder').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });
}

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
    const eventEndTime = document.getElementById('eventEndTime').value;

    if (!eventName || !eventCategory || !eventDate || !eventLocation || !selectedEventLocation || !eventEndTime) {
        showToast("Please fill all required fields (including End Time) and pin location.", "warning");
        submitBtn.disabled = false; submitBtn.textContent = "Post";
        return;
    }

    try {
        const token = await currentUser.getIdToken();
        let imageUrl = null;

        // 1. Upload Image
        if (selectedFiles.length > 0) {
            const base64Img = await compressImage(selectedFiles[0]);
            const res = await fetch(`${API_URL}/api/events/upload-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ imageBase64: base64Img })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Image upload failed");
            imageUrl = data.image_url;
        }

        // 2. Create Event
        const newEvent = {
            title: eventName,
            category: eventCategory,
            event_date: `${eventDate}T${eventTime}:00Z`, // ISO format
            end_time: `${eventDate}T${eventEndTime}:00Z`, // Assumes same day
            venue_name: eventLocation.split(',')[0], // Simple heuristic
            address: eventLocation,
            description: eventDescription,
            // tags: eventHashtags, // DB doesn't have tags col yet, usually stored in description or array
            latitude: selectedEventLocation.lat,
            longitude: selectedEventLocation.lng,
            image_url: imageUrl
        };

        const res = await fetch(`${API_URL}/api/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newEvent)
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Event creation failed");

        document.getElementById('eventUploadForm').reset();
        selectedFiles = [];
        document.getElementById('imagePreviewContainer').style.display = 'none';
        document.getElementById('uploadPlaceholder').style.display = 'flex';
        document.getElementById('selectedLocationText').textContent = '📍 No location pinned yet';
        if (uploadMarker) { uploadMarker.setMap(null); uploadMarker = null; }
        selectedEventLocation = null;

        closeUploadForm();
        showToast("Event posted successfully! 🎉", "success");
        loadEventsFromAPI();

    } catch (error) {
        console.error('Error:', error);
        showToast("Failed to post event.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Post";
    }
}

// ========================================
// 13. SMART HASHTAG SEARCH
// ========================================

const searchInput = document.querySelector('.navSrchBar');
const searchForm = document.querySelector('.navSearch');

if (searchInput) {
    const resultsBox = document.createElement('div');
    resultsBox.className = 'searchResultsBox';
    // Style directly to ensure dark mode consistency and fix "highlight" glitch
    Object.assign(resultsBox.style, {
        position: 'absolute',
        top: '100%',
        left: '0',
        width: '100%',
        background: '#242f3e',
        border: '1px solid #38414e',
        borderRadius: '0 0 10px 10px',
        display: 'none',
        zIndex: '1000',
        overflow: 'hidden',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
    });

    // Ensure relative positioning for parent
    if (searchForm) searchForm.style.position = 'relative';
    if (searchForm) searchForm.appendChild(resultsBox);

    // Helper: Extract and Count Hashtags
    function getPopularHashtags() {
        if (!window.allEvents) return [];
        const tagMap = {};

        window.allEvents.forEach(event => {
            // Extract from title and description
            const text = (event.title + " " + event.description).toLowerCase();
            const matches = text.match(/#[\w]+/g);
            if (matches) {
                matches.forEach(tag => {
                    tagMap[tag] = (tagMap[tag] || 0) + 1;
                });
            }
        });

        // Convert to array and sort by count (desc)
        return Object.entries(tagMap)
            .sort((a, b) => b[1] - a[1]) // Sort by count
            .map(entry => ({ tag: entry[0], count: entry[1] }));
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        resultsBox.innerHTML = '';

        if (query.length === 0) {
            resultsBox.style.display = 'none';
            return;
        }

        // 1. Hashtag Suggestions
        if (query.startsWith('#')) {
            const popularTags = getPopularHashtags();
            const matches = popularTags.filter(t => t.tag.includes(query));

            if (matches.length > 0) {
                resultsBox.style.display = 'block';
                matches.slice(0, 5).forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'searchResultItem';
                    div.style.padding = '10px';
                    div.style.borderBottom = '1px solid #38414e';
                    div.style.cursor = 'pointer';
                    div.style.color = '#fff';
                    div.style.display = 'flex';
                    div.style.justifyContent = 'space-between';

                    div.innerHTML = `
                        <span><span style="color:#1db954; font-weight:bold;">${item.tag}</span> <span style="font-size:0.8em; color:#888;">(${item.count} events)</span></span>
                        <i class="fa-solid fa-hashtag" style="color:#666;"></i>
                    `;

                    div.onmouseover = () => div.style.background = '#38414e';
                    div.onmouseout = () => div.style.background = 'transparent';

                    div.onclick = () => {
                        searchInput.value = item.tag; // Auto-fill
                        resultsBox.style.display = 'none';
                        loadEventsFromAPI({ search: item.tag.replace('#', '') }); // Search
                    };
                    resultsBox.appendChild(div);
                });
                return;
            }
        }

        // 2. Fallback: Event Title Match (Legacy)
        const eventMatches = (window.allEvents || []).filter(event =>
            event.title.toLowerCase().includes(query)
        );

        if (eventMatches.length > 0) {
            resultsBox.style.display = 'block';
            eventMatches.slice(0, 5).forEach(event => {
                const div = document.createElement('div');
                div.className = 'searchResultItem';
                div.style.padding = '10px';
                div.style.borderBottom = '1px solid #38414e';
                div.style.cursor = 'pointer';
                div.style.color = '#fff';

                div.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-regular fa-calendar" style="color:#aaa;"></i>
                        <div>
                            <p style="margin:0; font-weight:bold; font-size:0.9rem;">${event.title}</p>
                            <p style="margin:0; font-size:0.75rem; color:#888;">${event.location}</p>
                        </div>
                    </div>
                `;

                div.onmouseover = () => div.style.background = '#38414e';
                div.onmouseout = () => div.style.background = 'transparent';

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

// ========================================
// 14. ADVANCED FILTER LOGIC (UNCHANGED)
// ========================================

const filterState = {
    date: null,
    distance: 1000, // New Max
    category: 'all',
    activeTab: 'date'
};

function fixFilterButtons() {
    const modal = document.querySelector('.filterModal');
    if (!modal) return;

    const allBtns = modal.querySelectorAll('button, .categoryCard, .quickFilterBtn, .filterTab, .filterApply, .filterReset, .filterClose');
    allBtns.forEach(btn => {
        btn.setAttribute('type', 'button');
        if (btn.hasAttribute('onclick')) {
            btn.removeAttribute('onclick');
        }
    });
}

document.addEventListener('click', function (e) {
    if (e.target.closest('.filterModal')) {
        const btn = e.target.closest('button') || e.target.closest('.categoryCard');
        if (btn) {
            if (btn.classList.contains('filterApply')) {
                e.preventDefault();
                applyFilters();
            } else if (btn.classList.contains('filterReset')) {
                e.preventDefault();
                resetFilters();
            } else if (btn.classList.contains('filterClose')) {
                e.preventDefault();
                closeFilterModal();
            }
        }
    }
}, true);

function openFilterModal() {
    toggleBodyScroll(true);
    fixFilterButtons();
    document.querySelector('.filterOverlay').classList.add('show');
    initCalendar();

    const slider = document.getElementById('distanceRange');
    const displayVal = filterState.distance;
    if (slider) {
        slider.value = displayVal;
        updateDistanceDisplay(displayVal);
    }
}

function closeFilterModal() {
    document.querySelector('.filterOverlay').classList.remove('show');
    toggleBodyScroll(false);
}

function resetFilters() {
    filterState.date = null;
    filterState.distance = 1000;
    filterState.category = 'all';

    document.querySelectorAll('.calendarDay').forEach(d => d.classList.remove('selected'));
    document.querySelectorAll('.quickFilterBtn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.categoryCard').forEach(c => c.classList.remove('active'));

    const allCatBtn = document.querySelector('.categoryCard[data-category="all"]');
    if (allCatBtn) allCatBtn.classList.add('active');

    const distRange = document.getElementById('distanceRange');
    if (distRange) {
        distRange.value = 1000;
        updateDistanceDisplay(1000);
    }

    applyFilters();
}

const filterTabs = document.querySelectorAll('.filterTab');
filterTabs.forEach(tab => {
    tab.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        filterTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.filterTabContent').forEach(c => c.classList.remove('active', 'show'));

        this.classList.add('active');
        const targetId = this.getAttribute('data-tab') + 'Tab';
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
            targetContent.classList.add('active');
            setTimeout(() => targetContent.classList.add('show'), 10);
        }
    });
});

let currentCalendarDate = new Date();

function initCalendar() {
    const monthDisplay = document.getElementById('currentMonth');
    const calendarDays = document.getElementById('calendarDays');
    if (!calendarDays) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthDisplay.innerText = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;

    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();

    calendarDays.innerHTML = "";

    for (let i = 0; i < firstDay; i++) {
        calendarDays.appendChild(document.createElement('div'));
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendarDay';
        dayDiv.innerText = i;

        const thisDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), i);

        if (thisDate < today) {
            dayDiv.classList.add('disabled');
        } else {
            dayDiv.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                selectDate(thisDate, dayDiv);
            };
        }

        if (thisDate.getTime() === today.getTime()) dayDiv.classList.add('today');

        if (filterState.date instanceof Date && thisDate.getTime() === filterState.date.getTime()) {
            dayDiv.classList.add('selected');
        }

        calendarDays.appendChild(dayDiv);
    }
}

const prevM = document.getElementById('prevMonth');
const nextM = document.getElementById('nextMonth');
if (prevM) prevM.onclick = (e) => { e.preventDefault(); currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); initCalendar(); };
if (nextM) nextM.onclick = (e) => { e.preventDefault(); currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); initCalendar(); };

function selectDate(date, element) {
    filterState.date = date;
    document.querySelectorAll('.calendarDay').forEach(d => d.classList.remove('selected'));
    document.querySelectorAll('.quickFilterBtn').forEach(b => b.classList.remove('active'));
    element.classList.add('selected');
}

document.querySelectorAll('.quickFilterBtn[data-quick]').forEach(btn => {
    btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();

        const type = this.getAttribute('data-quick');
        document.querySelectorAll('.quickFilterBtn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.calendarDay').forEach(d => d.classList.remove('selected'));
        this.classList.add('active');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (type === 'today') filterState.date = today;
        if (type === 'tomorrow') {
            const tmrw = new Date(today);
            tmrw.setDate(tmrw.getDate() + 1);
            filterState.date = tmrw;
        }
        if (type === 'week') filterState.date = 'week';
        if (type === 'month') filterState.date = 'month';
    };
});

function updateDistanceDisplay(val) {
    const numVal = parseFloat(val);
    const distRange = document.getElementById('distanceRange');
    const distInput = document.getElementById('distanceInput');

    if (distRange) {
        distRange.value = numVal;
        // Percentage based on 0.1 to 1000 range
        const percentage = ((numVal - 0.1) / (1000 - 0.1)) * 100;
        distRange.style.setProperty('--value', `${percentage}%`);
    }
    if (distInput) distInput.value = numVal;

    filterState.distance = numVal;
}

function adjustDistance(delta) {
    const range = document.getElementById('distanceRange');
    if (!range) return;

    let current = parseFloat(range.value);
    // Dynamic step based on current value
    let step = 1;
    if (current < 1) step = 0.1;
    else if (current < 10) step = 0.5;
    else if (current < 100) step = 5;
    else step = 50;

    let newValue = current + (delta * step);
    if (newValue < 0.1) newValue = 0.1;
    if (newValue > 1000) newValue = 1000;

    updateDistanceDisplay(newValue);
}

const dRange = document.getElementById('distanceRange');
const dInput = document.getElementById('distanceInput');
if (dRange) dRange.addEventListener('input', (e) => updateDistanceDisplay(e.target.value));
if (dInput) dInput.addEventListener('input', (e) => updateDistanceDisplay(e.target.value));

document.querySelectorAll('.quickFilterBtn[data-distance]').forEach(btn => {
    btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        updateDistanceDisplay(this.getAttribute('data-distance'));
        document.querySelectorAll('#distanceTab .quickFilterBtn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    };
});

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function deg2rad(deg) { return deg * (Math.PI / 180); }

const categoryGrid = document.getElementById('categoryGrid');
if (categoryGrid) {
    const cards = categoryGrid.querySelectorAll('.categoryCard');
    cards.forEach(card => {
        card.removeAttribute('onclick');

        card.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            cards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            filterState.category = this.getAttribute('data-category');
        });
    });
}

document.getElementById('categorySearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.categoryCard').forEach(card => {
        const txt = card.innerText.toLowerCase();
        card.style.display = txt.includes(term) ? 'flex' : 'none';
    });
});

function applyFilters() {
    if (!window.allEvents) return closeFilterModal();

    if (filterState.distance < 1000 && !currentLocation) {
        showToast("Please enable location to filter by distance.", "warning");
    }

    const filtered = window.allEvents.filter(event => {
        let matchDate = true;
        let matchDist = true;
        let matchCat = true;

        if (filterState.date) {
            const eDate = new Date(event.event_date || event.date); eDate.setHours(0, 0, 0, 0);
            const today = new Date(); today.setHours(0, 0, 0, 0);

            if (filterState.date instanceof Date) {
                const fDate = new Date(filterState.date); fDate.setHours(0, 0, 0, 0);
                matchDate = eDate.getTime() === fDate.getTime();
            } else if (filterState.date === 'week') {
                const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
                matchDate = eDate >= today && eDate <= nextWeek;
            } else if (filterState.date === 'month') {
                matchDate = eDate.getMonth() === today.getMonth() && eDate.getFullYear() === today.getFullYear();
            }
        }

        if (filterState.distance < 1000) {
            const lat = event.latitude || event.lat;
            const lng = event.longitude || event.lng;

            if (currentLocation && lat && lng) {
                const km = getDistanceFromLatLonInKm(currentLocation.lat, currentLocation.lng, parseFloat(lat), parseFloat(lng));
                event.distance = km; // Store for sorting
                matchDist = km <= filterState.distance;
            } else {
                matchDist = false;
            }
        }

        if (filterState.category !== 'all') {
            const eCat = event.category ? event.category.toLowerCase() : "";
            const fCat = filterState.category.toLowerCase();
            matchCat = (eCat === fCat);
        }

        return matchDate && matchDist && matchCat;
    });

    // DETERMINISTIC SORTING based on Active Tab
    const activeDateTab = document.querySelector('.filterTab[data-tab="date"]').classList.contains('active');
    const activeDistTab = document.querySelector('.filterTab[data-tab="distance"]').classList.contains('active');

    if (activeDistTab) {
        // Sort by Distance ASC
        filtered.sort((a, b) => (parseFloat(a.distance) || 99999) - (parseFloat(b.distance) || 99999));
        console.log("Sort: Distance");
    } else if (activeDateTab) {
        // Sort by Date ASC
        filtered.sort((a, b) => new Date(a.event_date || a.date) - new Date(b.event_date || b.date));
        console.log("Sort: Date");
    } else {
        // Default Sort: Date
        filtered.sort((a, b) => new Date(a.event_date || a.date) - new Date(b.event_date || b.date));
    }

    renderEventCards(filtered);
    addEventMarkers(filtered);

    if (filtered.length === 0) {
        showToast("No events found with these filters.", "info");
    }

    closeFilterModal();
}

// Initial Fix
fixFilterButtons();

// ========================================
// 15. INIT LISTENERS
// ========================================

// ========================================
// 15. INIT LISTENERS
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    if (typeof google !== 'undefined' && google.maps && !mapInitialized) window.initMap();

    // --- SEARCH LISTENER ---
    const searchForm = document.querySelector(".navSearch");
    if (searchForm) {
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = searchForm.querySelector("input");
            const query = input.value.trim();
            console.log("Searching for:", query);
            loadEventsFromAPI({ search: query });
            document.getElementById('searchSuggestions').style.display = 'none';
        });

        // Hashtag Input Listener
        const hInput = document.getElementById('navHashtagInput');
        if (hInput) {
            hInput.addEventListener('input', (e) => {
                const val = e.target.value.toLowerCase();
                const suggBox = document.getElementById('searchSuggestions');
                if (!val || !val.startsWith('#')) {
                    suggBox.style.display = 'none';
                    return;
                }

                const matches = Object.keys(window.hashtagCounts || {})
                    .filter(tag => tag.includes(val))
                    .sort((a, b) => window.hashtagCounts[b] - window.hashtagCounts[a]) // Sort by freq
                    .slice(0, 5);

                if (matches.length > 0) {
                    suggBox.innerHTML = matches.map(tag => `
                        <div class="suggestionItem" onclick="selectHashtag('${tag}')">
                            <span class="suggestionTag">${tag}</span>
                            <span class="suggestionCount">${window.hashtagCounts[tag]} uses</span>
                        </div>
                    `).join('');
                    suggBox.style.display = 'block';
                } else {
                    suggBox.style.display = 'none';
                }
            });

            // Hide on click outside
            document.addEventListener('click', (e) => {
                if (!searchForm.contains(e.target)) {
                    document.getElementById('searchSuggestions').style.display = 'none';
                }
            });
        }
    }

    // Global selector
    window.selectHashtag = (tag) => {
        const input = document.getElementById('navHashtagInput');
        if (input) {
            input.value = tag;
            document.getElementById('searchSuggestions').style.display = 'none';
            loadEventsFromAPI({ search: tag });
        }
    };

    // --- UPDATED IMAGE PREVIEW LOGIC (Recommended Fix) ---
    const eventImageInput = document.getElementById("uploadEventImage");
    if (eventImageInput) {
        eventImageInput.addEventListener("change", (e) => {
            selectedFiles = Array.from(e.target.files); // Keep selected files for submit

            const placeholder = document.getElementById("uploadPlaceholder");
            const previewContainer = document.getElementById("imagePreviewContainer");
            const previewImg = document.getElementById("imagePreview");

            if (selectedFiles.length > 0) {
                // Read the first file for preview
                const reader = new FileReader();
                reader.onload = function (evt) {
                    if (previewImg) previewImg.src = evt.target.result;
                    if (placeholder) placeholder.style.display = "none";
                    if (previewContainer) previewContainer.style.display = "block";
                };
                reader.readAsDataURL(selectedFiles[0]);
            } else {
                // Reset if cancelled
                if (placeholder) placeholder.style.display = "flex";
                if (previewContainer) previewContainer.style.display = "none";
            }
        });
    }

    document.getElementById("authCloseBtn")?.addEventListener("click", closeAuth);
    document.getElementById("goSignupBtn")?.addEventListener("click", () => openAuth("signup"));
    document.getElementById("goLoginBtn")?.addEventListener("click", () => openAuth("login"));
    document.getElementById("googleLoginBtn")?.addEventListener("click", handleGoogleLogin);
    document.getElementById("googleSignupBtn")?.addEventListener("click", handleGoogleLogin);

    document.getElementById("loginForm")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPass").value.trim();
        const btn = e.target.querySelector('button[type="submit"]');

        const oldText = btn.innerText;
        btn.innerText = "Verifying...";
        btn.disabled = true;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                closeAuth();
                showToast("Login Successful!", "success");
            })
            .catch((error) => {
                let msg = error.message;
                if (error.code === 'auth/wrong-password') msg = "Incorrect password.";
                if (error.code === 'auth/user-not-found') msg = "No account found.";
                showToast(msg, "error");
            })
            .finally(() => {
                btn.innerText = oldText;
                btn.disabled = false;
            });
    });

    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("signupEmail").value.trim();
            const password = document.getElementById("signupPass").value.trim();
            const btn = e.target.querySelector('button[type="submit"]');

            if (password.length < 6) return showToast("Password should be at least 6 characters", "warning");

            const oldText = btn.innerText;
            btn.innerText = "Creating...";
            btn.disabled = true;

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    closeAuth();
                    showToast("Account Created Successfully!", "success");
                })
                .catch((error) => {
                    let msg = error.message;
                    if (error.code === 'auth/email-already-in-use') msg = "Email already in use.";
                    showToast(msg, "error");
                })
                .finally(() => {
                    btn.innerText = oldText;
                    btn.disabled = false;
                });
        });
    }

    document.querySelectorAll('.navItem').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.navItem').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

function loadEventsFromAPI(filters = { sortBy: 'distance' }) {
    let url = `${window.API_URL}/api/events`;
    const useNearby = (map && map.getCenter());

    // Use nearby endpoint if we have location and no explicit override
    // Or if search is present, we might want to use nearby to filter by distance too?
    // Actually, nearby endpoint handles filters better in our backend logic
    // MODIFIED: Fetch ALL events by default to ensure visibility, then sort by distance client-side
    // if (useNearby) {
    //     const params = new URLSearchParams({
    //         latitude: map.getCenter().lat(),
    //         longitude: map.getCenter().lng(),
    //         radius: 50
    //     });
    //     if (filters.search) params.append("search", filters.search);
    //     url = `${API_URL}/api/events/nearby?${params.toString()}`;
    // }

    // Always use search param if present on base URL
    if (filters.search) {
        url = `${API_URL}/api/events?search=${encodeURIComponent(filters.search)}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            console.log("EVENTS API RESPONSE:", data); // Debug Log
            if (!data.success) return;

            let events = data.events.map(e => {
                let dist = 99999;
                if (currentLocation && e.latitude && e.longitude) {
                    dist = getDistanceFromLatLonInKm(currentLocation.lat, currentLocation.lng, parseFloat(e.latitude), parseFloat(e.longitude));
                }

                return {
                    id: e.id,
                    title: e.title,
                    category: e.category,
                    date: new Date(e.event_date).toLocaleDateString(),
                    fullDate: e.event_date,
                    location: e.venue_name || e.address,
                    description: e.description,
                    image: e.image_url,
                    lat: e.latitude,
                    lng: e.longitude,
                    latitude: e.latitude,   // Fix: Added for addEventMarkers
                    longitude: e.longitude, // Fix: Added for addEventMarkers
                    distance: dist, // Calculated client-side
                    isLive: false
                };
            });

            // 1. EXTRACT HASHTAGS from Descriptions
            window.hashtagCounts = {};
            events.forEach(e => {
                if (e.description) {
                    const tags = e.description.match(/#[\w]+/g);
                    if (tags) {
                        tags.forEach(t => {
                            const tag = t.toLowerCase();
                            window.hashtagCounts[tag] = (window.hashtagCounts[tag] || 0) + 1;
                        });
                    }
                }
            });

            // SORTING LOGIC
            if (filters.sortBy === 'distance') {
                events.sort((a, b) => a.distance - b.distance);
            } else if (filters.sortBy === 'date') {
                events.sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
            }

            window.allEvents = events;
            renderEventCards(events);
            addEventMarkers(events); // continue...

            if (filters.search) {
                console.log(`Found ${events.length} results for "${filters.search}"`);
                if (events.length === 0) showToast("No events found matching your search.", "info");
            }
        })
        .catch(err => console.error("Load events failed:", err));
}
/* ================================
   SETTINGS & VERIFICATION LOGIC
   ================================ */

// 1. OPEN/CLOSE MODALS
function openSettingsModal(type) {
    // Close main menu first
    document.querySelector(".menu").classList.remove("menuShow");
    document.querySelector(".menuOverlay").classList.remove("show");

    if (type === 'notifications') document.getElementById('notifOverlay').classList.add('show');
    if (type === 'permissions') {
        document.getElementById('permOverlay').classList.add('show');
        checkPermissions(); // Check current status when opening
    }
    if (type === 'verification') {
        // Auto-fill email if logged in
        if (currentUser) {
            document.getElementById('hostEmail').value = currentUser.email;
            document.getElementById('hostName').value = currentUser.displayName || "";
        }
        document.getElementById('verifyOverlay').classList.add('show');
    }
    toggleBodyScroll(true);
}

function closeSettingsModal(id) {
    document.getElementById(id).classList.remove('show');
    toggleBodyScroll(false);
}

// Helper for scroll locking
function toggleBodyScroll(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
}

// 2. PERMISSIONS LOGIC
function checkPermissions() {
    // Check Notification Permission
    if (!("Notification" in window)) {
        updatePermUI('permNotifStatus', 'Not Supported', 'btnPermNotif');
    } else if (Notification.permission === "granted") {
        updatePermUI('permNotifStatus', 'Allowed ✅', 'btnPermNotif', true);
    } else if (Notification.permission === "denied") {
        updatePermUI('permNotifStatus', 'Blocked ❌', 'btnPermNotif');
    } else {
        updatePermUI('permNotifStatus', 'Not Allowed', 'btnPermNotif');
    }

    // Check Location Permission (Rough check based on previous access)
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') updatePermUI('permLocationStatus', 'Allowed ✅', 'btnPermLocation', true);
        else if (result.state === 'denied') updatePermUI('permLocationStatus', 'Blocked ❌', 'btnPermLocation');
        else updatePermUI('permLocationStatus', 'Ask every time', 'btnPermLocation');
    });
}

function updatePermUI(elementId, text, btnId, isAllowed = false) {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerText = text;
        el.style.color = text.includes('Allowed') ? '#1db954' : '#aaa';
    }

    // Update Button Style
    if (btnId) {
        const btn = document.getElementById(btnId);
        if (btn) {
            if (isAllowed) {
                btn.innerText = "Allowed";
                btn.style.background = "#1db954"; // Green
                btn.style.color = "#fff";
                btn.style.cursor = "default";
                btn.disabled = true;
            } else {
                btn.innerText = "Allow";
                btn.style.background = ""; // Reset
                btn.style.color = "";
                btn.style.cursor = "pointer";
                btn.disabled = false;
            }
        }
    }
}

function requestNotifPerm() {
    Notification.requestPermission().then(permission => {
        checkPermissions();
    });
}

function requestLocationPerm() {
    navigator.geolocation.getCurrentPosition(
        () => checkPermissions(),
        (err) => showToast("Location access denied or error.", "error")
    );
}

// 3. HOST VERIFICATION SUBMISSION
function submitHostVerification(e) {
    e.preventDefault();

    const name = document.getElementById('hostName').value;
    const org = document.getElementById('hostOrg').value;
    const email = document.getElementById('hostEmail').value;
    const phone = document.getElementById('hostPhone').value;
    const reason = document.getElementById('hostReason').value;

    // Construct Email Body
    const subject = `Mapzo Host Verification Request - ${name} (${org})`;
    const body = `Hello Admin,%0D%0A%0D%0AI would like to apply for Host Verification on Mapzo.%0D%0A%0D%0ADETAILS:%0D%0AName: ${name}%0D%0AOrganization: ${org}%0D%0AEmail: ${email}%0D%0APhone: ${phone}%0D%0A%0D%0AREASON:%0D%0A${reason}%0D%0A%0D%0APlease verify my account.%0D%0A%0D%0AThanks, ${name}`;

    // Target Email
    const targetEmail = "mapzo.startup@gmail.com";

    // Open Mail Client
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;

    // Close Modal & Show Success
    closeSettingsModal('verifyOverlay');
    showToast("Opening email client... Please hit send!", "info");
}

function changeSort(method) {
    loadEventsFromAPI({ sortBy: method });
}

function closeLocationModal() {
    document.querySelector('.locationOverlay')?.classList.remove('show');
    toggleBodyScroll(false);
}

// 4. CUSTOM SORT TOGGLE LOGIC
let currentSortMode = 'distance'; // Default

function toggleSortMode() {
    const toggleBtn = document.getElementById('sortToggleBtn');
    if (!toggleBtn) return;

    if (currentSortMode === 'distance') {
        currentSortMode = 'date';
        toggleBtn.classList.add('time-mode');
        changeSort('date');
    } else {
        currentSortMode = 'distance';
        toggleBtn.classList.remove('time-mode');
        changeSort('distance');
    }
}


// ========================================
// 12. BACKGROUND NOTIFICATION CHECKER
// ========================================
function checkNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const subs = JSON.parse(localStorage.getItem('mapzo_notifications') || '[]');
    let updated = false;
    const now = new Date();

    subs.forEach(sub => {
        const eventDate = new Date(sub.date);
        const timeDiff = eventDate - now;

        // 1. Day Of Event (Reminder at 9 AM if event is today)
        const isSameDay = eventDate.toDateString() === now.toDateString();
        if (isSameDay && !sub.notified.day && now.getHours() >= 9) {
            new Notification('📅 Event Today!', {
                body: `Don't forget: "${sub.title}" is happening today!`,
                icon: 'images/Untitled.png'
            });
            sub.notified.day = true;
            updated = true;
        }

        // 2. One Hour Before (3600000 ms)
        if (timeDiff > 0 && timeDiff <= 3600000 && !sub.notified.hour) {
            new Notification('⏳ Starting Soon!', {
                body: `"${sub.title}" starts in less than an hour!`,
                icon: 'images/Untitled.png'
            });
            sub.notified.hour = true;
            updated = true;
        }

        // 3. Start Time (Within 5 mins buffer)
        if (timeDiff <= 0 && timeDiff > -300000 && !sub.notified.start) {
            new Notification('🚀 Event Started!', {
                body: `"${sub.title}" has started! Go check it out.`,
                icon: 'images/Untitled.png'
            });
            sub.notified.start = true;
            updated = true;
        }
    });

    if (updated) {
        localStorage.setItem('mapzo_notifications', JSON.stringify(subs));
    }
}

// Start Poller (Every 60 seconds)
setInterval(checkNotifications, 60000);
// Check once on load
setTimeout(checkNotifications, 5000);

// ===========================================
// PATCH: RECENTER BUTTON LOGIC (FIXED)
// ===========================================
document.addEventListener("DOMContentLoaded", () => {
    const recenterBtn = document.getElementById('recenterBtn');
    if (!recenterBtn) return;

    // Retry until map is initialized
    let mapCheckInterval = setInterval(() => {
        if (typeof map !== 'undefined' && map) {
            clearInterval(mapCheckInterval);
            initRecenterLogic(map);
        } else if (window.map) {
            clearInterval(mapCheckInterval);
            initRecenterLogic(window.map);
        }
    }, 500);

    function initRecenterLogic(mapInstance) {
        let isTracking = false;

        recenterBtn.addEventListener('click', () => {
            if (!isTracking) {
                // START TRACKING
                isTracking = true;
                recenterBtn.classList.add('active');
                const i = recenterBtn.querySelector('i');
                if (i) i.className = 'fa-solid fa-location-dot'; // Active Icon

                if (window.currentLocation) {
                    mapInstance.panTo(window.currentLocation);
                    mapInstance.setZoom(16);
                } else {
                    showToast("Location not found yet.", "info");
                }
            } else {
                // STOP TRACKING
                isTracking = false;
                recenterBtn.classList.remove('active');
                const i = recenterBtn.querySelector('i');
                if (i) i.className = 'fa-solid fa-location-crosshairs'; // Inactive Icon
            }
        });

        // Stop tracking if user drags map
        mapInstance.addListener('dragstart', () => {
            if (isTracking) {
                isTracking = false;
                recenterBtn.classList.remove('active');
                const i = recenterBtn.querySelector('i');
                if (i) i.className = 'fa-solid fa-location-crosshairs';
            }
        });

        // Watch Position Update (Auto-pan)
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition((pos) => {
                const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                if (isTracking) {
                    mapInstance.panTo(newPos);
                }
            }, null, { enableHighAccuracy: true });
        }
    }
});
