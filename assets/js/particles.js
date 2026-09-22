/* particles.js — จุดแสงลอยขึ้นในแบนเนอร์ */
(function () {
    const container = document.getElementById('particles');
    if (!container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colors = ['#f0b429', '#ffd166', '#a855f7', '#3b82f6', '#22c55e'];
    const count = 30;

    for (let i = 0; i < count; i += 1) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 6 + 's';
        p.style.animationDuration = (4 + Math.random() * 4) + 's';
        p.style.width = (2 + Math.random() * 3) + 'px';
        p.style.height = p.style.width;
        p.style.opacity = 0;
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(p);
    }
})();
