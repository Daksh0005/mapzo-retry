function toggleMenu() {
    const menu = document.querySelector('.menu');
    const overlay = document.querySelector('.menuOverlay');
    const body = document.body;
    
    menu.classList.toggle('menuShow');
    overlay.classList.toggle('show');
    
    if (menu.classList.contains('menuShow')) {
        body.style.overflow = 'hidden';
    } else {
        body.style.overflow = '';
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const menu = document.querySelector('.menu');
        if (menu.classList.contains('menuShow')) {
            toggleMenu();
        }
    }
});
