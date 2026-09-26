// ============================================================
// VOLCRA.LAB — home.js
// Minimal, stable behavior for the landing page.
// ============================================================

const logoWrapper  = document.getElementById('logo-wrapper');
const logoDropdown = document.getElementById('logo-dropdown');

if (logoWrapper && logoDropdown) {
    logoWrapper.addEventListener('click', (event) => {
        event.stopPropagation();
        const isVisible = logoDropdown.style.display === 'block';
        logoDropdown.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (event) => {
        if (!logoWrapper.contains(event.target)) {
            logoDropdown.style.display = 'none';
        }
    });
}

const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealEls.forEach((el) => revealObserver.observe(el));
} else {
    revealEls.forEach((el) => el.classList.add('visible'));
}

const logoZone = document.getElementById('logoZone');
if (logoZone) {
    logoZone.classList.add('moved');
    setTimeout(() => logoZone.classList.remove('moved'), 350);
}

const sceneGlow = document.querySelector('.brand-scene');
if (sceneGlow) {
    sceneGlow.style.animation = 'pulseGlow 7s ease-in-out infinite';
}

const logoImg = document.getElementById('chipLogoImg');
if (logoImg) {
    logoImg.style.animation = 'none';
    logoImg.style.filter = 'drop-shadow(0 0 12px rgba(255,255,255,0.18))';
}
