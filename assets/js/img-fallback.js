/* img-fallback.js — กันไอคอนจากเว็บนอกที่โหลดไม่ขึ้นไม่ให้กลายเป็นรูปแตก */
(function () {
    const iconFor = (img) => {
        const text = ((img.alt || '') + ' ' + (img.src || '')).toLowerCase();
        if (text.includes('stomp')) return '💥';
        if (text.includes('shockwave')) return '🌊';
        if (text.includes('immolation')) return '🔥';
        if (text.includes('divine') || text.includes('presence')) return '👑';
        if (text.includes('demon') || text.includes('illidan')) return '😈';
        if (text.includes('hero')) return '🦸';
        return '✨';
    };

    document.querySelectorAll('img').forEach((img) => {
        img.addEventListener('error', () => {
            const parent = img.parentElement;
            if (!parent || parent.querySelector('.img-fallback')) return;
            parent.innerHTML = '<div class="img-fallback" aria-label="ไอคอนสำรอง">' + iconFor(img) + '</div>';
        }, { once: true });

        if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event('error'));
    });
})();
