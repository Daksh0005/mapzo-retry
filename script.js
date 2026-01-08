// ========================================
// MAPZO - EVENT DISCOVERY PLATFORM
// Clean, Optimized Script
// ========================================

// ========================================
// 1. GLOBAL VARIABLES
// ========================================

let map = null;
let uploadMap = null;
let eventMarkers = [];
let uploadMarker = null;
let selectedEventLocation = null;
let currentLocation = null;
let selectedManualLocation = null;
let searchTimeout = null;
let mapInitialized = false;

let currentFilters = {
    date: null,
    distance: 50,
    category: 'all'
};

let currentDate = new Date();
let selectedDate = null;

// ========================================
// 2. GOOGLE MAPS INITIALIZATION
// ========================================

window.initMap = function () {
    if (mapInitialized) {
        console.log('Map already initialized');
        return;
    }

    const mapElement = document.querySelector('.map');
    if (!mapElement) {
        console.error('Map element not found');
        return;
    }

    console.log('Initializing Google Maps...');

    const defaultCenter = { lat: 22.3200, lng: 87.3150 };

    try {
        // Check if google.maps is available
        if (typeof google === 'undefined' || !google.maps) {
            throw new Error('Google Maps not loaded');
        }

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
        console.log('✅ Map initialized successfully');

        // Wait for tiles to load
        google.maps.event.addListenerOnce(map, 'tilesloaded', function () {
            console.log('Map tiles loaded, fetching events...');
            // Check if Firebase is ready
            if (typeof db !== 'undefined') {
                loadEventsFromFirebase();
            } else {
                console.error('Firebase not initialized');
                setTimeout(loadEventsFromFirebase, 1000); // Retry after 1s
            }
        });

    } catch (error) {
        console.error('❌ Map initialization failed:', error);
        showMapError();
    }
};


function showMapError() {
    const mapElement = document.querySelector('.map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 1000;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #ff4444;"></i>
                <h3 style="margin: 16px 0 8px; color: #fff;">Failed to Load Map</h3>
                <p style="color: rgba(255,255,255,0.7); margin-bottom: 16px;">Check your connection or disable ad blocker</p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: #1db954; border: none; border-radius: 20px; color: #000; font-weight: 700; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

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
        `✅ Location pinned at ${location.lat().toFixed(4)}, ${location.lng().toFixed(4)}`;
}

function useHostGPS() {
    if (!navigator.geolocation) {
        alert('Geolocation not supported');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const location = new google.maps.LatLng(
                position.coords.latitude,
                position.coords.longitude
            );
            uploadMap.setCenter(location);
            placeUploadMarker(location);
        },
        function () {
            alert('Could not get your location. Please click on the map.');
        }
    );
}

function searchHostLocation() {
    const query = prompt("Enter location (e.g., IIT Kharagpur, Delhi):");
    if (!query) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, function (results, status) {
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            uploadMap.setCenter(location);
            uploadMap.setZoom(15);
            placeUploadMarker(location);
        } else {
            alert('Location not found. Try another search or click on map.');
        }
    });
}

// ========================================
// 4. FIREBASE - LOAD EVENTS
// ========================================

function loadEventsFromFirebase() {
    console.log('Loading events from Firebase...');

    db.collection('events')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .onSnapshot(
            (snapshot) => {
                const events = [];
                snapshot.forEach((doc) => {
                    events.push({ id: doc.id, ...doc.data() });
                });

                console.log(`✅ Loaded ${events.length} events`);
                renderEventCards(events);
                addEventMarkers(events);
            },
            (error) => {
                console.error('❌ Error loading events:', error);
            }
        );
}

