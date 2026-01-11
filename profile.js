// --- FIREBASE CONFIG (Must match index.html) ---
const firebaseConfig = {
    apiKey: "AIzaSyBqeFuoFfT-z7YhRoWOIH2nKO_oV3hiQkk",
    authDomain: "mapzo-368c2.firebaseapp.com",
    projectId: "mapzo-368c2",
    storageBucket: "mapzo-368c2.firebasestorage.app",
    messagingSenderId: "803894616922",
    appId: "1:803894616922:web:ec5d59b466b90c75538963",
    measurementId: "G-97HKCXB2L9"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// --- 1. AUTH & DATA LOAD ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserProfile(user.uid);
        // Default to showing hosted events, or initialize tabs if they exist
        switchProfileTab('hosted');
    } else {
        // Redirect if not logged in
        window.location.href = 'index.html';
    }
});

// --- 2. LOAD USER PROFILE ---
function loadUserProfile(uid) {
    db.collection('users').doc(uid).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            updateUI(data);
        } else {
            // If user doc doesn't exist, use Auth data
            updateUI({
                displayName: currentUser.displayName,
                email: currentUser.email,
                photoURL: currentUser.photoURL
            });
        }
    }).catch(err => console.error("Error loading profile:", err));
}

function updateUI(data) {
    document.getElementById('profileName').textContent = data.displayName || "User";
    document.getElementById('profileEmail').textContent = data.email || currentUser.email;
    document.getElementById('profileBio').textContent = data.bio || "No bio yet.";
    document.getElementById('profileLocation').textContent = data.location || "Add Location";
    
    // Avatar
    const avatarEl = document.getElementById('profileAvatar');
    avatarEl.src = data.photoURL || "https://via.placeholder.com/150";

    // Social Link
    const socialLink = document.getElementById('profileSocial');
    if (data.socialLink) {
        socialLink.href = data.socialLink;
        socialLink.textContent = "Instagram";
        socialLink.style.color = "#1db954";
    } else {
        socialLink.textContent = "Add Social";
        socialLink.removeAttribute('href');
        socialLink.style.color = "#ccc";
    }

    // Pre-fill Edit Form
    document.getElementById('editName').value = data.displayName || "";
    document.getElementById('editLocation').value = data.location || "";
    document.getElementById('editBio').value = data.bio || "";
    document.getElementById('editSocial').value = data.socialLink || "";
}

// --- 3. TAB SWITCHING LOGIC (Hosted vs Tickets) ---
function switchProfileTab(tab) {
    const list = document.getElementById('myEventsList');
    const tabHosted = document.getElementById('tabHosted');
    const tabTickets = document.getElementById('tabTickets');

    // Reset styles if buttons exist
    if (tabHosted && tabTickets) {
        if (tab === 'hosted') {
            tabHosted.style.color = '#fff';
            tabTickets.style.color = '#666';
            loadUserEvents(currentUser.uid);
        } else {
            tabHosted.style.color = '#666';
            tabTickets.style.color = '#fff';
            loadUserTickets(currentUser.uid);
        }
    } else {
        // Fallback if tabs aren't in HTML yet
        loadUserEvents(currentUser.uid);
    }
}

// --- 4. LOAD HOSTED EVENTS (With Analytics) ---
function loadUserEvents(uid) {
    const list = document.getElementById('myEventsList');
    list.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Loading events...</p>';
    
    db.collection('events').where('hostId', '==', uid).get().then((snapshot) => {
        list.innerHTML = "";
        if (snapshot.empty) {
            list.innerHTML = '<p style="color:#666; text-align:center; width:100%;">You haven\'t hosted any events yet.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const event = doc.data();
            const id = doc.id;
            let displayImage = (event.images && event.images.length > 0) ? event.images[0] : 'https://via.placeholder.com/300x200';

            const card = document.createElement('div');
            card.className = 'eventCard';
            
            // Analytics Calculation
            const views = event.views || 0;
            const interest = Math.floor(views * 0.4); // Simulated engagement metric

            card.innerHTML = `
                <div class="eventImage" style="height:160px;">
                    <img src="${displayImage}" style="width:100%; height:100%; object-fit:cover;">
                    <span class="eventCategory" style="top:10px; right:10px; font-size:0.6rem;">${event.category}</span>
                </div>
                <div class="eventInfo" style="padding:15px 15px 5px 15px;">
                    <h4 style="margin:0 0 5px; color:#fff;">${event.title}</h4>
                    <p style="font-size:0.8rem; color:#888; margin-bottom:10px;">${event.date}</p>
                </div>
                <div style="display:flex; justify-content:space-between; padding:10px 15px; background:#222; margin-top:5px; border-radius:0 0 16px 16px; font-size:0.8rem; color:#ccc; border-top:1px solid #333;">
                    <span><i class="fa-solid fa-eye" style="color:#1db954;"></i> ${views} Views</span>
                    <span><i class="fa-solid fa-users" style="color:#4285f4;"></i> ~${interest} Interested</span>
                </div>
            `;
            card.onclick = () => window.location.href = `event.html?id=${id}`;
            list.appendChild(card);
        });
    });
}

