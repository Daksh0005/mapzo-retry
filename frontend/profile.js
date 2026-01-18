// --- CONFIG ---
// API_URL is now loaded from utils.js

// --- 1. AUTH & DATA LOAD ---
// Wait for global auth to be ready (from utils.js) or listen to onAuthStateChanged
console.log("Profile.js loaded");
// utils.js already declares 'auth' globally via let auth. 
// We use a different name here to avoid "Identifier 'auth' has already been declared" error.
const userAuth = window.auth || (typeof firebase !== 'undefined' ? firebase.auth() : null);

// ✅ Fix reference error
const API_URL = window.API_URL;

let currentUser = null;
let currentToken = null;

if (!userAuth) {
    console.error("Auth not initialized!");
    showToast("System Error: Auth failed", "error");
} else {
    // Auth State Listener
    userAuth.onAuthStateChanged(async (user) => {
        console.log("Auth State Changed:", user ? "User Logged In" : "No User");
        if (user) {
            currentUser = user;
            try {
                currentToken = await user.getIdToken();
                loadUserProfile();
                loadUserEvents();
                loadUserTickets();
            } catch (e) {
                console.error("Error getting token:", e);
            }
        } else {
            // Redirect if not logged in
            window.location.href = 'index.html';
        }
    });
}

// --- 2. LOAD USER PROFILE ---
async function loadUserProfile() {
    console.log("Loading Profile...");
    try {
        const apiUrl = window.API_URL; // Explicit usage
        if (!apiUrl) throw new Error("API_URL is undefined");

        const res = await fetch(`${apiUrl}/api/user/me`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await res.json();
        if (data.success) {
            updateUI(data.user);
        } else {
            console.error("Profile load failed:", data.error);
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

function updateUI(user) {
    document.getElementById('profileName').textContent = user.display_name || currentUser.displayName || "User";
    document.getElementById('profileEmail').textContent = user.email || currentUser.email;
    document.getElementById('profileBio').textContent = user.bio || "No bio yet. Tap edit to add one!";

    // Org/Loc display
    const locSpan = document.getElementById('profileLocation');
    if (user.organization) {
        locSpan.textContent = user.organization;
    } else {
        locSpan.textContent = "Universe";
    }

    // Avatar
    const avatarEl = document.getElementById('profileAvatar');
    avatarEl.src = user.photo_url || currentUser.photoURL || "https://via.placeholder.com/150";

    // Social Link
    const socialLink = document.getElementById('profileSocial');
    if (user.social_links && user.social_links.instagram) {
        socialLink.href = user.social_links.instagram;
        socialLink.textContent = "Instagram Profile";
        socialLink.style.color = "#1db954";
    } else {
        socialLink.textContent = "Add Social";
        socialLink.style.color = "#ccc";
    }

    // Pre-fill Edit Form
    document.getElementById('editName').value = user.display_name || "";
    document.getElementById('editOrg').value = user.organization || "";
    document.getElementById('editPhone').value = user.phone || "";
    document.getElementById('editBio').value = user.bio || "";
    document.getElementById('editSocial').value = (user.social_links && user.social_links.instagram) ? user.social_links.instagram : "";
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

        renderEventList(data.events, list);
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p style="color:red; text-align:center;">Failed to load events.</p>';
    }
}

// --- 3b. LOAD JOINED EVENTS (TICKETS) ---
async function loadUserTickets() {
    const list = document.getElementById('myTicketsList');
    if (!list) return;
    list.innerHTML = '<p style="text-align:center; width:100%; color:#666;">Loading tickets...</p>';

    try {
        const res = await fetch(`${API_URL}/api/user/tickets`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await res.json();

        list.innerHTML = "";
        if (!data.success || data.tickets.length === 0) {
            list.innerHTML = '<p style="color:#666; text-align:center; width:100%;">No event tickets found.</p>';
            return;
        }

        renderEventList(data.tickets, list, true);
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p style="color:red; text-align:center;">Failed to load tickets.</p>';
    }
}

function renderEventList(events, container, isTicket = false) {
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'eventCard';
        let imgUrl = event.image_url || 'https://via.placeholder.com/300x200';
        const views = event.views || 0;

        card.innerHTML = `
            <div class="eventImage" style="height:160px;">
                <img src="${imgUrl}" style="width:100%; height:100%; object-fit:cover;">
                <span class="eventCategory" style="top:10px; right:10px; font-size:0.6rem;">${isTicket ? 'JOINED ✅' : (event.category || 'Event')}</span>
            </div>
            <div class="eventInfo" style="padding:15px 15px 5px 15px;">
                <h4 style="margin:0 0 5px; color:#fff;">${event.title}</h4>
                <p style="font-size:0.8rem; color:#888; margin-bottom:10px;">
                    ${new Date(event.event_date).toLocaleDateString()}
                </p>
            </div>
            <div style="display:flex; justify-content:space-between; padding:10px 15px; background:#222; margin-top:5px; border-radius:0 0 16px 16px; font-size:0.8rem; color:#ccc; border-top:1px solid #333;">
                <span><i class="fa-solid fa-eye" style="color:#1db954;"></i> ${views} Views</span>
                ${isTicket ? `<span>ID: ...${event.id.slice(-4)}</span>` : ''}
            </div>
        `;
        card.onclick = () => window.location.href = `event.html?id=${event.id}`;
        container.appendChild(card);
    });
}

// --- 4. LOGOUT ---
function handleLogout() {
    console.log("Signing out...");
    if (typeof userAuth !== 'undefined' && userAuth) {
        userAuth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch(e => console.error("SignOut Error", e));
    } else {
        // Fallback to global auth if userAuth is blocked scope
        const localAuth = window.auth || firebase.auth();
        localAuth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    }
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
    const newOrg = document.getElementById('editOrg').value;
    const newPhone = document.getElementById('editPhone').value;
    const newBio = document.getElementById('editBio').value;
    const newSocial = document.getElementById('editSocial').value;

    const profileData = {
        display_name: newName,
        organization: newOrg,
        phone: newPhone,
        bio: newBio,
        social_links: { instagram: newSocial }
    };

    try {
        const res = await fetch(`${window.API_URL}/api/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(profileData)
        });

        const data = await res.json();
        if (data.success) {
            // SYNC FIREBASE PROFILE
            if (currentUser) {
                await currentUser.updateProfile({ displayName: newName }).catch(err => console.error("Firebase Profile Update Error", err));
            }

            showToast("Profile updated! ✨", "success");
            loadUserProfile(); // Refresh UI
            closeEditModal();
        } else {
            showToast(data.error || "Update failed", "error");
        }
    } catch (err) {
        showToast("Error saving profile", "error");
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

        const res = await fetch(`${window.API_URL}/api/user/avatar`, {
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
            showToast("Upload failed", "error");
        }

    } catch (err) {
        console.error(err);
        showToast("Image upload error", "error");
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