// ========================================
// 5. DISPLAY EVENT CARDS
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
        const card = document.createElement('div');
        card.className = 'eventCard';
        card.innerHTML = `
            <div class="eventImage">
                <img 
                    src="${event.image || 'https://via.placeholder.com/400x200?text=Event'}" 
                    alt="${event.title}"
                    loading="lazy">
                <span class="eventCategory">${event.category}</span>
            </div>
            <div class="eventInfo">
                <h3 class="eventTitle">${event.title}</h3>
                <p class="eventDate">
                    <i class="fa-regular fa-calendar"></i> ${event.date}
                </p>
                <p class="eventLocation">
                    <i class="fa-solid fa-location-dot"></i> ${event.location}
                </p>
                <div class="eventTags">
                    ${(event.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            window.location.href = `event.html?id=${event.id}`;
        });

        eventsScroll.appendChild(card);
    });
}

// ========================================
// 6. DISPLAY MAP MARKERS
// ========================================

function addEventMarkers(events) {
    // Clear old markers
    eventMarkers.forEach(marker => marker.setMap(null));
    eventMarkers = [];

    if (!map) return;

    events.forEach(event => {
        if (!event.lat || !event.lng) return;

        const marker = new google.maps.Marker({
            position: { lat: event.lat, lng: event.lng },
            map: map,
            title: event.title,
            optimized: true,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: "#1db954",
                fillOpacity: 0.9,
                strokeColor: "#ffffff",
                strokeWeight: 3
            }
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="font-family: 'Inter', sans-serif; padding: 8px; max-width: 200px;">
                    <h3 style="margin: 0 0 8px; font-size: 1rem; font-weight: 700; color: #1db954;">
                        ${event.title}
                    </h3>
                    <p style="margin: 4px 0; font-size: 0.85rem; color: #666;">
                        <i class="fa-regular fa-calendar"></i> ${event.date}
                    </p>
                    <p style="margin: 4px 0; font-size: 0.85rem; color: #666;">
                        <i class="fa-solid fa-location-dot"></i> ${event.location}
                    </p>
                    <button onclick="window.location.href='event.html?id=${event.id}'" 
                        style="margin-top: 10px; padding: 8px 16px; background: #1db954; 
                        border: none; border-radius: 20px; color: #000; font-weight: 700; 
                        cursor: pointer; width: 100%;">
                        View Event
                    </button>
                </div>
            `
        });

        marker.addListener('click', () => {
            eventMarkers.forEach(m => {
                if (m.infoWindow) m.infoWindow.close();
            });
            infoWindow.open(map, marker);
        });

        marker.infoWindow = infoWindow;
        eventMarkers.push(marker);
    });
}

// ========================================
// 7. UPLOAD EVENT TO FIREBASE
// ========================================

async function handleEventSubmit() {
    const eventName = document.getElementById('eventName').value;
    const eventCategory = document.getElementById('uploadEventCategory').value;
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventLocation = document.getElementById('eventLocation').value;
    const eventDescription = document.getElementById('eventDescription').value;
    const eventHashtags = document.getElementById('eventHashtags').value;
    const eventImageInput = document.getElementById('uploadEventImage');

    if (!eventName || !eventCategory || !eventDate || !eventLocation) {
        alert('Please fill in all required fields!');
        return;
    }

    if (!selectedEventLocation) {
        alert('Please select event location on the map!');
        return;
    }

    // Upload image
    let imageUrl = '';
    if (eventImageInput.files && eventImageInput.files[0]) {
        const file = eventImageInput.files[0];
        const storageRef = storage.ref('event-images/' + Date.now() + '_' + file.name);

        try {
            const snapshot = await storageRef.put(file);
            imageUrl = await snapshot.ref.getDownloadURL();
        } catch (error) {
            console.error('Image upload error:', error);
        }
    }

    // Save event
    const newEvent = {
        title: eventName,
        category: eventCategory,
        date: new Date(eventDate).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        }),
        time: eventTime,
        location: eventLocation,
        description: eventDescription,
        tags: eventHashtags.split(' ').filter(tag => tag.startsWith('#')),
        image: imageUrl,
        lat: selectedEventLocation.lat,
        lng: selectedEventLocation.lng,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('events').add(newEvent);

        // Reset form
        document.getElementById('eventUploadForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
        document.querySelector('.imagePlaceholder').style.display = 'flex';
        document.getElementById('selectedLocationText').textContent = '📍 No location pinned yet';

        if (uploadMarker) {
            uploadMarker.setMap(null);
            uploadMarker = null;
        }
        selectedEventLocation = null;

        closeUploadForm();
        alert('Event posted successfully! 🎉');
    } catch (error) {
        console.error('Error posting event:', error);
        alert('Failed to post event. Please try again.');
    }
}

