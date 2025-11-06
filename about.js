// About page functionality
document.addEventListener('DOMContentLoaded', function() {
    animateNumbers();
    loadStatsFromAPI();
    initializeMobileMenu();
});

// Animate numbers with counting effect
function animateNumbers() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(element => {
        const finalNumber = parseInt(element.textContent) || 0;
        
        if (finalNumber > 0) {
            animateNumber(element, 0, finalNumber, 2000);
        }
    });
}

// Number animation function
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const currentNumber = Math.floor(start + (end - start) * easeOutQuart(progress));
        element.textContent = currentNumber.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Easing function for smooth animation
function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}

// Load real statistics from API (using the same data as the main app)
async function loadStatsFromAPI() {
    try {
        // URL del Google Sheets publicado
        const googleSheetsURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIKh_vys71-FBFCWFW3cSofAEjIhq9CncE2Brk_qzgcKXZ1XSjkYCET-J2YxM47IXbw5szIVz3v2as/pub?gid=47348234&single=true&output=csv';
        const response = await fetch(googleSheetsURL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        const reports = parseCSV(csvText);
        
        updateStats(reports);

    } catch (error) {
        console.error('Error loading stats:', error);
        // Keep default values if API fails
    }
}

// Parse CSV data (same function as main app)
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const reports = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const report = {};

            headers.forEach((header, index) => {
                report[header] = values[index] || '';
            });

            // Validate required fields and coordinate ranges
            const lat = parseFloat(report.lat);
            const lng = parseFloat(report.lng);

            if (
                !isNaN(lat) && lat >= -90 && lat <= 90 &&
                !isNaN(lng) && lng >= -180 && lng <= 180 &&
                report.tipo
            ) {
                reports.push(report);
            }
        }
    }

    return reports;
}

// Update statistics with real data
function updateStats(reports) {
    const totalReports = reports.length;
    const resolvedReports = reports.filter(report => 
        report.estado && 
        (report.estado.toLowerCase().includes('resuelto') || 
         report.estado.toLowerCase().includes('completado') ||
         report.estado.toLowerCase().includes('solucionado'))
    ).length;
    
    // Update report count
    const reportCountElement = document.getElementById('reportCount');
    if (reportCountElement && totalReports > 0) {
        animateNumber(reportCountElement, 0, totalReports, 2000);
    }
    
    // Update resolved count
    const resolvedCountElement = document.getElementById('resolvedCount');
    if (resolvedCountElement && resolvedReports > 0) {
        animateNumber(resolvedCountElement, 0, resolvedReports, 2000);
    }
}

// Smooth scrolling for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add intersection observer for animations on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.feature-card, .instruction-step, .stat-card').forEach(el => {
    observer.observe(el);
});

// Add CSS for animation classes
const style = document.createElement('style');
style.textContent = `
    .feature-card,
    .instruction-step,
    .stat-card {
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.6s ease;
    }
    
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;

// Mobile Menu Functionality
function initializeMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const headerNav = document.getElementById('headerNav');
    
    if (mobileMenuToggle && headerNav) {
        mobileMenuToggle.addEventListener('click', function() {
            // Toggle menu visibility
            headerNav.classList.toggle('active');
            mobileMenuToggle.classList.toggle('active');
        });
        
        // Close menu when clicking on a navigation link
        const navLinks = headerNav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                headerNav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInsideNav = headerNav.contains(event.target);
            const isClickOnToggle = mobileMenuToggle.contains(event.target);
            
            if (!isClickInsideNav && !isClickOnToggle && headerNav.classList.contains('active')) {
                headerNav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        });
        
        // Close menu on window resize if it gets too wide
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                headerNav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            }
        });
    }
}
document.head.appendChild(style);