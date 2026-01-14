const DEFAULT_TAB = "notifications";

function setActive(tab) {
    document.querySelectorAll(".switchBtn").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === tab);
        b.setAttribute("aria-selected", b.dataset.tab === tab ? "true" : "false");
    });

    document.querySelectorAll(".switchPanel").forEach(p => {
        p.classList.toggle("active", p.dataset.panel === tab);
    });
}

function getTabFromHash() {
    const raw = (location.hash || "").replace("#", "").trim();
    return raw || DEFAULT_TAB;
}

function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem("mapzo_settings") || "{}");
        document.getElementById("notifReminders").checked = !!saved.notifReminders;
        document.getElementById("notifNearby").checked = !!saved.notifNearby;
    } catch { }
}

function saveSettings() {
    const data = {
        notifReminders: document.getElementById("notifReminders").checked,
        notifNearby: document.getElementById("notifNearby").checked,
    };
    localStorage.setItem("mapzo_settings", JSON.stringify(data));
}

function init() {
    
    document.querySelectorAll(".switchBtn").forEach(btn => {
        btn.addEventListener("click", () => { location.hash = btn.dataset.tab; });
    });
    window.addEventListener("hashchange", () => setActive(getTabFromHash()));
    setActive(getTabFromHash());

   
    loadSettings();
    document.getElementById("notifReminders")?.addEventListener("change", saveSettings);
    document.getElementById("notifNearby")?.addEventListener("change", saveSettings);

    
    document.getElementById("verifyForm")?.addEventListener("submit", (e) => {
        e.preventDefault();
        alert("Verification request submitted (demo).");
    });

    
    document.getElementById("openLocationModalBtn")?.addEventListener("click", () => {
        
        window.location.href = "index.html#openLocation";
    });
}

function goBackHome() {
    window.location.href = "index.html";
}


document.addEventListener("DOMContentLoaded", init);
