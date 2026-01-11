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
let userLocationMarker = null;

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
// 5. UPLOAD MAP (Host Event Form)
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
// 6. GPS FUNCTIONS (Host & User)
// ========================================

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

function updateUIForLogin(user) {
    const logSignBox = document.querySelector(".logSignBox");
    const hostBar = document.querySelector(".hostBar");
    const userEmail = user.email ? user.email.toLowerCase() : "";

    if (logSignBox) {
        logSignBox.innerHTML = `
            <div style="text-align:center;">
                <p style="font-size:0.8rem;color:#aaa;margin-bottom:6px;">${user.email}</p>
                <button class="logSign" onclick="handleLogout()" style="background:rgba(255, 68, 68, 0.15); border:1px solid rgba(255,68,68,0.3); color:#ff4444; padding:8px 12px; font-size:0.9rem;">
                    Sign Out
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
    auth.signOut().then(() => {
        alert("Logged out successfully.");
        window.location.reload();
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    auth.signInWithPopup(provider)
        .then((result) => {
            const user = result.user;
            console.log("Google Sign In Success:", user.email);
            closeAuth();
            alert(`Welcome, ${user.displayName || 'User'}! 🚀`);
        })
        .catch((error) => {
            console.error("Google Error:", error);
            alert("Google Sign In Failed: " + error.message);
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

function openUploadForm() {
    if (!currentUser) return alert("Log in first.");
    const userEmail = currentUser.email ? currentUser.email.toLowerCase() : "";
    if (!ALLOWED_HOST_EMAILS.includes(userEmail)) return alert("Not authorized.");
    document.querySelector(".uploadOverlay").classList.add("show");
    setTimeout(() => { if (!uploadMap) initUploadMap(); }, 300);
}

function closeUploadForm() { 
    document.querySelector(".uploadOverlay").classList.remove("show"); 
}

// ========================================
// 9. EVENT DISPLAY (ENHANCED WITH CHAT)
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

        // Check if event is live (current date/time matches event date)
        const isLive = checkIfEventIsLive(event);
        const liveBadge = isLive ? '<span class="liveBadge">🔴 LIVE</span>' : '';
        const chatButton = isLive ? `<button class="chatBtn" onclick="openChatModal('${event.id}')">💬 Chat</button>` : '';

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
                <p class="eventDate"><i class="fa-regular fa-calendar"></i> ${event.date}</p>
                <p class="eventLocation"><i class="fa-solid fa-location-dot"></i> ${event.location}</p>
                <div class="eventActions">
                    ${chatButton}
                </div>
            </div>
        `;
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
    
    if (!map) return;

    events.forEach(event => {
        if (!event.lat || !event.lng) return;
        
        // Get emoji for event category
        const emoji = EVENT_EMOJIS[event.category.toLowerCase()] || EVENT_EMOJIS['default'];
        
        // Create custom emoji marker
        const marker = new google.maps.Marker({
            position: { lat: event.lat, lng: event.lng },
            map: map,
            icon: createEmojiIcon(emoji),
            title: event.title
        });
        
        // Add click listener
        marker.addListener('click', () => {
            window.location.href = `event.html?id=${event.id}`;
        });
        
        eventMarkers.push(marker);
    });
}

function createEmojiIcon(emoji) {
    // Create a custom icon with emoji
    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <text x="20" y="25" text-anchor="middle" font-size="24">${emoji}</text>
            </svg>
        `),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20)
    };
}

// ========================================
// 11. CHAT FUNCTIONALITY
// ========================================

// Check if event is currently live
function checkIfEventIsLive(event) {
    if (!event.date) return false;
    
    const eventDate = new Date(event.date);
    const now = new Date();
    const timeDiff = Math.abs(now - eventDate);
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Consider event "live" if it's within 2 hours of start time
    return hoursDiff <= 2;
}

// Open chat modal for an event
function openChatModal(eventId) {
    if (!currentUser) {
        alert('Please log in to join the chat.');
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
            alert('Failed to send message. Please try again.');
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
            views: 0,
            isLive: false // Will be updated by time checker
        };

        const eventRef = await window.db.collection('events').add(newEvent);
        
        // Initialize chat document for the event
        await window.db.collection('chats').doc(eventRef.id).set({
            eventId: eventRef.id,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            participantCount: 0
        });

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
// 13. SMART SEARCH (UNCHANGED)
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

// ========================================
// 14. ADVANCED FILTER LOGIC (UNCHANGED)
// ========================================

const filterState = {
    date: null,
    distance: 5000,
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

document.addEventListener('click', function(e) {
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
    fixFilterButtons();
    document.querySelector('.filterOverlay').classList.add('show');
    initCalendar();
    
    const slider = document.getElementById('distanceRange');
    const displayVal = filterState.distance >= 500 ? 500 : filterState.distance;
    if(slider) {
        slider.value = displayVal;
        updateDistanceDisplay(displayVal); 
    }
}

function closeFilterModal() {
    document.querySelector('.filterOverlay').classList.remove('show');
}

function resetFilters() {
    filterState.date = null;
    filterState.distance = 5000;
    filterState.category = 'all';
    
    document.querySelectorAll('.calendarDay').forEach(d => d.classList.remove('selected'));
    document.querySelectorAll('.quickFilterBtn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.categoryCard').forEach(c => c.classList.remove('active'));
    
    const allCatBtn = document.querySelector('.categoryCard[data-category="all"]');
    if(allCatBtn) allCatBtn.classList.add('active');

    const distRange = document.getElementById('distanceRange');
    if (distRange) {
        distRange.value = 500;
        updateDistanceDisplay(500); 
    }

    applyFilters();
}

const filterTabs = document.querySelectorAll('.filterTab');
filterTabs.forEach(tab => {
    tab.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        filterTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.filterTabContent').forEach(c => c.classList.remove('active', 'show'));
        
        this.classList.add('active');
        const targetId = this.getAttribute('data-tab') + 'Tab';
        const targetContent = document.getElementById(targetId);
        if(targetContent) {
            targetContent.classList.add('active');
            setTimeout(() => targetContent.classList.add('show'), 10);
        }
    });
});

let currentCalendarDate = new Date();

function initCalendar() {
    const monthDisplay = document.getElementById('currentMonth');
    const calendarDays = document.getElementById('calendarDays');
    if(!calendarDays) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthDisplay.innerText = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;

    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();

    calendarDays.innerHTML = "";

    for (let i = 0; i < firstDay; i++) {
        calendarDays.appendChild(document.createElement('div'));
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendarDay';
        dayDiv.innerText = i;
        
        const thisDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), i);
        
        if (thisDate < today) {
            dayDiv.classList.add('disabled');
        } else {
            dayDiv.onclick = function(e) {
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
if(prevM) prevM.onclick = (e) => { e.preventDefault(); currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); initCalendar(); };
if(nextM) nextM.onclick = (e) => { e.preventDefault(); currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); initCalendar(); };

function selectDate(date, element) {
    filterState.date = date;
    document.querySelectorAll('.calendarDay').forEach(d => d.classList.remove('selected'));
    document.querySelectorAll('.quickFilterBtn').forEach(b => b.classList.remove('active'));
    element.classList.add('selected');
}

document.querySelectorAll('.quickFilterBtn[data-quick]').forEach(btn => {
    btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();

        const type = this.getAttribute('data-quick');
        document.querySelectorAll('.quickFilterBtn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.calendarDay').forEach(d => d.classList.remove('selected'));
        this.classList.add('active');

        const today = new Date();
        today.setHours(0,0,0,0);

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
    const numVal = parseInt(val);
    const distRange = document.getElementById('distanceRange');
    const distInput = document.getElementById('distanceInput');
    
    if(distRange) {
        distRange.value = numVal;
        const percentage = (numVal / 500) * 100;
        distRange.style.setProperty('--value', `${percentage}%`);
    }
    if(distInput) distInput.value = numVal;
    
    filterState.distance = (numVal >= 500) ? 5000 : numVal;
}

const dRange = document.getElementById('distanceRange');
const dInput = document.getElementById('distanceInput');
if(dRange) dRange.addEventListener('input', (e) => updateDistanceDisplay(e.target.value));
if(dInput) dInput.addEventListener('input', (e) => updateDistanceDisplay(e.target.value));

document.querySelectorAll('.quickFilterBtn[data-distance]').forEach(btn => {
    btn.onclick = function(e) {
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
if(categoryGrid) {
    const cards = categoryGrid.querySelectorAll('.categoryCard');
    cards.forEach(card => {
        card.removeAttribute('onclick');
        
        card.addEventListener('click', function(e) {
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

    if (filterState.distance < 500 && !currentLocation) {
        alert("Please enable location (Blue Button on Top) to filter by distance.");
    }

    const filtered = window.allEvents.filter(event => {
        let matchDate = true;
        let matchDist = true;
        let matchCat = true;

        if (filterState.date) {
            const eDate = new Date(event.date); eDate.setHours(0,0,0,0);
            const today = new Date(); today.setHours(0,0,0,0);

            if (filterState.date instanceof Date) {
                const fDate = new Date(filterState.date); fDate.setHours(0,0,0,0);
                matchDate = eDate.getTime() === fDate.getTime();
            } else if (filterState.date === 'week') {
                const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
                matchDate = eDate >= today && eDate <= nextWeek;
            } else if (filterState.date === 'month') {
                matchDate = eDate.getMonth() === today.getMonth() && eDate.getFullYear() === today.getFullYear();
            }
        }

        if (filterState.distance < 500) {
            if (currentLocation && event.lat && event.lng) {
                const km = getDistanceFromLatLonInKm(currentLocation.lat, currentLocation.lng, parseFloat(event.lat), parseFloat(event.lng));
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

    renderEventCards(filtered);
    addEventMarkers(filtered);

    if (filtered.length === 0) {
        alert("No events found with these filters.");
    }

    closeFilterModal();
}

// Initial Fix
fixFilterButtons();

// ========================================
// 15. INIT LISTENERS
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    if (typeof google !== 'undefined' && google.maps && !mapInitialized) window.initMap();
    
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
                alert("Login Successful!");
            })
            .catch((error) => {
                let msg = error.message;
                if(error.code === 'auth/wrong-password') msg = "Incorrect password.";
                if(error.code === 'auth/user-not-found') msg = "No account found with this email.";
                alert(msg);
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
            
            if(password.length < 6) return alert("Password should be at least 6 characters");

            const oldText = btn.innerText;
            btn.innerText = "Creating...";
            btn.disabled = true;

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    closeAuth();
                    alert("Account Created Successfully! Welcome.");
                })
                .catch((error) => {
                    let msg = error.message;
                    if(error.code === 'auth/email-already-in-use') msg = "Email already in use. Please Log In.";
                    alert(msg);
                })
                .finally(() => {
                    btn.innerText = oldText;
                    btn.disabled = false;
                });
        });
    }

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
        snapshot.forEach((doc) => { 
            const event = { id: doc.id, ...doc.data() };
            // Update live status based on current time
            event.isLive = checkIfEventIsLive(event);
            events.push(event); 
        });
        window.allEvents = events; 
        renderEventCards(events); 
        addEventMarkers(events);
    });
}
