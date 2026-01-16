function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html";
  }
}

requireAuth();


// --- FIREBASE CONFIG (Must match index.html) ---

// Initialize Firebase if not already initialized


// --- 1. AUTH & DATA LOAD ---
const API_BASE = "https://backend-jwqn.onrender.com";
let currentUser = null;
async function loadProfile() {
    try {
        const res = await fetch(`${API_BASE}/api/user/me`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (!res.ok) throw new Error("Unauthorized");

        const data = await res.json();
        currentUser = data.user;
        updateUI(currentUser);
        switchProfileTab("hosted");

    } catch (err) {
        console.error(err);
        window.location.href = "index.html";
    }
}

loadProfile();


// --- 2. LOAD USER PROFILE ---


function updateUI(data) {
    document.getElementById("profileName").textContent =
        data.display_name || "User";

    document.getElementById("profileEmail").textContent =
        data.email;

    document.getElementById("profileBio").textContent =
        data.bio || "No bio yet.";

    document.getElementById("profileLocation").textContent =
        data.location || "Add Location";

    document.getElementById("profileAvatar").src =
        data.photo_url || "https://via.placeholder.com/150";

    document.getElementById("editName").value =
        data.display_name || "";

    document.getElementById("editBio").value =
        data.bio || "";
}


// --- 3. TAB SWITCHING LOGIC (Hosted vs Tickets) ---
function switchProfileTab(tab) {
    if (tab === "hosted") {
        loadUserEvents();
    } else {
        document.getElementById("myEventsList").innerHTML =
            "<p>Tickets feature coming soon.</p>";
    }
}

// --- 4. LOAD HOSTED EVENTS (With Analytics) ---
async function loadUserEvents() {
    const list = document.getElementById("myEventsList");
    list.innerHTML = "Loading events...";

    try {
        const res = await fetch(`${API_BASE}/api/events/mine`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        });

        const data = await res.json();

        list.innerHTML = "";

        if (!data.events.length) {
            list.innerHTML = "<p>You haven't hosted any events yet.</p>";
            return;
        }

        data.events.forEach(event => {
            const card = document.createElement("div");
            card.className = "eventCard";
            card.innerHTML = `
                <h4>${event.title}</h4>
                <p>${new Date(event.event_date).toLocaleDateString()}</p>
                <p>${event.views} views</p>
            `;
            card.onclick = () =>
                window.location.href = `event.html?id=${event.id}`;
            list.appendChild(card);
        });

    } catch (err) {
        list.innerHTML = "<p>Error loading events</p>";
    }
}

// --- 5. LOAD USER TICKETS (Feature 2) ---


// --- 6. SHOW QR TICKET MODAL (Feature 1 Support) ---

// --- 7. LOGOUT ---

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

    
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = "Saving...";
    btn.disabled = true;

    const updates = {
        display_name: document.getElementById('editName').value,
        bio: document.getElementById('editBio').value
    };

    try {
        const res = await fetch(`${API_BASE}/api/user/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify(updates)
        });

        if (!res.ok) throw new Error("Update failed");

        closeEditModal();
        loadProfile();

    } catch (err) {
        alert("Failed to update profile");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

});

// --- 9. AVATAR UPLOAD ---
document.getElementById('avatarInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const avatarEl = document.getElementById('profileAvatar');
    avatarEl.style.opacity = '0.5';

    try {
        const base64 = await compressImage(file);

        const res = await fetch(`${API_BASE}/api/user/avatar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ imageBase64: base64 })
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        avatarEl.src = data.photo_url;

    } catch (err) {
        alert("Avatar upload failed");
        console.error(err);
    } finally {
        avatarEl.style.opacity = '1';
    }
});

function handleLogout() {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

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