// --- 5. LOAD USER TICKETS (Feature 2) ---
function loadUserTickets(uid) {
    const list = document.getElementById('myEventsList');
    list.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Loading tickets...</p>';

    db.collection('users').doc(uid).collection('tickets').get().then(snapshot => {
        list.innerHTML = "";
        if (snapshot.empty) {
            list.innerHTML = '<p style="color:#666; text-align:center; width:100%;">No tickets booked yet.</p>';
            return;
        }

        snapshot.forEach(ticketDoc => {
            const ticket = ticketDoc.data();
            
            // Fetch the actual event details
            db.collection('events').doc(ticket.eventId).get().then(eventDoc => {
                if (eventDoc.exists) {
                    const event = eventDoc.data();
                    let displayImage = (event.images && event.images.length > 0) ? event.images[0] : 'https://via.placeholder.com/300x200';

                    const card = document.createElement('div');
                    card.className = 'eventCard';
                    card.innerHTML = `
                        <div class="eventImage" style="height:160px;">
                            <img src="${displayImage}" style="width:100%; height:100%; object-fit:cover; filter:grayscale(20%);">
                            <span style="position:absolute; top:10px; right:10px; background:#fff; color:#000; padding:4px 8px; border-radius:4px; font-size:0.7rem; font-weight:800;">TICKET</span>
                        </div>
                        <div class="eventInfo" style="padding:15px;">
                            <h4 style="margin:0 0 5px; color:#fff;">${event.title}</h4>
                            <p style="font-size:0.8rem; color:#1db954;">Tap to view QR Code <i class="fa-solid fa-qrcode"></i></p>
                        </div>
                    `;
                    // Click opens QR Modal instead of event page
                    card.onclick = () => showTicketModal(ticket.eventId, event.title, uid);
                    list.appendChild(card);
                }
            });
        });
    });
}

// --- 6. SHOW QR TICKET MODAL (Feature 1 Support) ---
function showTicketModal(eventId, title, uid) {
    // Check if QR library is loaded
    if (typeof QRCode === 'undefined') {
        alert("QR Code library missing. Please add the script tag to profile.html");
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'authOverlay show';
    modal.id = 'ticketModal';
    modal.innerHTML = `
        <div class="authModal" style="text-align:center; padding:30px; max-width:350px;">
            <h2 style="color:#1db954; margin-bottom:10px;">Ticket Confirmed! 🎉</h2>
            <p style="color:#ccc; margin-bottom:20px; font-size:0.9rem;">${title}</p>
            <div id="qrcode" style="display:flex; justify-content:center; margin:0 auto 20px; padding:15px; background:#fff; border-radius:10px; width:fit-content;"></div>
            <p style="font-size:0.8rem; color:#666;">Scan this at the venue entrance</p>
            <button onclick="document.getElementById('ticketModal').remove()" class="authPrimaryBtn" style="margin-top:15px;">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Generate QR
    new QRCode(modal.querySelector("#qrcode"), {
        text: `TICKET:${eventId}:${uid}`,
        width: 150,
        height: 150
    });
}

// --- 7. LOGOUT ---
function handleLogout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// --- 8. EDIT MODAL FUNCTIONS ---
function openEditModal() {
    document.getElementById('editProfileOverlay').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editProfileOverlay').classList.remove('show');
}

// Handle Form Submit
document.getElementById('editProfileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    const updates = {
        displayName: document.getElementById('editName').value,
        location: document.getElementById('editLocation').value,
        bio: document.getElementById('editBio').value,
        socialLink: document.getElementById('editSocial').value,
        email: currentUser.email // ensure email stays
    };

    db.collection('users').doc(currentUser.uid).set(updates, { merge: true })
        .then(() => {
            loadUserProfile(currentUser.uid); // Refresh UI
            closeEditModal();
        })
        .catch(err => alert("Error saving profile: " + err.message))
        .finally(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        });
});

// --- 9. AVATAR UPLOAD ---
document.getElementById('avatarInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show loading state on image
    const avatarEl = document.getElementById('profileAvatar');
    avatarEl.style.opacity = '0.5';

    compressImage(file).then(base64 => {
        // Save to Firestore
        db.collection('users').doc(currentUser.uid).set({
            photoURL: base64
        }, { merge: true }).then(() => {
            avatarEl.src = base64;
            avatarEl.style.opacity = '1';
        });
    }).catch(err => {
        console.error(err);
        alert("Image upload failed");
        avatarEl.style.opacity = '1';
    });
});

// Reuse Image Compression Logic
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300; // Small size for avatar
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
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
        reader.onerror = reject;
    });
}
