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
