function toggleMenu() {
    const menu = document.querySelector('.menu');
    const overlay = document.querySelector('.menuOverlay');
    const body = document.body;
    
    menu.classList.toggle('menuShow');
    overlay.classList.toggle('show');
    
    if (menu.classList.contains('menuShow')) {
        body.style.overflow = 'hidden';
    } else {
        body.style.overflow = '';
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const menu = document.querySelector('.menu');
        const uploadOverlay = document.querySelector('.uploadOverlay');
        
        if (menu.classList.contains('menuShow')) {
            toggleMenu();
        }
        
        if (uploadOverlay && uploadOverlay.classList.contains('show')) {
            closeUploadForm();
        }
    }
});

const sampleEvents = [
    {
        id: 1,
        title: "DJ Night at Spring Fest",
        date: "Dec 31, 2025",
        location: "IIT Kharagpur",
        category: "Music",
        tags: ["#music", "#party"],
        image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400",
        lat: 22.3200,
        lng: 87.3150
    },
    {
        id: 2,
        title: "Startup Pitch Competition",
        date: "Jan 5, 2026",
        location: "Tech Students' Gymkhana",
        category: "Tech",
        tags: ["#startup", "#business"],
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
        lat: 22.3149,
        lng: 87.3105
    },
    {
        id: 3,
        title: "Annual Sports Meet",
        date: "Jan 10, 2026",
        location: "Tata Sports Complex",
        category: "Sports",
        tags: ["#sports", "#athletics"],
        image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400",
        lat: 22.3180,
        lng: 87.3120
    },
    {
        id: 4,
        title: "Classical Dance Performance",
        date: "Jan 15, 2026",
        location: "Netaji Auditorium",
        category: "Cultural",
        tags: ["#cultural", "#dance"],
        image: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400",
        lat: 22.3160,
        lng: 87.3090
    },
    {
        id: 5,
        title: "Tech Talk: AI in 2026",
        date: "Jan 20, 2026",
        location: "Lecture Hall Complex",
        category: "Tech",
        tags: ["#ai", "#tech"],
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400",
        lat: 22.3140,
        lng: 87.3100
    }
];