// ========================================
// 8. UI CONTROLS - MENU & MODALS
// ========================================

function toggleMenu() {
    const menu = document.querySelector(".menu");
    const overlay = document.querySelector(".menuOverlay");
    if (!menu || !overlay) return;

    menu.classList.toggle("menuShow");
    overlay.classList.toggle("show");

    if (menu.classList.contains("menuShow")) lockScroll();
    else unlockScrollIfNoOverlay();
}

function lockScroll() {
    document.body.classList.add("noScroll");
}

function unlockScrollIfNoOverlay() {
    const anyOpen = document.querySelector(
        ".menu.menuShow, .uploadOverlay.show, .filterOverlay.show, .locationOverlay.show, .manualLocationOverlay.show, .authOverlay.show"
    );
    if (!anyOpen) document.body.classList.remove("noScroll");
}

function openUploadForm() {
    const uploadOverlay = document.querySelector(".uploadOverlay");
    if (!uploadOverlay) return;
    uploadOverlay.classList.add("show");
    lockScroll();

    setTimeout(() => {
        if (!uploadMap) initUploadMap();
    }, 300);
}

function closeUploadForm() {
    const uploadOverlay = document.querySelector(".uploadOverlay");
    if (!uploadOverlay) return;
    uploadOverlay.classList.remove("show");
    unlockScrollIfNoOverlay();
}

// ========================================
// 9. FILTERS
// ========================================

function openFilterModal() {
    const filterOverlay = document.querySelector(".filterOverlay");
    if (!filterOverlay) return;
    filterOverlay.classList.add("show");
    lockScroll();
    renderCalendar();
}

function closeFilterModal() {
    const filterOverlay = document.querySelector(".filterOverlay");
    if (!filterOverlay) return;
    filterOverlay.classList.remove("show");
    unlockScrollIfNoOverlay();
}

function resetFilters() {
    currentFilters = { date: null, distance: 50, category: 'all' };
    selectedDate = null;

    document.querySelectorAll('.quickFilterBtn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.categoryCard').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.category === 'all') card.classList.add('active');
    });

    document.getElementById('distanceInput').value = 50;
    document.getElementById('distanceRange').value = 50;

    renderCalendar();
    loadEventsFromFirebase();
}

function applyFilters() {
    db.collection('events').get().then((snapshot) => {
        let events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        // Date filter
        if (currentFilters.date) {
            const selected = new Date(currentFilters.date);
            selected.setHours(0, 0, 0, 0);

            events = events.filter(ev => {
                const evDate = new Date(ev.date);
                if (isNaN(evDate)) return false;
                evDate.setHours(0, 0, 0, 0);
                return evDate.getTime() === selected.getTime();
            });
        }

        // Distance filter
        if (currentLocation && currentFilters.distance) {
            events = events.filter(event => {
                if (!event.lat || !event.lng) return false;
                const distance = calculateDistance(
                    currentLocation.lat, currentLocation.lng,
                    event.lat, event.lng
                );
                return distance <= currentFilters.distance;
            });
        }

        // Category filter
        if (currentFilters.category && currentFilters.category !== 'all') {
            events = events.filter(e => e.category === currentFilters.category);
        }

        renderEventCards(events);
        addEventMarkers(events);
        closeFilterModal();
    });
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ========================================
// 10. CALENDAR
// ========================================

function renderCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const currentMonth = document.getElementById('currentMonth');

    if (!calendarDays || !currentMonth) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    currentMonth.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    calendarDays.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendarDay disabled';
        calendarDays.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('button');
        dayElement.className = 'calendarDay';
        dayElement.textContent = day;

        const dateToCheck = new Date(year, month, day);

        if (dateToCheck.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        if (selectedDate && dateToCheck.toDateString() === selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        }

        if (dateToCheck < today.setHours(0, 0, 0, 0)) {
            dayElement.classList.add('disabled');
        } else {
            dayElement.addEventListener('click', () => {
                selectedDate = new Date(year, month, day);
                currentFilters.date = selectedDate;
                renderCalendar();
            });
        }

        calendarDays.appendChild(dayElement);
    }
}

