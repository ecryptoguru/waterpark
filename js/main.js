// Main JavaScript for Blue Splash

document.addEventListener('DOMContentLoaded', () => {
    initHeaderScroll();
    initHeroBubbles();
    initScrollAnimations();
    initBtnEffects();
    initMobileMenu();
    initBookingModal();
});

// Explicitly export to global for HTML onclick handlers
window.openBooking = openBooking;
window.closeBookingModal = closeBookingModal;
window.nextStep = nextStep;
window.updateQty = updateQty;
window.submitBooking = submitBooking;

// Header scroll effect
function initHeaderScroll() {
    const header = document.getElementById('main-header');
    if (!header) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// Hero background bubbles
function initHeroBubbles() {
    const container = document.getElementById('bubbles-container');
    if (!container) return; // Silent return if not on home page
    
    const bubbleCount = 15;
    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        const size = Math.random() * 40 + 10 + 'px';
        bubble.style.width = size;
        bubble.style.height = size;
        bubble.style.left = Math.random() * 100 + '%';
        bubble.style.top = Math.random() * 100 + '%';
        bubble.style.animationDuration = Math.random() * 4 + 4 + 's';
        bubble.style.animationDelay = Math.random() * 5 + 's';
        
        container.appendChild(bubble);
    }
}

// Scroll-triggered animations using Intersection Observer
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fadeInUp');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate').forEach(el => observer.observe(el));
}

// Button ripple effects
function initBtnEffects() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Booking Modal Logic
let currentStep = 1;
let currentMonth = new Date();
let quantities = {
    adult: 0,
    child: 0,
    senior: 0,
    student: 0
};
let prices = {
    adult: 899,
    child: 599.02,
    senior: 666.74,
    student: 399.15,
    family: 2499.00
};
let selectedDate = null;

function openBooking() {
    const modal = document.getElementById('booking-modal');
    if (!modal) {
        console.error('Booking modal not found!');
        return;
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; 
    showStep(1);
    updateCalendarDisplay();
}

function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function initBookingModal() {
    const modal = document.getElementById('booking-modal');
    const closeModal = document.querySelector('.close-modal');
    
    if (closeModal) {
        closeModal.onclick = closeBookingModal;
    }
    
    window.onclick = (e) => {
        if (e.target == modal) {
            closeBookingModal();
        }
    };

    // Add listners for calendar navigation
    document.addEventListener('click', (e) => {
        if (e.target.closest('#prev-month')) {
            currentMonth.setMonth(currentMonth.getMonth() - 1);
            updateCalendarDisplay();
        }
        if (e.target.closest('#next-month')) {
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            updateCalendarDisplay();
        }
    });

    // Handle Wizard Nav Clicks (if enabled)
    document.querySelectorAll('.wizard-nav-item').forEach((item, index) => {
        item.onclick = () => {
            const step = index + 1;
            if (step < currentStep) {
                showStep(step);
            }
        };
    });
}

function showStep(stepNum) {
    currentStep = stepNum;
    
    // Update Wizard Nav
    document.querySelectorAll('.wizard-nav-item').forEach((item, index) => {
        if (index + 1 <= stepNum) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update Steps display
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
    });
    
    const targetStep = document.getElementById(`step-${stepNum}`);
    if (targetStep) {
        targetStep.classList.add('active');
        targetStep.style.display = 'block';
    }

    // Modal Footer Visibility
    const footer = document.getElementById('booking-total-container');
    if (footer) {
        footer.style.display = (stepNum >= 2 && stepNum < 5) ? 'flex' : 'none';
    }

    // Modal Title Update
    const title = document.getElementById('modal-title');
    if (title) {
        const titles = {
            1: 'SELECT VISIT DATE',
            2: 'GRAB YOUR TICKETS',
            3: 'ENHANCE YOUR ADVENTURE',
            4: 'REVIEW YOUR BOOKING',
            5: 'PAYMENT'
        };
        title.textContent = titles[stepNum] || 'BOOK YOUR ADVENTURE';
    }

    // Populate summary in step 4
    if (stepNum === 4) {
        updateBookingSummary();
    }

    // Update final amount in step 5
    if (stepNum === 5) {
        updateFinalPayment();
    }
}

function nextStep(num) {
    if (num === 2 && !selectedDate) {
        alert('Please select a visit date first! Click on a date in the calendar.');
        return;
    }
    const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);
    if (num === 3 && totalQty === 0) {
        alert('Please add at least one ticket to continue.');
        return;
    }
    showStep(num);
}

