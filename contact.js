// Animaciones y FAQ
document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
    
    // FAQ
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', function() {
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            item.classList.toggle('active');
        });
    });

    // Animaciones
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
    document.querySelectorAll('.contact-item, .collaboration-card, .faq-item').forEach(el => {
        observer.observe(el);
    });

    // CSS para animaciones
    const style = document.createElement('style');
    style.textContent = `
        .contact-item,
        .collaboration-card,
        .faq-item {
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
});