// ========================================
// 11. USER LOCATION
// ========================================

function openLocationModal() {
    const locationOverlay = document.querySelector(".locationOverlay");
    if (!locationOverlay) return;
    locationOverlay.classList.add("show");
    lockScroll();
}

function closeLocationModal() {
    const locationOverlay = document.querySelector(".locationOverlay");
    if (!locationOverlay) return;
    locationOverlay.classList.remove("show");
    unlockScrollIfNoOverlay();
}

function enableGPS() {
    if (!navigator.geolocation) {
        alert('Geolocation not supported');
        return;
    }

    const locationDisplay = document.getElementById('locationDisplay');
    if (locationDisplay) {
        locationDisplay.innerHTML = `Getting<br>Location....`;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            reverseGeocode(position.coords.latitude, position.coords.longitude);
            closeLocationModal();

            if (map) {
                map.setCenter({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            }
        },
        function () {
            if (locationDisplay) {
                locationDisplay.textContent = 'Enable Location';
            }
            alert('Could not get your location.');
        }
    );
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
            { headers: { 'User-Agent': 'Mapzo/1.0' } }
        );

        const data = await response.json();
        const address = data.address;
        const locationName = address.city || address.town || address.village ||
            address.county || address.state || 'Unknown';

        currentLocation = { name: locationName, lat, lng, fullAddress: data.display_name };
        updateLocationDisplay(locationName);
    } catch (error) {
        console.error('Reverse geocoding error:', error);
    }
}

function updateLocationDisplay(locationName) {
    const locationDisplay = document.getElementById('locationDisplay');
    if (locationDisplay) {
        const displayName = locationName.length > 15 ?
            locationName.substring(0, 15) + '...' : locationName;
        locationDisplay.textContent = displayName;
        locationDisplay.title = locationName;
    }
}

function showManualInput() {
    closeLocationModal();
    const manualOverlay = document.querySelector(".manualLocationOverlay");
    if (!manualOverlay) return;
    manualOverlay.classList.add("show");
    lockScroll();
}

function backToLocationOptions() {
    const manualOverlay = document.querySelector(".manualLocationOverlay");
    if (manualOverlay) manualOverlay.classList.remove("show");
    openLocationModal();
}

function handleLocationSearch(query) {
    const suggestionsContainer = document.getElementById('locationSuggestions');

    if (!query || query.trim().length < 2) {
        suggestionsContainer.innerHTML = '';
        return;
    }

    if (searchTimeout) clearTimeout(searchTimeout);

    suggestionsContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
            <i class="fa-solid fa-spinner fa-spin"></i> Searching...
        </div>
    `;

    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10`,
                { headers: { 'User-Agent': 'Mapzo/1.0' } }
            );

            const results = await response.json();

            if (results.length === 0) {
                suggestionsContainer.innerHTML = '<div style="padding: 20px; text-align: center;">No locations found</div>';
                return;
            }

            const filtered = results.filter(r => {
                const t = r.type;
                const a = r.address;
                return t === 'city' || t === 'town' || t === 'village' ||
                    a.city || a.town || a.village;
            });

            suggestionsContainer.innerHTML = "";

            filtered.forEach(result => {
                const address = result.address || {};
                const locationName = address.city || address.town || address.village || result.name;

                const locationData = {
                    name: locationName,
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    fullAddress: result.display_name
                };

                const item = document.createElement("div");
                item.className = "suggestionItem";
                item.innerHTML = `
                    <div class="suggestionIcon"><i class="fa-solid fa-location-dot"></i></div>
                    <div class="suggestionText">
                        <h4>${locationName}</h4>
                        <p>${address.state || ""}, ${address.country || ""}</p>
                    </div>
                `;

                item.addEventListener("click", (e) => selectLocation(e, locationData));
                suggestionsContainer.appendChild(item);
            });
        } catch (error) {
            console.error('Search error:', error);
            suggestionsContainer.innerHTML = '<div style="padding: 20px; text-align: center;">Search failed</div>';
        }
    }, 500);
}

