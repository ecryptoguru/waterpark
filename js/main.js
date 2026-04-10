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
// Ticket types: standard + offer
// Default quantities and prices (will be updated from shared config)
let quantities = { waterpark: 0, amusement: 0, combo: 0, vip: 0, student: 0, family: 0, group: 0 };
let prices = {
    waterpark: 599, amusement: 499, combo: 899, vip: 1199,
    student: 399, family: 1999, group: 499
};
let selectedDate = null;

/**
 * Centrally loads prices from the shared config
 */
async function loadPrices() {
    try {
        const response = await fetch('/shared/prices.json');
        if (!response.ok) throw new Error("Price config not found");
        const data = await response.json();
        prices = data.prices;
        console.log("Prices loaded from shared config:", prices);
    } catch (err) {
        console.warn("Using fallback prices:", err);
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', loadPrices);

function openBooking() {
    const modal = document.getElementById('booking-modal');
    if (!modal) {
        console.error('Booking modal not found!');
        return;
    }
    
    // Check if Razorpay is loaded
    if (typeof Razorpay === 'undefined') {
        updateStatus("Payment system is currently unavailable. Please check your connection or try again later.", "error");
    } else {
        updateStatus(null); // Clear any previous errors
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; 
    showStep(1);
    updateCalendarDisplay();
}

/**
 * Updates the modal status bar with errors or info.
 * @param {string|null} message - The message to show. Null to hide.
 * @param {'error'|'info'|'success'} type - The type of message.
 */
function updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('booking-status');
    if (!statusEl) return;

    if (!message) {
        statusEl.classList.add('hidden');
        return;
    }

    statusEl.innerHTML = message;
    statusEl.classList.remove('hidden', 'bg-red-100', 'text-red-800', 'bg-blue-100', 'text-blue-800', 'bg-green-100', 'text-green-800');

    if (type === 'error') {
        statusEl.classList.add('bg-red-100', 'text-red-800');
    } else if (type === 'success') {
        statusEl.classList.add('bg-green-100', 'text-green-800');
    } else {
        statusEl.classList.add('bg-blue-100', 'text-blue-800');
    }
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
        footer.style.display = (stepNum === 2) ? 'flex' : 'none';
    }

    // Modal Title Update
    const title = document.getElementById('modal-title');
    if (title) {
        const titles = {
            1: 'SELECT VISIT DATE',
            2: 'GRAB YOUR TICKETS',
            3: 'REVIEW YOUR BOOKING',
            4: 'PAYMENT CONFIRMED'
        };
        title.textContent = titles[stepNum] || 'BOOK YOUR ADVENTURE';
    }

    // Populate summary in step 3
    if (stepNum === 3) {
        updateBookingSummary();
    }

    // Update final amount in step 4
    if (stepNum === 4) {
        updateFinalPayment();
    }
}

function nextStep(num) {
    if (num === 2 && !selectedDate) {
        updateStatus("Please select a visit date first! Click on a date in the calendar.", "error");
        return;
    }
    const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);
    if (num === 3 && totalQty === 0) {
        updateStatus("Please add at least one ticket to continue.", "error");
        return;
    }
    // Clear status when moving forward
    updateStatus(null);
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

/**
 * Calculates the grand total respecting group offer (buy 4, get 1 free)
 * and family pack flat pricing.
 * Single source of truth for frontend pricing.
 */
function calculateTotal() {
    let total = 0;
    for (const [type, qty] of Object.entries(quantities)) {
        if (type === 'group') {
            // Buy 4 tickets, get 1 free
            const freeTickets = Math.floor(qty / 5);
            const chargedQty = qty - freeTickets;
            total += chargedQty * prices.group;
        } else if (type === 'family') {
            // Family pack = flat price per pack
            total += qty * prices.family;
        } else if (prices[type]) {
            total += qty * prices[type];
        }
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

    return total;
}

// Keep getGrandTotal as a simple alias for backward compatibility or cleaner calls
function getGrandTotal() {
    return calculateTotal();
}

function updateBookingSummary() {
    const summaryDate = document.getElementById('summary-date');
    if (summaryDate && selectedDate) {
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        summaryDate.textContent = selectedDate.toLocaleDateString('en-IN', options);
    }
    
    const total = getGrandTotal();
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
    const total = getGrandTotal();
    const finalAmountEl = document.getElementById('final-total');
    if (finalAmountEl) {
        finalAmountEl.textContent = `₹${total.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }
}

async function submitBooking(event) {
    if (event) event.preventDefault();
    
    const form = event ? event.target : null;
    let name = form && form.querySelector('input[type="text"]') ? form.querySelector('input[type="text"]').value : "Guest";
    let email = form && form.querySelector('input[type="email"]') ? form.querySelector('input[type="email"]').value : "guest@example.com";
    let contact = form && form.querySelector('input[type="tel"]') ? form.querySelector('input[type="tel"]').value : "9999999999";

    const total = getGrandTotal();
    
    // Disable submit button/show loading if applicable
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
    }

    try {
        updateStatus("Preparing your secure checkout...", "info");

        // 1. Create order in Backend
        const orderRes = await fetch('/.netlify/functions/create-order', {
            method: 'POST',
            body: JSON.stringify({ quantities })
        });
        
        if (!orderRes.ok) throw new Error("Could not connect to the payment server. Please try again.");
        const orderData = await orderRes.json();

        updateStatus(null); // Clear status before opening Razorpay

        // 2. Setup Razorpay checkout
        const options = {
            "key": "rzp_test_SbosXGOvTDu2J2", // Public Key (Test)
            "amount": orderData.amount, // from backend
            "currency": "INR",
            "name": "Blue Splash Waterpark",
            "description": "Ticket Booking",
            "image": "assets/logo.webp",
            "order_id": orderData.id,
            "handler": async function (response) {
                try {
                    updateStatus("Verifying payment and sending your tickets...", "info");

                    // 3. Verify Payment in Backend & Send Brevo Email
                    const verifyRes = await fetch('/.netlify/functions/verify-payment', {
                        method: 'POST',
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            user: { name, email, contact },
                            // Note: backend now pulls 'total' and 'date' from source-of-truth
                            date: selectedDate ? selectedDate.toDateString() : 'TBD'
                        })
                    });

                    if (verifyRes.ok) {
                        updateStatus(null);
                        nextStep(4);
                    } else {
                        const errData = await verifyRes.json();
                        updateStatus(errData.error || "Payment successful, but we couldn't verify it instantly. Please contact support.", "error");
                    }
                } catch (vErr) {
                    console.error(vErr);
                    updateStatus("There was a problem finalizing your booking. Our team will contact you shortly.", "error");
                }
            },
            "prefill": {
                "name": name,
                "email": email,
                "contact": contact
            },
            "theme": {
                "color": "#FF7A00"
            }
        };
        
        if (typeof Razorpay !== 'undefined') {
            const rzp1 = new Razorpay(options);
            rzp1.on('payment.failed', function (response){
                updateStatus("Payment Failed: " + response.error.description, "error");
            });
            rzp1.open();
        } else {
            updateStatus("Razorpay is unavailable. Please check your internet connection.", "error");
        }
    } catch (error) {
        console.error("Booking Error:", error);
        updateStatus(error.message, "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'PAY WITH RAZORPAY';
        }
    }
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
