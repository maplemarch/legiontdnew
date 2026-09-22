/* patch-toc.js — แถบสารบัญหน้า Patch Notes: ไฮไลต์หัวข้อที่กำลังอ่านและเลื่อนแบบนุ่ม */
(function () {
    const links = document.querySelectorAll('.toc-link');
    const sections = document.querySelectorAll('.section');
    if (!links.length || !sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((link) => link.classList.remove('active'));
            const active = document.querySelector('.toc-link[href="#' + entry.target.id + '"]');
            if (active) {
                active.classList.add('active');
                active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }
        });
    }, { threshold: 0.2, rootMargin: '-140px 0px -50% 0px' });

    sections.forEach((section) => observer.observe(section));

    links.forEach((link) => {
        link.addEventListener('click', (event) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (!target) return;
            event.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - 140;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });
})();