function selectLocation(e, locationData) {
    selectedManualLocation = locationData;

    document.querySelectorAll('.suggestionItem').forEach(item => {
        item.classList.remove('selected');
    });

    const clicked = e.target.closest('.suggestionItem');
    if (clicked) clicked.classList.add('selected');
}

function confirmManualLocation() {
    if (!selectedManualLocation) {
        alert("Please select a location");
        return;
    }

    currentLocation = selectedManualLocation;
    updateLocationDisplay(selectedManualLocation.name);

    if (map) {
        map.setCenter({ lat: currentLocation.lat, lng: currentLocation.lng });
    }

    const manualOverlay = document.querySelector(".manualLocationOverlay");
    if (manualOverlay) manualOverlay.classList.remove("show");
    unlockScrollIfNoOverlay();

    document.getElementById("manualLocationInput").value = "";
    document.getElementById("locationSuggestions").innerHTML = "";
    selectedManualLocation = null;
}

// ========================================
// 12. CUSTOM MAP CONTROLS
// ========================================

function initMapControls() {
    // Recenter button
    document.getElementById('recenterBtn')?.addEventListener('click', () => {
        if (!map) {
            alert('Map not loaded');
            return;
        }

        if (currentLocation) {
            map.setCenter({ lat: currentLocation.lat, lng: currentLocation.lng });
            map.setZoom(14);
        } else {
            if (confirm("Enable location to recenter map?")) {
                enableGPS();
            }
        }
    });

    // Fullscreen button
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const mapElement = document.getElementById('mainMap');

    if (fullscreenBtn && mapElement) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                mapElement.requestFullscreen().then(() => {
                    fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
                }).catch(() => {
                    alert('Fullscreen not supported');
                });
            } else {
                document.exitFullscreen().then(() => {
                    fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
                });
            }
        });
    }

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
        }
    });
}

