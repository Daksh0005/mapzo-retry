const qs = new URLSearchParams(window.location.search);
const eventId = qs.get("id");
let currentUser = null;

const API_URL = window.API_URL || "https://backend-jwqn.onrender.com";

const els = {
  loading: document.getElementById("loadingState"),
  content: document.getElementById("eventContent"),
  img: document.getElementById("displayImage"),
  cat: document.getElementById("displayCategory"),
  title: document.getElementById("displayTitle"),
  date: document.getElementById("displayDate"),
  time: document.getElementById("displayTime"),
  loc: document.getElementById("displayLocation"),
  desc: document.getElementById("displayDesc"),
  joinBtn: document.getElementById("joinEventBtn"),
  joinedMsg: document.getElementById("joinedStatus"),
  avgRating: document.getElementById("avgRatingVal"),
  reviewList: document.getElementById("commentsList"),
  commentText: document.getElementById("commentText"),
  authBox: document.getElementById("addCommentBox"),
  loginPrompt: document.getElementById("loginToComment")
};

// --- AUTH & INIT ---
// Wait for window.auth to be ready if it's set in utils.js
function initPage() {
  console.log("🚀 Starting Page Init...");

  // START DATA LOAD IMMEDIATELY (Don't wait for auth)
  if (!eventId) {
    els.loading.innerHTML = '<p>Missing event ID.</p>';
  } else {
    loadEventDetails();
    loadComments();
  }

  // CHECK AUTH SEPARATELY
  const checkAuthInterval = setInterval(() => {
    if (window.auth) {
      clearInterval(checkAuthInterval);
      setupAuthListener();
    }
  }, 100);

  // Timeout to stop checking after 5s
  setTimeout(() => clearInterval(checkAuthInterval), 5000);
}

function setupAuthListener() {
  console.log("👤 Setting up Auth Listener");
  window.auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      if (els.authBox) els.authBox.style.display = 'block';
      if (els.loginPrompt) els.loginPrompt.style.display = 'none';
      checkJoinStatus();
    } else {
      currentUser = null;
      if (els.authBox) els.authBox.style.display = 'none';
      if (els.loginPrompt) els.loginPrompt.style.display = 'block';
      if (els.joinBtn) els.joinBtn.style.display = 'none';
    }
  });
}

initPage();

// Data loading is now handled in initPage()

async function loadEventDetails() {
  console.log("Loading details for ID:", eventId); // Debug
  try {
    const res = await fetch(`${API_URL}/api/events/${eventId}`);
    console.log("Response status:", res.status); // Debug
    const data = await res.json();
    console.log("Event Data:", data); // Debug

    if (data.success) {
      renderEvent(data.event);
    } else {
      console.error("Event fetch failed:", data.error); // Debug
      els.loading.innerHTML = '<p>Event not found.</p>';
    }
  } catch (err) {
    console.error("Fetch error:", err);
    els.loading.innerHTML = '<p>Error loading data.</p>';
  }
}

