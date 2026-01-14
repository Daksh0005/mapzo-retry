const DEFAULT_TAB = "terms";

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

function init() {
    const btns = document.querySelectorAll(".switchBtn");
    btns.forEach(btn => {
        btn.addEventListener("click", () => {
            location.hash = btn.dataset.tab; // deep link [web:43]
        });
    });

    window.addEventListener("hashchange", () => setActive(getTabFromHash()));
    setActive(getTabFromHash());
}
function goBackHome() {
   window.location.href = "index.html"; 
}

document.addEventListener("DOMContentLoaded", init);