// ========================================
// 13. INITIALIZATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    console.log('DOM loaded, initializing Mapzo...');

    // Check if Google Maps already loaded
    if (typeof google !== 'undefined' && google.maps && !mapInitialized) {
        console.log('Google Maps already available');
        window.initMap();
    }

    // Initialize controls
    initMapControls();

    // Image preview
    const eventImageInput = document.getElementById("uploadEventImage");
    if (eventImageInput) {
        eventImageInput.addEventListener("change", (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const preview = document.getElementById("imagePreview");
                const placeholder = document.querySelector(".imagePlaceholder");
                if (preview && placeholder) {
                    preview.src = ev.target.result;
                    preview.style.display = "block";
                    placeholder.style.display = "none";
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Auth modal
    const authOverlay = document.getElementById("authOverlay");
    const authCloseBtn = document.getElementById("authCloseBtn");
    const goSignupBtn = document.getElementById("goSignupBtn");
    const goLoginBtn = document.getElementById("goLoginBtn");

    function openAuth(mode = "login") {
        if (!authOverlay) return;
        authOverlay.classList.add("show");
        lockScroll();

        const loginPage = document.getElementById("loginPage");
        const signupPage = document.getElementById("signupPage");
        const authTitle = document.getElementById("authTitle");

        if (mode === "signup") {
            loginPage?.classList.remove("show");
            signupPage?.classList.add("show");
            if (authTitle) authTitle.textContent = "Sign up";
        } else {
            signupPage?.classList.remove("show");
            loginPage?.classList.add("show");
            if (authTitle) authTitle.textContent = "Log in";
        }
    }

    function closeAuth() {
        authOverlay?.classList.remove("show");
        unlockScrollIfNoOverlay();
    }

    authCloseBtn?.addEventListener("click", closeAuth);
    authOverlay?.addEventListener("click", (e) => {
        if (e.target === authOverlay) closeAuth();
    });
    goSignupBtn?.addEventListener("click", () => openAuth("signup"));
    goLoginBtn?.addEventListener("click", () => openAuth("login"));

    document.querySelectorAll("[data-open-auth='login']").forEach((btn) =>
        btn.addEventListener("click", () => openAuth("login"))
    );
    document.querySelectorAll("[data-open-auth='signup']").forEach((btn) =>
        btn.addEventListener("click", () => openAuth("signup"))
    );

    document.getElementById("loginForm")?.addEventListener("submit", (e) => {
        e.preventDefault();
        closeAuth();
    });
    document.getElementById("signupForm")?.addEventListener("submit", (e) => {
        e.preventDefault();
        closeAuth();
    });

    // Filter tabs
    document.querySelectorAll(".filterTab").forEach((tab) => {
        tab.addEventListener("click", function () {
            document.querySelectorAll(".filterTab").forEach((t) => t.classList.remove("active"));
            document.querySelectorAll(".filterTabContent").forEach((c) => c.classList.remove("active"));

            this.classList.add("active");
            document.getElementById(this.dataset.tab + "Tab")?.classList.add("active");
        });
    });

    // Calendar navigation
    document.getElementById("prevMonth")?.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById("nextMonth")?.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Distance controls
    const distanceInput = document.getElementById("distanceInput");
    const distanceRange = document.getElementById("distanceRange");

    if (distanceInput && distanceRange) {
        distanceInput.addEventListener("input", function () {
            const value = Math.min(5000, Math.max(0, Number(this.value || 0)));
            this.value = value;
            distanceRange.value = Math.min(500, value);
            currentFilters.distance = value;
        });

        distanceRange.addEventListener("input", function () {
            distanceInput.value = this.value;
            currentFilters.distance = Number(this.value);
        });
    }

    document.querySelectorAll("[data-distance]").forEach((btn) => {
        btn.addEventListener("click", function () {
            const distance = Number(this.dataset.distance);
            if (distanceInput && distanceRange) {
                distanceInput.value = distance;
                distanceRange.value = Math.min(500, distance);
                currentFilters.distance = distance;
            }
        });
    });

    // Category cards
    document.querySelectorAll("[data-category]").forEach((card) => {
        card.addEventListener("click", function () {
            document.querySelectorAll("[data-category]").forEach((c) => c.classList.remove("active"));
            this.classList.add("active");
            currentFilters.category = this.dataset.category;
        });
    });

    // Category search
    document.getElementById("categorySearch")?.addEventListener("input", function () {
        const query = this.value.toLowerCase();
        document.querySelectorAll(".categoryCard").forEach((card) => {
            const text = (card.textContent || "").toLowerCase();
            card.style.display = text.includes(query) ? "flex" : "none";
        });
    });

    // Escape key to close modals
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;

        if (document.querySelector('.manualLocationOverlay.show')) {
            document.querySelector('.manualLocationOverlay').classList.remove("show");
            unlockScrollIfNoOverlay();
        } else if (document.querySelector('.locationOverlay.show')) {
            closeLocationModal();
        } else if (document.querySelector('.filterOverlay.show')) {
            closeFilterModal();
        } else if (document.querySelector('.uploadOverlay.show')) {
            closeUploadForm();
        } else if (document.querySelector('.menu.menuShow')) {
            toggleMenu();
        }
    });

    console.log('✅ Mapzo initialized');
});