function updateQty(type, change) {
    quantities[type] = Math.max(0, quantities[type] + change);
    const qtyEl = document.getElementById(`qty-${type}`);
    if (qtyEl) qtyEl.textContent = quantities[type];
    
    // Handle "ADD" button toggle appearance if needed
    const btnAdd = document.querySelector(`[data-ticket="${type}"]`);
    if (btnAdd) {
        if (quantities[type] > 0) {
            btnAdd.classList.add('selected');
            btnAdd.textContent = 'ADDED';
        } else {
            btnAdd.classList.remove('selected');
            btnAdd.textContent = 'ADD';
        }
    }
    
    calculateTotal();
}

function calculateTotal() {
    let total = 0;
    for (let type in quantities) {
        total += quantities[type] * prices[type];
    }
    
    const totalEl = document.getElementById('booking-total');
    if (totalEl) {
        totalEl.textContent = `₹${total.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
    
    // Update summary counts
    const visitorCount = Object.values(quantities).reduce((a, b) => a + b, 0);
    const summaryVisitors = document.getElementById('summary-visitors');
    if (summaryVisitors) summaryVisitors.textContent = visitorCount;
}

function updateBookingSummary() {
    const summaryDate = document.getElementById('summary-date');
    if (summaryDate && selectedDate) {
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        summaryDate.textContent = selectedDate.toLocaleDateString('en-IN', options);
    }
    
    const total = Object.keys(quantities).reduce((acc, key) => acc + (quantities[key] * prices[key]), 0);
    const summaryTotal = document.getElementById('summary-total');
    if (summaryTotal) {
        summaryTotal.textContent = `₹${total.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
}

/**
 * Updates the final payment screen with the correct amount
 */
function updateFinalPayment() {
    const total = Object.keys(quantities).reduce((acc, key) => acc + (quantities[key] * prices[key]), 0);
    const finalAmountEl = document.getElementById('final-total');
    if (finalAmountEl) {
        finalAmountEl.textContent = `₹${total.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
}

function submitBooking(event) {
    if (event) event.preventDefault();
    nextStep(5);
}

// Advanced Calendar
function updateCalendarDisplay() {
    console.log("Updating calendar display...");
    const grid = document.getElementById('calendar-grid');
    const header = document.getElementById('calendar-month-year');
    if (!grid || !header) {
        console.error("Calendar elements not found!", { grid, header });
        return;
    }

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    header.textContent = `${monthNames[month]} ${year}`;

    grid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);

    console.log(`Rendering ${monthNames[month]} ${year}, firstDay: ${firstDay}, totalDays: ${totalDays}`);

    // Padding for first day
    for(let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        grid.appendChild(empty);
    }

    for(let d = 1; d <= totalDays; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        const dateObj = new Date(year, month, d);
        
        // Disable past dates
        if (dateObj < today) {
            dayEl.classList.add('disabled');
        }

        if (selectedDate && dateObj.toDateString() === selectedDate.toDateString()) {
            dayEl.classList.add('selected');
        }

        dayEl.textContent = d;
        dayEl.style.display = 'flex'; 
        // Inline overrides removed in favor of CSS
        
        dayEl.onclick = () => {
            if (!dayEl.classList.contains('disabled')) {
                selectedDate = dateObj;
                updateCalendarDisplay();
            }
        };
        grid.appendChild(dayEl);
    }
    console.log("Calendar render complete. Grid child count:", grid.children.length);
}

// Mobile Menu
function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.onclick = () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('active');
        };

        // Close menu when clicking links
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.onclick = () => {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('active');
            };
        });
    }
}
