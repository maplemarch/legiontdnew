/* tilt.js — การ์ดเอียงสามมิติตามเมาส์ พร้อมแสงสะท้อนตรงจุดที่ชี้
   ใช้ event delegation จึงครอบคลุมการ์ดยูนิตที่ units.js สร้างทีหลังด้วย
   เปิดเฉพาะอุปกรณ์ที่มีเมาส์ จอสัมผัสไม่มีสถานะ hover ให้เอียงตาม */
(function () {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const SELECTOR = '.file-row, .contact-card, .unit-card, .map-card';
    let active = null;

    const release = (el) => {
        el.classList.remove('is-tilting');
        el.style.removeProperty('--rx');
        el.style.removeProperty('--ry');
    };

    document.addEventListener('pointermove', (e) => {
        const el = e.target.closest(SELECTOR);
        if (el !== active) {
            if (active) release(active);
            active = el;
        }
        if (!el) return;

        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        // แถวไฟล์กว้างเกือบเต็มจอ เอียงมากเท่าการ์ดเล็กแล้วขอบจะยื่นออกมาเยอะเกิน
        const max = el.classList.contains('file-row') ? 3 : 9;

        el.style.setProperty('--rx', ((0.5 - y) * max).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((x - 0.5) * max).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        el.classList.add('is-tilting');
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
        if (active) release(active);
        active = null;
    });
})();