function renderEventCards(events) {
    const eventsScroll = document.querySelector('.eventsScroll');
    
    if (!eventsScroll) {
        console.error('eventsScroll element not found');
        return;
    }
    
    eventsScroll.innerHTML = '';
    
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'eventCard';
        card.innerHTML = `
            <div class="eventImage">
                <img src="${event.image}" alt="${event.title}">
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
                    ${event.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            console.log('Event clicked:', event.title);
        });
        
        eventsScroll.appendChild(card);
    });
}

function openUploadForm() {
    const uploadOverlay = document.querySelector('.uploadOverlay');
    if (uploadOverlay) {
        document.body.style.overflow = 'hidden';
        uploadOverlay.classList.add('show');
    }
}

function closeUploadForm() {
    const uploadOverlay = document.querySelector('.uploadOverlay');
    if (uploadOverlay) {
        document.body.style.overflow = '';
        uploadOverlay.classList.remove('show');
    }
}

function handleEventSubmit() {
    const eventName = document.getElementById('eventName').value;
    const eventCategory = document.getElementById('eventCategory').value;
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventLocation = document.getElementById('eventLocation').value;
    const eventDescription = document.getElementById('eventDescription').value;
    const eventHashtags = document.getElementById('eventHashtags').value;
    
    if (!eventName || !eventCategory || !eventDate || !eventLocation) {
        alert('Please fill in all required fields!');
        return;
    }
    
    const newEvent = {
        id: sampleEvents.length + 1,
        title: eventName,
        date: new Date(eventDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        }),
        location: eventLocation,
        category: eventCategory,
        tags: eventHashtags.split(' ').filter(tag => tag.startsWith('#')),
        image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400",
        lat: 22.3200,
        lng: 87.3150
    };
    
    sampleEvents.unshift(newEvent);
    renderEventCards(sampleEvents);
    
    document.getElementById('eventUploadForm').reset();
    
    const imagePreview = document.getElementById('imagePreview');
    const imagePlaceholder = document.querySelector('.imagePlaceholder');
    if (imagePreview) imagePreview.style.display = 'none';
    if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
    
    closeUploadForm();
    
    alert('Event posted successfully! 🎉');
}

document.addEventListener('DOMContentLoaded', () => {
    renderEventCards(sampleEvents);
    
    const eventImageInput = document.getElementById('eventImage');
    if (eventImageInput) {
        eventImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('imagePreview');
                    const placeholder = document.querySelector('.imagePlaceholder');
                    if (preview && placeholder) {
                        preview.src = event.target.result;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
});
let currentFilters = {
    date: null,
    distance: 50,
    category: 'all'
};

let currentDate = new Date();
let selectedDate = null;

function openFilterModal() {
    const filterOverlay = document.querySelector('.filterOverlay');
    if (filterOverlay) {
        document.body.style.overflow = 'hidden';
        filterOverlay.classList.add('show');
        renderCalendar();
    }
}

function closeFilterModal() {
    const filterOverlay = document.querySelector('.filterOverlay');
    if (filterOverlay) {
        document.body.style.overflow = '';
        filterOverlay.classList.remove('show');
    }
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
    renderEventCards(sampleEvents);
}

function applyFilters() {
    let filteredEvents = [...sampleEvents];
    
    if (currentFilters.category !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.category === currentFilters.category);
    }
    
    renderEventCards(filteredEvents);
    closeFilterModal();
}

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

document.addEventListener('DOMContentLoaded', () => {
    renderEventCards(sampleEvents);
    
    document.querySelectorAll('.filterTab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filterTab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.filterTabContent').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(this.dataset.tab + 'Tab').classList.add('active');
        });
    });
    
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    const distanceInput = document.getElementById('distanceInput');
    const distanceRange = document.getElementById('distanceRange');
    
    if (distanceInput && distanceRange) {
        distanceInput.addEventListener('input', function() {
            const value = Math.min(5000, Math.max(0, this.value));
            distanceRange.value = Math.min(500, value);
            currentFilters.distance = value;
        });
        
        distanceRange.addEventListener('input', function() {
            distanceInput.value = this.value;
            currentFilters.distance = this.value;
        });
    }
    
    document.querySelectorAll('[data-distance]').forEach(btn => {
        btn.addEventListener('click', function() {
            const distance = this.dataset.distance;
            if (distanceInput && distanceRange) {
                distanceInput.value = distance;
                distanceRange.value = Math.min(500, distance);
                currentFilters.distance = distance;
            }
        });
    });
    
    document.querySelectorAll('[data-category]').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('[data-category]').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentFilters.category = this.dataset.category;
        });
    });
    
    const categorySearch = document.getElementById('categorySearch');
    if (categorySearch) {
        categorySearch.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            document.querySelectorAll('.categoryCard').forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }
    
    const eventImageInput = document.getElementById('eventImage');
    if (eventImageInput) {
        eventImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('imagePreview');
                    const placeholder = document.querySelector('.imagePlaceholder');
                    if (preview && placeholder) {
                        preview.src = event.target.result;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

let currentLocation = null;
let selectedManualLocation = null;
let searchTimeout = null;

// Open location modal
function openLocationModal() {
    const locationOverlay = document.querySelector('.locationOverlay');
    if (locationOverlay) {
        document.body.style.overflow = 'hidden';
        locationOverlay.classList.add('show');
    }
}

// Close location modal
function closeLocationModal() {
    const locationOverlay = document.querySelector('.locationOverlay');
    if (locationOverlay) {
        document.body.style.overflow = '';
        locationOverlay.classList.remove('show');
    }
}

// Enable GPS location
function enableGPS() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }
    
    // Show loading state
    const locationDisplay = document.getElementById('locationDisplay');
    if (locationDisplay) {
        locationDisplay.innerHTML = `<p class="locDes" id="locationDisplay">Getting<br>Location....</p>`;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            // Success - got GPS coordinates
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Use reverse geocoding to get location name
            reverseGeocode(lat, lng);
            
            closeLocationModal();
        },
        function(error) {
            // Reset display on error
            if (locationDisplay) {
                locationDisplay.textContent = 'Enable Location';
            }
            
            // Error handling
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    alert('Please enable location permission in your browser settings');
                    break;
                case error.POSITION_UNAVAILABLE:
                    alert('Location information is unavailable');
                    break;
                case error.TIMEOUT:
                    alert('Location request timed out');
                    break;
                default:
                    alert('An unknown error occurred');
            }
        }
    );
}

// Reverse geocode using Nominatim API
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
        
        // Extract location name (city, town, village, or district)
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
        alert('Could not determine your location. Please try manual search.');
    }
}

// Show manual input modal
function showManualInput() {
    closeLocationModal();
    const manualOverlay = document.querySelector('.manualLocationOverlay');
    if (manualOverlay) {
        manualOverlay.classList.add('show');
        // Focus on input
        setTimeout(() => {
            document.getElementById('manualLocationInput').focus();
        }, 300);
    }
}

// Back to location options
function backToLocationOptions() {
    const manualOverlay = document.querySelector('.manualLocationOverlay');
    if (manualOverlay) {
        manualOverlay.classList.remove('show');
    }
    openLocationModal();
}

// Handle location search with Nominatim API
function handleLocationSearch(query) {
    const suggestionsContainer = document.getElementById('locationSuggestions');
    
    if (!query || query.trim().length < 2) {
        suggestionsContainer.innerHTML = '';
        return;
    }
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Show loading
    suggestionsContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
            <i class="fa-solid fa-spinner fa-spin"></i> Searching...
        </div>
    `;
    
    // Debounce search
    searchTimeout = setTimeout(async () => {
        try {
            // Use Nominatim API to search for places
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
            
            // Filter to exclude street-level addresses (only cities, towns, villages, districts)
            const filteredResults = results.filter(result => {
                const type = result.type;
                const addressType = result.address;
                
                // Include cities, towns, villages, districts, counties, states
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
            
            // Display suggestions
            suggestionsContainer.innerHTML = filteredResults.map(result => {
                const address = result.address;
                const locationName = address.city || 
                                    address.town || 
                                    address.village || 
                                    address.county || 
                                    address.state_district || 
                                    result.name;
                
                const locationDetail = `${address.state || ''}, ${address.country || ''}`.replace(/^, |, $/g, '');
                
                return `
                    <div class="suggestionItem" onclick='selectLocation(${JSON.stringify({
                        name: locationName,
                        lat: parseFloat(result.lat),
                        lng: parseFloat(result.lon),
                        fullAddress: result.display_name
                    })})'>
                        <div class="suggestionIcon">
                            <i class="fa-solid fa-location-dot"></i>
                        </div>
                        <div class="suggestionText">
                            <h4>${locationName}</h4>
                            <p>${locationDetail}</p>
                        </div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Location search error:', error);
            suggestionsContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    Search failed. Please try again.
                </div>
            `;
        }
    }, 500); // 500ms debounce
}

// Select location from suggestions
function selectLocation(locationData) {
    selectedManualLocation = locationData;
    
    // Highlight selected item
    document.querySelectorAll('.suggestionItem').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.closest('.suggestionItem').classList.add('selected');
}

// Confirm manual location
function confirmManualLocation() {
    if (!selectedManualLocation) {
        alert('Please select a location from the suggestions');
        return;
    }
    
    currentLocation = selectedManualLocation;
    updateLocationDisplay(selectedManualLocation.name);
    
    // Close manual location modal
    const manualOverlay = document.querySelector('.manualLocationOverlay');
    if (manualOverlay) {
        manualOverlay.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    // Clear search
    document.getElementById('manualLocationInput').value = '';
    document.getElementById('locationSuggestions').innerHTML = '';
    selectedManualLocation = null;
}

// Update location display in navbar
function updateLocationDisplay(locationName) {
    const locationDisplay = document.getElementById('locationDisplay');
    if (locationDisplay) {
        // Truncate if too long
        const displayName = locationName.length > 15 ? 
                           locationName.substring(0, 15) + '...' : 
                           locationName;
        locationDisplay.textContent = displayName;
        locationDisplay.title = locationName; // Show full name on hover
    }
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Update existing event filtering to use current location
function applyFilters() {
    let filteredEvents = [...sampleEvents];
    
    // Filter by location if set
    if (currentLocation && currentFilters.distance) {
        filteredEvents = filteredEvents.filter(event => {
            const distance = calculateDistance(
                currentLocation.lat,
                currentLocation.lng,
                event.lat,
                event.lng
            );
            return distance <= currentFilters.distance;
        });
    }
    
    // Filter by category
    if (currentFilters.category !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.category === currentFilters.category);
    }
    
    renderEventCards(filteredEvents);
    closeFilterModal();
}

// Close modals on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const locationOverlay = document.querySelector('.locationOverlay');
        const manualOverlay = document.querySelector('.manualLocationOverlay');
        const filterOverlay = document.querySelector('.filterOverlay');
        
        if (manualOverlay && manualOverlay.classList.contains('show')) {
            manualOverlay.classList.remove('show');
        } else if (locationOverlay && locationOverlay.classList.contains('show')) {
            closeLocationModal();
        } else if (filterOverlay && filterOverlay.classList.contains('show')) {
            closeFilterModal();
        }
    }
});


