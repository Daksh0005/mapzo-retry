// ========================================
// FIREBASE & GOOGLE MAPS INTEGRATION
// ========================================

let map; // Main user map
let uploadMap; // Host upload map
let eventMarkers = [];
let uploadMarker = null;
let selectedEventLocation = null;

// ========================================
// 1. INITIALIZE GOOGLE MAPS
// ========================================

function initMap() {
    const mapElement = document.querySelector('.map');
    if (!mapElement) return;

    const defaultCenter = { lat: 22.3200, lng: 87.3150 };

    map = new google.maps.Map(mapElement, {
        center: currentLocation ?
            { lat: currentLocation.lat, lng: currentLocation.lng } :
            defaultCenter,
        zoom: 14,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
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

    // Load events from Firebase and display
    loadEventsFromFirebase();
}

// Initialize upload map when modal opens
function initUploadMap() {
    const uploadMapElement = document.getElementById('uploadMap');
    if (!uploadMapElement) return;

    const defaultCenter = currentLocation ?
        { lat: currentLocation.lat, lng: currentLocation.lng } :
        { lat: 22.3200, lng: 87.3150 };

    uploadMap = new google.maps.Map(uploadMapElement, {
        center: defaultCenter,
        zoom: 14,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ]
    });

    // Click to place marker
    uploadMap.addListener('click', function (e) {
        placeUploadMarker(e.latLng);
    });
}

function placeUploadMarker(location) {
    // Remove old marker
    if (uploadMarker) {
        uploadMarker.setMap(null);
    }

    // Place new marker
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

// Use host's GPS location
function useHostGPS() {
    if (!navigator.geolocation) {
        alert('Geolocation not supported');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            uploadMap.setCenter(location);
            placeUploadMarker(new google.maps.LatLng(location.lat, location.lng));
        },
        function (error) {
            alert('Could not get your location. Please try clicking on the map.');
        }
    );
}

// Search location for event
function searchHostLocation() {
    const query = prompt("Enter location to search (e.g., IIT Kharagpur, Delhi):");
    if (!query) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, function (results, status) {
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            uploadMap.setCenter(location);
            uploadMap.setZoom(15);
            placeUploadMarker(location);
        } else {
            alert('Location not found. Please try another search or click on the map.');
        }
    });
}

// ========================================
// 2. LOAD EVENTS FROM FIREBASE
// ========================================

function loadEventsFromFirebase() {
    db.collection('events').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        const events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        renderEventCards(events);
        addEventMarkers(events);
    });
}

// ========================================
// 3. DISPLAY EVENT MARKERS ON MAP
// ========================================

