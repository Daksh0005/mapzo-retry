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

function getAllEvents() {
  // store your events array in localStorage under "mapzo_events"
  return JSON.parse(localStorage.getItem("mapzo_events") || "[]");
}

function getEventById(id) {
  return getAllEvents().find(e => String(e.id) === String(id));
}

function getCommentsKey(id) {
  return `mapzo_comments_${id}`;
}

function getComments(id) {
  return JSON.parse(localStorage.getItem(getCommentsKey(id)) || "[]");
}

function saveComments(id, comments) {
  localStorage.setItem(getCommentsKey(id), JSON.stringify(comments));
}

function renderComments(id) {
  const comments = getComments(id);
  els.list.innerHTML = "";

  if (!comments.length) {
    els.list.innerHTML = `<p style="color: rgba(255,255,255,0.55); margin:0;">No comments yet.</p>`;
    return;
  }

  comments.slice().reverse().forEach(c => {
    const div = document.createElement("div");
    div.className = "commentItem";
    div.innerHTML = `
      <div class="commentMeta">
        <span>${c.name}</span>
        <span>${new Date(c.createdAt).toLocaleString()}</span>
      </div>
      <p class="commentText"></p>
    `;
    div.querySelector(".commentText").textContent = c.text;
    els.list.appendChild(div);
  });
}

function renderEvent(e) {
    if (!e) {
        els.title.textContent = "Event not found";
        return;
    }

    els.img.src = e.image || "fallback.jpg";
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

if (!eventId) {
  els.title.textContent = "Missing event id";
} else {
  renderEvent(getEventById(eventId));
  renderComments(eventId);
}

els.form?.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;

  const comments = getComments(eventId);
  comments.push({
    name: "Anonymous",
    text,
    createdAt: Date.now(),
  });

  saveComments(eventId, comments);
  els.input.value = "";
  renderComments(eventId);
});
