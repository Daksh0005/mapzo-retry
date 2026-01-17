const qs = new URLSearchParams(window.location.search);
const eventId = qs.get("id");

const els = {
  img: document.getElementById("eventImage"),
  cat: document.getElementById("eventCategory"),
  title: document.getElementById("eventTitle"),
  date: document.getElementById("eventDate"),
  time: document.getElementById("eventTime"),
  loc: document.getElementById("eventLocation"),
  desc: document.getElementById("eventDescription"),
  tags: document.getElementById("eventTags"),
  form: document.getElementById("commentForm"),
  input: document.getElementById("commentText"),
  list: document.getElementById("commentsList"),
};

// Load event from API
// Load event from API
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:3000"
  : "https://backend-jwqn.onrender.com";

if (!eventId) {
  els.title.textContent = "Missing event id";
} else {
  fetch(`${API_URL}/api/events/${eventId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        els.title.textContent = "Event not found";
        return;
      }
      renderEvent(data.event);
      loadComments(eventId);
    })
    .catch(err => {
      console.error("Error loading event:", err);
      els.title.textContent = "Error loading event";
    });
}

function renderEvent(e) {
  els.img.src = e.image_url || "https://via.placeholder.com/400x200?text=Event";
  els.cat.textContent = e.category || "Other";
  els.title.textContent = e.title || "Untitled event";
  els.date.innerHTML = `<i class="fa-regular fa-calendar"></i> ${new Date(e.event_date).toLocaleDateString() || ""}`;
  els.time.innerHTML = `<i class="fa-regular fa-clock"></i> ${new Date(e.event_date).toLocaleTimeString() || ""}`;
  els.loc.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${e.venue_name || e.address || ""}`;
  els.desc.textContent = e.description || "";

  els.tags.innerHTML = "";
  // Tags not yet in DB schema, so skipping or using description heuristic
}

// Load comments from API
function loadComments(eventId) {
  fetch(`${API_URL}/api/events/${eventId}/reviews`)
    .then(res => res.json())
    .then(data => {
      els.list.innerHTML = "";
      if (!data.success || data.reviews.length === 0) {
        els.list.innerHTML = `<p style="color: rgba(255,255,255,0.55); margin:0;">No comments yet.</p>`;
        return;
      }

      data.reviews.forEach((c) => {
        const div = document.createElement("div");
        div.className = "commentItem";
        div.innerHTML = `
                    <div class="commentMeta">
                        <span>${c.user_name || 'Anonymous'}</span>
                        <span>${new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p class="commentText">${c.comment}</p>
                `;
        els.list.appendChild(div);
      });
    })
    .catch(console.error);
}

// Post comment to API
els.form?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;

  if (!auth.currentUser) return alert("Please log in");
  const token = await auth.currentUser.getIdToken();

  try {
    const res = await fetch(`${API_URL}/api/events/${eventId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ rating: 5, comment: text }) // Hardcoding rating for now as UI doesn't have stars
    });

    const data = await res.json();
    if (data.success) {
      els.input.value = "";
      loadComments(eventId);
    } else {
      alert(data.error);
    }
  } catch (error) {
    console.error("Error posting comment:", error);
  }
});