function addEventMarkers(events) {
    // Clear existing markers
    eventMarkers.forEach(marker => marker.setMap(null));
    eventMarkers = [];

    events.forEach(event => {
        if (!event.lat || !event.lng) return;

        const marker = new google.maps.Marker({
            position: { lat: event.lat, lng: event.lng },
            map: map,
            title: event.title,
            animation: google.maps.Animation.DROP,
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
// 4. RENDER EVENT CARDS
// ========================================

function renderEventCards(events) {
    const eventsScroll = document.querySelector('.eventsScroll');
    if (!eventsScroll) return;

    eventsScroll.innerHTML = '';

    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'eventCard';
        card.innerHTML = `
            <div class="eventImage">
                <img src="${event.image || 'https://via.placeholder.com/400x200?text=Event'}" alt="${event.title}">
                <span class="eventCategory">${event.category}</span>
            </div>
            <div class="eventInfo">
                <h3 class="eventTitle">${event.title}</h3>
                <p class="eventDate">
                    <i class="fa-regular fa-calendar"></i>
                    ${event.date}
                </p>
                <p class="eventLocation">
                    <i class="fa-solid fa-location-dot"></i>
                    ${event.location}
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
// 5. UPLOAD EVENT TO FIREBASE
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

    // Upload image to Firebase Storage
    let imageUrl = '';
    if (eventImageInput.files && eventImageInput.files[0]) {
        const file = eventImageInput.files[0];
        const storageRef = storage.ref('event-images/' + Date.now() + '_' + file.name);

        try {
            const snapshot = await storageRef.put(file);
            imageUrl = await snapshot.ref.getDownloadURL();
        } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image. Event will be posted without image.');
        }
    }

    // Create event object
    const newEvent = {
        title: eventName,
        category: eventCategory,
        date: new Date(eventDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
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

    // Save to Firestore
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
// 6. UI FUNCTIONS (Menu, Modals, etc.)
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

    // Initialize upload map after modal opens
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
// 7. FILTERS
// ========================================

let currentFilters = {
    date: null,
    distance: 50,
    category: 'all'
};

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
    currentFilters = {
        date: null,
        distance: 50,
        category: 'all'
    };
    selectedDate = null;

    document.querySelectorAll('.quickFilterBtn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.categoryCard').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.category === 'all') card.classList.add('active');
    });

    document.getElementById('distanceInput').value = 50;
    document.getElementById('distanceRange').value = 50;

    renderCalendar();
    loadEventsFromFirebase(); // Reload all events
}

function applyFilters() {
    db.collection('events').get().then((snapshot) => {
        let events = [];
        snapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() });
        });

        // Apply date filter
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

        // Apply distance filter
        if (currentLocation && currentFilters.distance) {
            events = events.filter(event => {
                if (!event.lat || !event.lng) return false;
                const distance = calculateDistance(
                    currentLocation.lat,
                    currentLocation.lng,
                    event.lat,
                    event.lng
                );
                return distance <= currentFilters.distance;
            });
        }

        // Apply category filter
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
// 8. CALENDAR
// ========================================

let currentDate = new Date();
let selectedDate = null;

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
// 9. USER LOCATION
// ========================================

let currentLocation = null;
let selectedManualLocation = null;
let searchTimeout = null;

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
        alert('Geolocation is not supported by your browser');
        return;
    }

    const locationDisplay = document.getElementById('locationDisplay');
    if (locationDisplay) {
        locationDisplay.innerHTML = `Getting<br>Location....`;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            reverseGeocode(lat, lng);
            closeLocationModal();

            // Re-center map
            if (map) {
                map.setCenter({ lat, lng });
            }
        },
        function (error) {
            if (locationDisplay) {
                locationDisplay.textContent = 'Enable Location';
            }
            alert('Could not get your location. Please try manual search.');
        }
    );
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'Mapzo/1.0'
                }
            }
        );

        const data = await response.json();
        const address = data.address;
        let locationName = address.city ||
            address.town ||
            address.village ||
            address.county ||
            address.state_district ||
            address.state ||
            'Unknown Location';

        currentLocation = {
            name: locationName,
            lat: lat,
            lng: lng,
            fullAddress: data.display_name
        };

        updateLocationDisplay(locationName);
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        alert('Could not determine your location.');
    }
}

function updateLocationDisplay(locationName) {
    const locationDisplay = document.getElementById('locationDisplay');
    if (locationDisplay) {
        const displayName = locationName.length > 15 ?
            locationName.substring(0, 15) + '...' :
            locationName;
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

    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    suggestionsContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
            <i class="fa-solid fa-spinner fa-spin"></i> Searching...
        </div>
    `;

    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10&layer=address`,
                {
                    headers: {
                        'User-Agent': 'Mapzo/1.0'
                    }
                }
            );

            const results = await response.json();

            if (results.length === 0) {
                suggestionsContainer.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                        No locations found
                    </div>
                `;
                return;
            }

            const filteredResults = results.filter(result => {
                const type = result.type;
                const addressType = result.address;

                return type === 'city' ||
                    type === 'town' ||
                    type === 'village' ||
                    type === 'administrative' ||
                    type === 'county' ||
                    type === 'state' ||
                    addressType.city ||
                    addressType.town ||
                    addressType.village ||
                    addressType.county ||
                    addressType.state_district;
            });

            if (filteredResults.length === 0) {
                suggestionsContainer.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                        No cities or districts found
                    </div>
                `;
                return;
            }

            suggestionsContainer.innerHTML = "";

            filteredResults.forEach(result => {
                const address = result.address || {};
                const locationName = address.city || address.town || address.village || address.county || address.state_district || result.name;

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
                        <p>${address.state || ""}, ${address.country || ""}`.replace(/^, |, $/g, "") + `</p>
                    </div>
                `;

                item.addEventListener("click", (e) => selectLocation(e, locationData));
                suggestionsContainer.appendChild(item);
            });
        } catch (error) {
            console.error('Location search error:', error);
            suggestionsContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    Search failed. Please try again.
                </div>
            `;
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
        alert("Please select a location from the suggestions");
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
// 10. AUTH & INITIALIZATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    // Image preview
    const eventImageInput = document.getElementById("uploadEventImage");
    if (eventImageInput) {
        eventImageInput.addEventListener("change", (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.addEventListener("load", (ev) => {
                const preview = document.getElementById("imagePreview");
                const placeholder = document.querySelector(".imagePlaceholder");
                if (!preview || !placeholder) return;

                preview.src = ev.target.result;
                preview.style.display = "block";
                placeholder.style.display = "none";
            });

            reader.readAsDataURL(file);
        });
    }

    // Auth modal
    const authOverlay = document.getElementById("authOverlay");
    const authCloseBtn = document.getElementById("authCloseBtn");
    const loginPage = document.getElementById("loginPage");
    const signupPage = document.getElementById("signupPage");
    const authTitle = document.getElementById("authTitle");
    const goSignupBtn = document.getElementById("goSignupBtn");
    const goLoginBtn = document.getElementById("goLoginBtn");

    function openAuth(mode = "login") {
        if (!authOverlay) return;

        authOverlay.classList.add("show");
        lockScroll();

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
    const prevMonthBtn = document.getElementById("prevMonth");
    const nextMonthBtn = document.getElementById("nextMonth");

    prevMonthBtn?.addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    nextMonthBtn?.addEventListener("click", () => {
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
            if (!distanceInput || !distanceRange) return;

            distanceInput.value = distance;
            distanceRange.value = Math.min(500, distance);
            currentFilters.distance = distance;
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
    const categorySearch = document.getElementById("categorySearch");
    categorySearch?.addEventListener("input", function () {
        const query = this.value.toLowerCase();
        document.querySelectorAll(".categoryCard").forEach((card) => {
            const text = (card.textContent || "").toLowerCase();
            card.style.display = text.includes(query) ? "flex" : "none";
        });
    });
});

// Escape key to close modals
document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    const manualOverlay = document.querySelector('.manualLocationOverlay');
    const locationOverlay = document.querySelector('.locationOverlay');
    const filterOverlay = document.querySelector('.filterOverlay');
    const uploadOverlay = document.querySelector('.uploadOverlay');
    const menu = document.querySelector('.menu');

    if (manualOverlay?.classList.contains("show")) {
        manualOverlay.classList.remove("show");
        unlockScrollIfNoOverlay();
        return;
    }

    if (locationOverlay?.classList.contains('show')) {
        closeLocationModal();
        return;
    }
    if (filterOverlay?.classList.contains('show')) {
        closeFilterModal();
        return;
    }
    if (uploadOverlay?.classList.contains('show')) {
        closeUploadForm();
        return;
    }
    if (menu?.classList.contains('menuShow')) {
        toggleMenu();
        return;
    }
});
