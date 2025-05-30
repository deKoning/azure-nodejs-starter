// Main JavaScript file for client-side interactions

document.addEventListener('DOMContentLoaded', function() {
    console.log('Azure Node.js App loaded successfully!');
    
    // Add smooth scrolling for any anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add loading animation for buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Don't prevent default for external links
            if (!this.getAttribute('href').startsWith('#')) {
                this.style.opacity = '0.7';
                this.style.transform = 'scale(0.95)';
                
                setTimeout(() => {
                    this.style.opacity = '';
                    this.style.transform = '';
                }, 200);
            }
        });
    });

    // Add floating animation to feature cards
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
        card.classList.add('animate-float');
    });

    // Mobile menu functionality (if needed in future)
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Simple parallax effect for hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero-section');
        
        if (hero) {
            const rate = scrolled * -0.5;
            hero.style.transform = `translateY(${rate}px)`;
        }
    });

    // Add intersection observer for animations
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1
        });

        // Observe elements that should animate in
        const animateElements = document.querySelectorAll('.feature-card, .about-section, .tech-item');
        animateElements.forEach(el => {
            observer.observe(el);
        });
    }
});

// Add some CSS for the animations via JavaScript
const style = document.createElement('style');
style.textContent = `
    .animate-float {
        animation: float 6s ease-in-out infinite;
    }
    
    .animate-float:nth-child(2) {
        animation-delay: 2s;
    }
    
    .animate-float:nth-child(3) {
        animation-delay: 4s;
    }
    
    @keyframes float {
        0%, 100% {
            transform: translateY(0px);
        }
        50% {
            transform: translateY(-10px);
        }
    }
    
    .animate-in {
        animation: slideInUp 0.6s ease-out forwards;
    }
    
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
