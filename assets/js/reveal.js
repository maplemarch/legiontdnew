/* reveal.js — เอฟเฟกต์ตอนเลื่อนเข้ามาในจอ
   1) .reveal        เลื่อนขึ้นพร้อมเบลอจางหาย
   2) .tagline-reveal ไล่สีทีละคำตามลำดับการอ่าน */

(function () {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach((el) => observer.observe(el));
})();

/* 3) การ์ดและแถวข้อมูลเลื่อนขึ้นเบาๆ ทีละชิ้นตอนเลื่อนหน้ามาถึง
      ใช้กับของที่มีจำนวนมาก (การ์ดยูนิต แถวเวฟ การ์ดในหน้าแพตช์) จึงเบากว่า .reveal: ไม่เบลอ ระยะสั้น
      รวมของที่ JS สร้างทีหลังด้วย (ตารางยูนิต ข้อมูลครีป King) ผ่าน MutationObserver
      เล่นจบแล้วถอดคลาสทิ้ง การ์ดจะกลับไปใช้ transition และ transform ของตัวเอง (hover เอียง ฯลฯ) ตามเดิม */
(function () {
    const SELECTOR = '.card, .file-row, .contact-card, .unit-card, .wave, .shop-card, .unit-stat, .lumber-wrap, .map-card';
    const STEP = 45;      // ระยะห่างระหว่างชิ้นที่โผล่พร้อมกัน (ms)
    const MAX_DELAY = 360;
    const DURATION = 520;

    const observer = new IntersectionObserver((entries) => {
        let i = 0;
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            observer.unobserve(el);
            const delay = Math.min(i * STEP, MAX_DELAY);
            i += 1;
            el.style.setProperty('--rd', delay + 'ms');
            el.classList.add('is-in');
            setTimeout(() => {
                el.classList.remove('reveal-sm', 'is-in');
                el.style.removeProperty('--rd');
            }, DURATION + delay + 50);
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    const prepare = (root) => {
        const list = root.matches && root.matches(SELECTOR) ? [root] : [];
        if (root.querySelectorAll) list.push(...root.querySelectorAll(SELECTOR));
        list.forEach((el) => {
            // ของที่มี .reveal อยู่แล้วให้ตัวเดิมจัดการ ไม่ซ้อนสองชั้น
            if (el.classList.contains('reveal') || el.dataset.revealed) return;
            el.dataset.revealed = '1';
            el.classList.add('reveal-sm');
            observer.observe(el);
        });
    };

    prepare(document.body);
    new MutationObserver((mutations) => {
        mutations.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) prepare(n); }));
    }).observe(document.body, { childList: true, subtree: true });
})();

(function () {
    const block = document.querySelector('.tagline-reveal');
    if (!block) return;

    // ภาษาไทยไม่เว้นวรรคระหว่างคำ จึงตัดคำด้วย Intl.Segmenter
    // ถ้าเบราว์เซอร์ไม่รองรับ ให้ถอยไปใช้การเว้นวรรคแบบเดิม
    const segment = (text) => {
        if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
            const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
            return Array.from(segmenter.segment(text), (s) => s.segment).filter((s) => s.trim() !== '' || s === ' ');
        }
        return text.split(/(\s+)/);
    };

    const lines = Array.from(block.querySelectorAll('.tagline-line'));
    const words = [];

    lines.forEach((line) => {
        const text = line.textContent.trim();
        line.textContent = '';
        segment(text).forEach((chunk) => {
            if (chunk.trim() === '') {
                line.appendChild(document.createTextNode(chunk));
                return;
            }
            const span = document.createElement('span');
            span.className = 'tagline-word';
            span.textContent = chunk;
            line.appendChild(span);
            words.push(span);
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const span = entry.target;
            const delay = Number(span.dataset.index) * 60;
            setTimeout(() => span.classList.add('lit'), delay);
            observer.unobserve(span);
        });
    }, { threshold: 1, rootMargin: '0px 0px -30% 0px' });

    words.forEach((span, index) => {
        span.dataset.index = String(index);
        observer.observe(span);
    });
})();
