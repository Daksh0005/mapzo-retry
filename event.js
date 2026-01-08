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

// Load event from Firebase
if (!eventId) {
  els.title.textContent = "Missing event id";
} else {
  db.collection('events').doc(eventId).get().then((doc) => {
    if (!doc.exists) {
      els.title.textContent = "Event not found";
      return;
    }

    const event = doc.data();
    renderEvent(event);
    loadComments(eventId);
  }).catch((error) => {
    console.error("Error loading event:", error);
    els.title.textContent = "Error loading event";
  });
}

function renderEvent(e) {
  els.img.src = e.image || "https://via.placeholder.com/400x200?text=Event";
  els.cat.textContent = e.category || "Other";
  els.title.textContent = e.title || "Untitled event";
  els.date.innerHTML = `<i class="fa-regular fa-calendar"></i> ${e.date || ""}`;
  els.time.innerHTML = `<i class="fa-regular fa-clock"></i> ${e.time || ""}`;
  els.loc.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${e.location || ""}`;
  els.desc.textContent = e.description || "";

  els.tags.innerHTML = "";
  (e.tags || []).forEach(t => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = t.startsWith("#") ? t : `#${t}`;
    els.tags.appendChild(span);
  });
}

// Load comments from Firebase
function loadComments(eventId) {
  db.collection('events').doc(eventId).collection('comments')
    .orderBy('createdAt', 'desc')
    .onSnapshot((snapshot) => {
      els.list.innerHTML = "";

      if (snapshot.empty) {
        els.list.innerHTML = `<p style="color: rgba(255,255,255,0.55); margin:0;">No comments yet.</p>`;
        return;
      }

      snapshot.forEach((doc) => {
        const c = doc.data();
        const div = document.createElement("div");
        div.className = "commentItem";
        div.innerHTML = `
                    <div class="commentMeta">
                        <span>${c.name || 'Anonymous'}</span>
                        <span>${new Date(c.createdAt?.toDate()).toLocaleString()}</span>
                    </div>
                    <p class="commentText">${c.text}</p>
                `;
        els.list.appendChild(div);
      });
    });
}

// Post comment to Firebase
els.form?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;

  try {
    await db.collection('events').doc(eventId).collection('comments').add({
      name: "Anonymous",
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    els.input.value = "";
  } catch (error) {
    console.error("Error posting comment:", error);
    alert("Failed to post comment. Please try again.");
  }
});