function renderEvent(e) {
  const fDate = new Date(e.event_date).toLocaleDateString();
  const fTime = new Date(e.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  els.img.src = e.image_url || 'https://via.placeholder.com/600x350?text=No+Image';
  els.cat.textContent = e.category || "General";
  els.title.textContent = e.title;
  els.date.textContent = fDate;
  els.time.textContent = fTime;
  els.loc.textContent = e.venue_name || e.address;
  els.desc.textContent = e.description;

  // Actions
  injectActionButtons({ ...e, date: fDate, time: fTime, location: e.venue_name || e.address });

  els.loading.style.display = 'none';
  els.content.style.display = 'block';
}

async function checkJoinStatus() {
  if (!currentUser || !eventId) return;
  const token = await currentUser.getIdToken();
  try {
    const res = await fetch(`${API_URL}/api/user/tickets`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      const joined = data.tickets.some(t => t.id === eventId);
      if (joined) {
        els.joinBtn.style.display = 'none';
        els.joinedMsg.style.display = 'block';
      } else {
        els.joinBtn.style.display = 'block';
        els.joinBtn.onclick = joinEvent;
      }
    }
  } catch (e) { console.error(e); }
}

async function joinEvent() {
  if (!currentUser) return showToast("Log in to join!", "warning");
  const token = await currentUser.getIdToken();
  els.joinBtn.disabled = true;
  els.joinBtn.textContent = "Joining...";

  try {
    const res = await fetch(`${API_URL}/api/events/${eventId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (data.success) {
      showToast("Joined successfully! 🎟️", "success");
      els.joinBtn.style.display = 'none';
      els.joinedMsg.style.display = 'block';

      // --- NOTIFICATION LOGIC ---
      if ('Notification' in window) {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted' && window.currentEventData) {
            const subs = JSON.parse(localStorage.getItem('mapzo_notifications') || '[]');
            const exists = subs.find(s => s.id === eventId);

            if (!exists) {
              subs.push({
                id: eventId,
                title: window.currentEventData.title,
                date: window.currentEventData.event_date, // Ensuring we have the date
                notified: { day: false, hour: false, start: false }
              });
              localStorage.setItem('mapzo_notifications', JSON.stringify(subs));
              showToast("🔔 Reminders set for Day-of & 1hr before!", "success");
            }
          }
        });
      }
    } else {
      showToast(data.error || "Failed to join", "error");
      els.joinBtn.disabled = false;
      els.joinBtn.innerHTML = '<i class="fa-solid fa-ticket"></i> Join Event';
    }
  } catch (err) {
    showToast("Server error", "error");
    els.joinBtn.disabled = false;
  }
}

function loadComments() {
  fetch(`${API_URL}/api/events/${eventId}/reviews`)
    .then(res => res.json())
    .then(data => {
      els.reviewList.innerHTML = "";
      if (!data.success || data.reviews.length === 0) {
        els.reviewList.innerHTML = '<p style="text-align:center; color:#666;">No reviews yet.</p>';
        els.avgRating.textContent = "--";
        return;
      }

      // CLIENT-SIDE DEDUP: Keep only latest review per user
      const uniqueReviews = {};
      data.reviews.forEach(r => {
        // Since list usually comes sorted by time (or we can sort it), 
        // we'll overwrite to keep the latest if we process chrono.
        // Backend returns created_at ASC usually, but let's be safe.
        // Better: Check if user_id exists, prefer the one with later timestamp?
        if (!uniqueReviews[r.user_id]) {
          uniqueReviews[r.user_id] = r;
        } else {
          // If duplicate found, keep the newer one
          if (new Date(r.created_at) > new Date(uniqueReviews[r.user_id].created_at)) {
            uniqueReviews[r.user_id] = r;
          }
        }
      });
      const finalReviews = Object.values(uniqueReviews).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      let total = 0;
      finalReviews.forEach(c => {
        total += c.rating;
        const div = document.createElement('div');
        div.className = 'commentItem';
        let stars = "";
        for (let i = 0; i < 5; i++) stars += i < c.rating ? '★' : '☆';

        div.innerHTML = `
          <div class="commentUser">
            <span>${c.user_name || 'User'}</span>
            <span class="commentStars">${stars}</span>
          </div>
          <div class="commentText">${c.comment}</div>
          <div class="commentDate">${new Date(c.created_at).toLocaleDateString()}</div>
        `;
        els.reviewList.appendChild(div);
      });
      els.avgRating.textContent = (total / finalReviews.length).toFixed(1);
    });
}

async function submitComment() {
  if (!currentUser) return showToast("Log in first", "warning");
  const text = els.commentText.value.trim();
  const ratingInput = document.querySelector('input[name="rating"]:checked');
  const rating = ratingInput ? parseInt(ratingInput.value) : 0;
  const submitBtn = document.querySelector('.submitCommentBtn');

  if (rating === 0) return showToast("Select rating", "warning");
  if (!text) return showToast("Write a comment", "warning");

  // Prevent Double Submission
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Posting...";
  }

  const token = await currentUser.getIdToken();
  try {
    const res = await fetch(`${API_URL}/api/events/${eventId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ rating, comment: text })
    });
    const data = await res.json();
    if (data.success) {
      if (data.action === 'updated') {
        showToast("Review updated! 📝", "success");
      } else {
        showToast("Review posted! ✨", "success");
      }
      els.commentText.value = "";
      document.querySelectorAll('input[name="rating"]').forEach(r => r.checked = false);
      loadComments();
    } else {
      showToast(data.error, "error");
    }
  } catch (e) {
    showToast("Error posting", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post Review";
    }
  }
}

function injectActionButtons(data) {
  const infoCard = document.querySelector('.infoCard');
  const mapUrl = (data.latitude && data.longitude)
    ? `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`;

  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = "display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;";
  actionsDiv.innerHTML = `
    <a href="${mapUrl}" target="_blank" style="flex:1; min-width:120px; background:#1db954; color:black; padding:10px; border-radius:8px; text-align:center; text-decoration:none; font-weight:700;">
      <i class="fa-solid fa-location-arrow"></i> Directions
    </a>
    <button onclick="addToCalendar()" style="flex:1; min-width:120px; background:#4285F4; color:white; border:none; padding:10px; border-radius:8px; font-weight:600; cursor:pointer;">
      <i class="fa-regular fa-calendar-plus"></i> Add to Calender
    </button>
    <button onclick="shareEvent('${data.title.replace(/'/g, "\\'")}')" style="flex:1; min-width:120px; background:#333; color:white; border:none; padding:10px; border-radius:8px; font-weight:600; cursor:pointer;">
      <i class="fa-solid fa-share-nodes"></i> Share
    </button>
  `;
  infoCard.appendChild(actionsDiv);

  // Store data for calendar function
  window.currentEventData = data;
}

window.addToCalendar = () => {
  const e = window.currentEventData;
  if (!e) return;

  const startTime = new Date(e.event_date);
  const endTime = new Date(startTime.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hours

  const formatTime = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

  const url = new URL("https://www.google.com/calendar/render");
  url.searchParams.append("action", "TEMPLATE");
  url.searchParams.append("text", e.title);
  url.searchParams.append("dates", `${formatTime(startTime)}/${formatTime(endTime)}`);
  url.searchParams.append("details", e.description || "Join this event on Mapzo!");
  url.searchParams.append("location", e.venue_name || e.address || "Unknown Location");
  url.searchParams.append("sf", "true");
  url.searchParams.append("output", "xml");

  window.open(url.toString(), "_blank");
};

window.shareEvent = (title) => {
  if (navigator.share) {
    navigator.share({ title, text: `Check out ${title} on Mapzo!`, url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href);
    showToast("Link copied! 📋", "info");
  }
};

