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
        const uploadOverlay = document.querySelector('.uploadOverlay');
        
        if (menu.classList.contains('menuShow')) {
            toggleMenu();
        }
        
        if (uploadOverlay && uploadOverlay.classList.contains('show')) {
            closeUploadForm();
        }
    }
});

const sampleEvents = [
    {
        id: 1,
        title: "DJ Night at Spring Fest",
        date: "Dec 31, 2025",
        location: "IIT Kharagpur",
        category: "Music",
        tags: ["#music", "#party"],
        image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400",
        lat: 22.3200,
        lng: 87.3150
    },
    {
        id: 2,
        title: "Startup Pitch Competition",
        date: "Jan 5, 2026",
        location: "Tech Students' Gymkhana",
        category: "Tech",
        tags: ["#startup", "#business"],
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
        lat: 22.3149,
        lng: 87.3105
    },
    {
        id: 3,
        title: "Annual Sports Meet",
        date: "Jan 10, 2026",
        location: "Tata Sports Complex",
        category: "Sports",
        tags: ["#sports", "#athletics"],
        image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400",
        lat: 22.3180,
        lng: 87.3120
    },
    {
        id: 4,
        title: "Classical Dance Performance",
        date: "Jan 15, 2026",
        location: "Netaji Auditorium",
        category: "Cultural",
        tags: ["#cultural", "#dance"],
        image: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400",
        lat: 22.3160,
        lng: 87.3090
    },
    {
        id: 5,
        title: "Tech Talk: AI in 2026",
        date: "Jan 20, 2026",
        location: "Lecture Hall Complex",
        category: "Tech",
        tags: ["#ai", "#tech"],
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400",
        lat: 22.3140,
        lng: 87.3100
    }
];

