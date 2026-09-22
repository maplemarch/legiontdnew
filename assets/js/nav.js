/* nav.js — แถบเมนูด้านบน: เข้มขึ้นเมื่อเลื่อนลง ปุ่มแฮมเบอร์เกอร์บิดเป็นกากบาท และเมนูเต็มจอบนมือถือ */

/* เข้มขึ้นเมื่อเลื่อนพ้นหัวหน้า ใช้ sentinel แทนการฟัง scroll เพื่อไม่ให้เกิด reflow ต่อเนื่อง */
(function () {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;

    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;';
    document.body.prepend(sentinel);

    const observer = new IntersectionObserver(([entry]) => {
        nav.classList.toggle('scrolled', !entry.isIntersecting);
    }, { threshold: 0 });

    observer.observe(sentinel);
})();

(function () {
    const toggle = document.querySelector('.nav-toggle');
    const overlay = document.querySelector('.nav-overlay');
    if (!toggle || !overlay) return;

    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        overlay.classList.toggle('open', open);
        overlay.setAttribute('aria-hidden', String(!open));
        document.body.style.overflow = open ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    overlay.addEventListener('click', (event) => {
        if (event.target.closest('a') || event.target === overlay) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
            setOpen(false);
            toggle.focus();
        }
    });
})();
