// --- CONFIG ---
// --- CONFIG ---
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:3000"
    : "https://backend-jwqn.onrender.com";

// --- FIREBASE CONFIG (Must verify if needed or use window.auth from index if loaded) ---
// Since this script is loaded after Firebase SDKs in profile.html, we can use global firebase object.
const firebaseConfig = {
    apiKey: "AIzaSyDIpZtXSSK99wcbwHGvKEWAykme_6OPp00",
    authDomain: "mapzo-26259.firebaseapp.com",
    projectId: "mapzo-26259",
    storageBucket: "mapzo-26259.firebasestorage.app",
    messagingSenderId: "701273875886",
    appId: "1:701273875886:web:00d1d079ba6875139dd43f",
    measurementId: "G-2PJ0TMZVJT"
};

// Initialize Firebase if needed
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

let currentUser = null;
let currentToken = null;

// --- 1. AUTH & DATA LOAD ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        try {
            currentToken = await user.getIdToken();
            loadUserProfile();
            loadUserEvents();
        } catch (e) {
            console.error("Error getting token:", e);
        }
    } else {
        // Redirect if not logged in
        window.location.href = 'index.html';
    }
});

// --- 2. LOAD USER PROFILE ---
async function loadUserProfile() {
    try {
        const res = await fetch(`${API_URL}/api/user/me`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (res.status === 404) {
            // Should verify/sync if missing, but for now rely on auth/google sync
            console.warn("User not found in DB");
        }

        const data = await res.json();
        if (data.success) {
            updateUI(data.user);
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

function updateUI(user) {
    document.getElementById('profileName').textContent = user.display_name || currentUser.displayName || "User";
    document.getElementById('profileEmail').textContent = user.email || currentUser.email;
    document.getElementById('profileBio').textContent = user.bio || "No bio yet (Edit to add)"; // bio col not in DB yet, placeholder
    document.getElementById('profileLocation').textContent = "Universe"; // Loc col exists but let's keep it simple

    // Avatar
    const avatarEl = document.getElementById('profileAvatar');
    avatarEl.src = user.photo_url || currentUser.photoURL || "https://via.placeholder.com/150";

    // Social Link placeholder
    const socialLink = document.getElementById('profileSocial');
    socialLink.textContent = "Add Social";
    socialLink.style.color = "#ccc";

    // Pre-fill Edit Form
    document.getElementById('editName').value = user.display_name || "";
}

// --- 3. LOAD HOSTED EVENTS ---
async function loadUserEvents() {
    const list = document.getElementById('myEventsList');
    list.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Loading events...</p>';

    try {
        const res = await fetch(`${API_URL}/api/user/events`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();

        list.innerHTML = "";
        if (!data.success || data.events.length === 0) {
            list.innerHTML = '<p style="color:#666; text-align:center; width:100%;">You haven\'t hosted any events yet.</p>';
            return;
        }

        data.events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'eventCard';

            // Image handling
            let imgUrl = event.image_url || 'https://via.placeholder.com/300x200';

            const views = event.views || 0;

            card.innerHTML = `
                <div class="eventImage" style="height:160px;">
                    <img src="${imgUrl}" style="width:100%; height:100%; object-fit:cover;">
                    <span class="eventCategory" style="top:10px; right:10px; font-size:0.6rem;">${event.category || 'Event'}</span>
                </div>
                <div class="eventInfo" style="padding:15px 15px 5px 15px;">
                    <h4 style="margin:0 0 5px; color:#fff;">${event.title}</h4>
                    <p style="font-size:0.8rem; color:#888; margin-bottom:10px;">
                        ${new Date(event.event_date).toLocaleDateString()}
                    </p>
                </div>
                <div style="display:flex; justify-content:space-between; padding:10px 15px; background:#222; margin-top:5px; border-radius:0 0 16px 16px; font-size:0.8rem; color:#ccc; border-top:1px solid #333;">
                    <span><i class="fa-solid fa-eye" style="color:#1db954;"></i> ${views} Views</span>
                </div>
            `;
            // Link to event page
            card.onclick = () => window.location.href = `event.html?id=${event.id}`;
            list.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        list.innerHTML = '<p style="color:red; text-align:center;">Failed to load events.</p>';
    }
}

// --- 4. LOGOUT ---
function handleLogout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// --- 5. EDIT MODAL FUNCTIONS ---
function openEditModal() {
    document.getElementById('editProfileOverlay').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editProfileOverlay').classList.remove('show');
}

// Handle Form Submit (Profile Update)
document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.textContent = "Saving...";
    btn.disabled = true;

    const newName = document.getElementById('editName').value;

    try {
        const res = await fetch(`${API_URL}/api/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ display_name: newName })
        });

        const data = await res.json();
        if (data.success) {
            loadUserProfile(); // Refresh UI
            closeEditModal();
        } else {
            alert(data.error || "Update failed");
        }
    } catch (err) {
        alert("Error saving profile");
    } finally {
        btn.textContent = "Save Changes";
        btn.disabled = false;
    }
});

// --- 6. AVATAR UPLOAD ---
document.getElementById('avatarInput').addEventListener('change', async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show loading state
    const avatarEl = document.getElementById('profileAvatar');
    avatarEl.style.opacity = '0.5';

    try {
        const base64 = await compressImage(file);

        const res = await fetch(`${API_URL}/api/user/avatar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ imageBase64: base64 })
        });

        const data = await res.json();

        if (data.success) {
            avatarEl.src = data.photo_url;
        } else {
            alert("Upload failed: " + data.error);
        }

    } catch (err) {
        console.error(err);
        alert("Image upload error");
    } finally {
        avatarEl.style.opacity = '1';
    }
});

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 300;
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