function renderEventCards(events) {
    const eventsScroll = document.querySelector('.eventsScroll');
    
    if (!eventsScroll) {
        console.error('eventsScroll element not found');
        return;
    }
    
    eventsScroll.innerHTML = '';
    
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'eventCard';
        card.innerHTML = `
            <div class="eventImage">
                <img src="${event.image}" alt="${event.title}">
                <span class="eventCategory">${event.category}</span>
            </div>
            <div class="eventInfo">
                <h3 class="eventTitle">${event.title}</h3>
                <p class="eventDate">
                    <i class="fa-regular fa-calendar"></i>
                    ${event.date}
                </p>
                <p class="eventLocation">
                    <i class="fa-solid fa-location-dot"></i>
                    ${event.location}
                </p>
                <div class="eventTags">
                    ${event.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            console.log('Event clicked:', event.title);
        });
        
        eventsScroll.appendChild(card);
    });
}

function openUploadForm() {
    const uploadOverlay = document.querySelector('.uploadOverlay');
    if (uploadOverlay) {
        document.body.style.overflow = 'hidden';
        uploadOverlay.classList.add('show');
    }
}

function closeUploadForm() {
    const uploadOverlay = document.querySelector('.uploadOverlay');
    if (uploadOverlay) {
        document.body.style.overflow = '';
        uploadOverlay.classList.remove('show');
    }
}

function handleEventSubmit() {
    const eventName = document.getElementById('eventName').value;
    const eventCategory = document.getElementById('eventCategory').value;
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventLocation = document.getElementById('eventLocation').value;
    const eventDescription = document.getElementById('eventDescription').value;
    const eventHashtags = document.getElementById('eventHashtags').value;
    
    if (!eventName || !eventCategory || !eventDate || !eventLocation) {
        alert('Please fill in all required fields!');
        return;
    }
    
    const newEvent = {
        id: sampleEvents.length + 1,
        title: eventName,
        date: new Date(eventDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        }),
        location: eventLocation,
        category: eventCategory,
        tags: eventHashtags.split(' ').filter(tag => tag.startsWith('#')),
        image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400",
        lat: 22.3200,
        lng: 87.3150
    };
    
    sampleEvents.unshift(newEvent);
    renderEventCards(sampleEvents);
    
    document.getElementById('eventUploadForm').reset();
    
    const imagePreview = document.getElementById('imagePreview');
    const imagePlaceholder = document.querySelector('.imagePlaceholder');
    if (imagePreview) imagePreview.style.display = 'none';
    if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
    
    closeUploadForm();
    
    alert('Event posted successfully! 🎉');
}

document.addEventListener('DOMContentLoaded', () => {
    renderEventCards(sampleEvents);
    
    const eventImageInput = document.getElementById('eventImage');
    if (eventImageInput) {
        eventImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('imagePreview');
                    const placeholder = document.querySelector('.imagePlaceholder');
                    if (preview && placeholder) {
                        preview.src = event.target.result;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
});
let currentFilters = {
    date: null,
    distance: 50,
    category: 'all'
};

let currentDate = new Date();
let selectedDate = null;

function openFilterModal() {
    const filterOverlay = document.querySelector('.filterOverlay');
    if (filterOverlay) {
        document.body.style.overflow = 'hidden';
        filterOverlay.classList.add('show');
        renderCalendar();
    }
}

function closeFilterModal() {
    const filterOverlay = document.querySelector('.filterOverlay');
    if (filterOverlay) {
        document.body.style.overflow = '';
        filterOverlay.classList.remove('show');
    }
}

function resetFilters() {
    currentFilters = {
        date: null,
        distance: 50,
        category: 'all'
    };
    selectedDate = null;
    
    document.querySelectorAll('.quickFilterBtn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.categoryCard').forEach(card => {
        card.classList.remove('active');
        if (card.dataset.category === 'all') card.classList.add('active');
    });
    
    document.getElementById('distanceInput').value = 50;
    document.getElementById('distanceRange').value = 50;
    
    renderCalendar();
    renderEventCards(sampleEvents);
}

function applyFilters() {
    let filteredEvents = [...sampleEvents];
    
    if (currentFilters.category !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.category === currentFilters.category);
    }
    
    renderEventCards(filteredEvents);
    closeFilterModal();
}

function renderCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const currentMonth = document.getElementById('currentMonth');
    
    if (!calendarDays || !currentMonth) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    currentMonth.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    calendarDays.innerHTML = '';
    
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendarDay disabled';
        calendarDays.appendChild(emptyDay);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('button');
        dayElement.className = 'calendarDay';
        dayElement.textContent = day;
        
        const dateToCheck = new Date(year, month, day);
        
        if (dateToCheck.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        if (selectedDate && dateToCheck.toDateString() === selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        }
        
        if (dateToCheck < today.setHours(0, 0, 0, 0)) {
            dayElement.classList.add('disabled');
        } else {
            dayElement.addEventListener('click', () => {
                selectedDate = new Date(year, month, day);
                currentFilters.date = selectedDate;
                renderCalendar();
            });
        }
        
        calendarDays.appendChild(dayElement);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderEventCards(sampleEvents);
    
    document.querySelectorAll('.filterTab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filterTab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.filterTabContent').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(this.dataset.tab + 'Tab').classList.add('active');
        });
    });
    
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    
    const distanceInput = document.getElementById('distanceInput');
    const distanceRange = document.getElementById('distanceRange');
    
    if (distanceInput && distanceRange) {
        distanceInput.addEventListener('input', function() {
            const value = Math.min(5000, Math.max(0, this.value));
            distanceRange.value = Math.min(500, value);
            currentFilters.distance = value;
        });
        
        distanceRange.addEventListener('input', function() {
            distanceInput.value = this.value;
            currentFilters.distance = this.value;
        });
    }
    
    document.querySelectorAll('[data-distance]').forEach(btn => {
        btn.addEventListener('click', function() {
            const distance = this.dataset.distance;
            if (distanceInput && distanceRange) {
                distanceInput.value = distance;
                distanceRange.value = Math.min(500, distance);
                currentFilters.distance = distance;
            }
        });
    });
    
    document.querySelectorAll('[data-category]').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('[data-category]').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentFilters.category = this.dataset.category;
        });
    });
    
    const categorySearch = document.getElementById('categorySearch');
    if (categorySearch) {
        categorySearch.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            document.querySelectorAll('.categoryCard').forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }
    
    const eventImageInput = document.getElementById('eventImage');
    if (eventImageInput) {
        eventImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('imagePreview');
                    const placeholder = document.querySelector('.imagePlaceholder');
                    if (preview && placeholder) {
                        preview.src = event.target.result;
                        preview.style.display = 'block';
                        placeholder.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

