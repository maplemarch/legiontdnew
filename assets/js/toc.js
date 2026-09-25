/* toc.js — แถบแท็บใต้เมนู: ไฮไลต์หัวข้อที่กำลังอ่านและเลื่อนแบบนุ่ม
   ใช้ทั้งหน้า Patch Notes และหน้า Wiki

   เลือกแท็บจากตำแหน่งเลื่อนแทน IntersectionObserver แบบ threshold
   เพราะหัวข้อที่ยาวกว่าจอ (ตารางครีป ตาราง Champion) ไม่มีวันโผล่ครบ 20% ในกรอบ แท็บเลยค้างอยู่ที่หัวข้อแรก */
(function () {
    const links = document.querySelectorAll('.toc-link');
    const sections = Array.from(document.querySelectorAll('.section')).filter((s) => s.id);
    if (!links.length || !sections.length) return;

    const OFFSET = 160; // ความสูงเมนูบน + แถบแท็บ + ระยะเผื่อ
    let current = '';

    const setActive = (id) => {
        if (id === current) return;
        current = id;
        links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#' + id));
        const active = document.querySelector('.toc-link[href="#' + id + '"]');
        // บนมือถือแถบแท็บเลื่อนแนวนอนได้ ให้แท็บที่เลือกอยู่ในจอเสมอ โดยไม่ขยับหน้าในแนวตั้ง
        if (active) active.parentElement.scrollTo({ left: active.offsetLeft - 16, behavior: 'smooth' });
    };

    const update = () => {
        // เลื่อนจนสุดหน้าแล้ว หัวข้อท้ายๆ ที่สั้นอาจไม่มีวันขึ้นไปถึงเส้น ให้เลือกหัวข้อสุดท้าย
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
            setActive(sections[sections.length - 1].id);
            return;
        }
        let id = sections[0].id;
        for (const s of sections) {
            if (s.getBoundingClientRect().top - OFFSET <= 0) id = s.id;
            else break;
        }
        setActive(id);
    };

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', update);
    // เนื้อหาบางหัวข้อโหลดทีหลัง (ครีป King) ความสูงหน้าเปลี่ยน ให้คำนวณใหม่อีกรอบ
    window.addEventListener('load', update);
    update();

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
