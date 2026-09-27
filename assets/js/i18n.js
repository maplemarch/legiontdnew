/* i18n.js — สลับภาษา ไทย/อังกฤษ ทั้งเว็บ
 *
 * โหลดใน <head> แบบไม่ defer เพื่อตั้งภาษาก่อนหน้าแสดงผล ไม่ให้เห็นภาษาไทยแวบก่อนเปลี่ยน
 *
 * วิธีใส่คำแปลใน HTML (ภาษาไทยคือค่าเดิมในหน้า ไม่ต้องเขียนซ้ำ)
 *   <p data-en="English text">ข้อความไทย</p>            แทนเนื้อในทั้งก้อน ใส่แท็ก HTML ได้
 *   <input placeholder="ค้นหา" data-en-placeholder="Search">  แปลแอตทริบิวต์ ใช้ data-en-<ชื่อแอตทริบิวต์>
 *   <title data-en="Download — Legion TD NewEdition">…</title>
 *
 * ข้อความที่ JS สร้าง ใช้ LTD_I18N.t('ไทย', 'English')
 * แล้วฟัง document 'langchange' เพื่อวาดใหม่เมื่อผู้ใช้สลับภาษา */
(function () {
    const KEY = 'ltd-lang';
    const root = document.documentElement;

    let lang = 'th';
    try { if (localStorage.getItem(KEY) === 'en') lang = 'en'; } catch (e) { /* โหมดส่วนตัว ใช้ไทย */ }
    root.lang = lang;

    // ซ่อนหน้าไว้จนกว่าจะแปลเสร็จ เฉพาะตอนเปิดมาเป็นภาษาอังกฤษ
    if (lang === 'en') {
        root.classList.add('i18n-pending');
        const style = document.createElement('style');
        style.textContent = 'html.i18n-pending body{visibility:hidden}';
        document.head.appendChild(style);
    }

    const ATTR_PREFIX = 'data-en-';
    const thaiHtml = new WeakMap();   // เนื้อในภาษาไทยเดิม เก็บไว้ตอนสลับกลับ
    const thaiAttr = new WeakMap();

    function apply(scope) {
        const base = scope || document;
        base.querySelectorAll('[data-en]').forEach((el) => {
            if (!thaiHtml.has(el)) thaiHtml.set(el, el.innerHTML);
            el.innerHTML = lang === 'en' ? el.getAttribute('data-en') : thaiHtml.get(el);
        });
        base.querySelectorAll('*').forEach((el) => {
            for (const { name, value } of Array.from(el.attributes)) {
                if (!name.startsWith(ATTR_PREFIX)) continue;
                const target = name.slice(ATTR_PREFIX.length);
                let saved = thaiAttr.get(el);
                if (!saved) thaiAttr.set(el, (saved = {}));
                if (!(target in saved)) saved[target] = el.getAttribute(target);
                const next = lang === 'en' ? value : saved[target];
                if (next == null) el.removeAttribute(target);
                else el.setAttribute(target, next);
            }
        });
    }

    function updateButtons() {
        document.querySelectorAll('.lang-toggle').forEach((btn) => {
            btn.setAttribute('aria-label', lang === 'en' ? 'เปลี่ยนเป็นภาษาไทย' : 'Switch to English');
            btn.querySelectorAll('[data-lang-opt]').forEach((opt) => {
                opt.classList.toggle('active', opt.dataset.langOpt === lang);
            });
        });
    }

    function set(next) {
        if (next === lang) return;
        lang = next;
        root.lang = lang;
        try { localStorage.setItem(KEY, lang); } catch (e) { /* จำไม่ได้ก็ใช้ได้เฉพาะหน้านี้ */ }
        apply();
        updateButtons();
        document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    }

    // ปุ่มสลับภาษา ใส่ให้เองทั้งในแถบเมนูและเมนูเต็มจอบนมือถือ ไม่ต้องแก้ HTML ทุกหน้า
    function makeButton() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lang-toggle';
        btn.innerHTML = '<span data-lang-opt="th">TH</span><span class="lang-sep" aria-hidden="true">/</span><span data-lang-opt="en">EN</span>';
        btn.addEventListener('click', () => set(lang === 'en' ? 'th' : 'en'));
        return btn;
    }

    function init() {
        const actions = document.querySelector('.nav-actions');
        if (actions) actions.prepend(makeButton());
        const overlay = document.querySelector('.nav-overlay-list');
        if (overlay) {
            const li = document.createElement('li');
            li.className = 'nav-overlay-lang';
            li.appendChild(makeButton());
            overlay.appendChild(li);
        }
        if (lang === 'en') apply();
        updateButtons();
        root.classList.remove('i18n-pending');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.LTD_I18N = {
        get lang() { return lang; },
        t: (th, en) => (lang === 'en' && en != null ? en : th),
        set,
        apply,
    };
})();
