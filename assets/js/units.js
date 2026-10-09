/* units.js — ตารางยูนิต ค้นหา กรอง และหน้ารายละเอียด
   ข้อมูลมาจาก assets/data/units.json โหลดครั้งเดียวตอนเปิดหน้า */
(function () {
    const grid = document.getElementById('unit-grid');
    if (!grid) return;

    const search = document.getElementById('unit-search');
    const tierSel = document.getElementById('unit-tier');     // Tier ในเกม 1-6 (ช่องสุ่ม)
    const stageSel = document.getElementById('unit-stage');   // ร่างแรก หรือขั้นอัปเกรด
    const atkSel = document.getElementById('unit-atk');       // ชนิดโจมตี (ชื่อที่เกมประกาศ เช่น Piercing)
    const defSel = document.getElementById('unit-def');       // ชนิดเกราะ (เช่น Light)
    const countEl = document.getElementById('unit-count');
    const clearBtn = document.getElementById('unit-clear');
    const dialog = document.getElementById('unit-dialog');
    const dialogBody = document.getElementById('unit-dialog-body');

    let units = [];
    let byId = new Map();
    let currentId = '';   // ยูนิตที่เปิดดูอยู่ในกล่องรายละเอียด ใช้วาดใหม่ตอนสลับภาษา
    let quiet = false;    // รอบวาดใหม่ตอนสลับภาษา ไม่ต้องเล่นอนิเมชันการ์ดซ้ำ

    const t = (th, en) => (window.LTD_I18N ? window.LTD_I18N.t(th, en) : th);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Tier 1-6 คือช่องสุ่ม ส่วน 'hero' คือ Altar of Heroes กับฮีโร่ที่สร้างจากมัน และ 'dragon' คือมังกรในช่องที่ 7
    const tierLabel = (tier) => (tier === 'hero' ? 'Hero' : tier === 'dragon' ? 'Dragon' : 'Tier ' + tier);

    /* ชนิดโจมตีและเกราะ: ข้อมูลเก็บเป็นรหัสของเกม แปลงเป็นชื่อที่เกมประกาศ ใช้สีเดียวกับ tag ของครีป (game.css)
       เกราะ normal ในแมพนี้คือ Fortified (ตารางดาเมจใช้ค่าเดียวกับ fort) */
    const ATK = { Pierce: ['Piercing', 'pierce'], Normal: ['Normal', 'normal'], Magic: ['Magic', 'magic'], Siege: ['Siege', 'siege'], Chaos: ['Chaos', 'chaos'] };
    const DEF = {
        small: ['Light', 'light'], medium: ['Medium', 'medium'], large: ['Heavy', 'heavy'], normal: ['Fortified', 'fort'],
        fort: ['Fortified', 'fort'], none: ['Unarmored', 'unarmored'], divine: ['Enchanted', 'enchanted'], hero: ['Hero', 'hero'],
    };
    const typeTag = (code, map, icon) => {
        if (!code) return '';
        const [label, cls] = map[code] || [code, 'normal'];
        return `<span class="type-tag type-${cls}"><i class="ph ${icon}" aria-hidden="true"></i>${esc(label)}</span>`;
    };

    const iconTag = (u, cls) =>
        u.icon
            ? `<img class="${cls}" src="${esc(u.icon)}" alt="" loading="lazy" decoding="async" width="48" height="48">`
            : `<span class="${cls} unit-icon-blank" aria-hidden="true">?</span>`;

    /* ── ตารางยูนิต ── */
    const cardHtml = (u) => `
        <button class="unit-card" type="button" data-id="${esc(u.id)}">
            ${iconTag(u, 'unit-card-icon')}
            <span class="unit-card-name">${esc(u.name)}</span>
            ${u.cost ? `<span class="unit-card-cost"><i class="ph ph-coins" aria-hidden="true"></i>${esc(u.cost)}</span>` : ''}
        </button>`;

    const render = (list) => {
        countEl.textContent = list.length
            ? t(`พบ ${list.length} รายการ`, `${list.length} found`)
            : t('ไม่พบยูนิตที่ตรงกับที่ค้นหา', 'No units match your search');
        grid.innerHTML = list.map(cardHtml).join('');
        // ติด data-revealed ก่อน MutationObserver ของ reveal.js ทำงาน การ์ดจะแสดงทันทีไม่เลื่อนขึ้นซ้ำ
        if (quiet) grid.querySelectorAll('.unit-card').forEach((c) => { c.dataset.revealed = '1'; });
    };

    const apply = () => {
        const q = search.value.trim().toLowerCase();
        const tier = tierSel.value;
        const stage = stageSel.value;
        const atk = atkSel.value;
        const def = defSel.value;

        const list = units.filter((u) => {
            if (tier && String(u.tier) !== tier) return false;
            if (atk && (ATK[u.atk] || [u.atk])[0] !== atk) return false;
            if (def && (DEF[u.def] || [u.def])[0] !== def) return false;
            if (stage === 'base' && !u.base) return false;
            if (stage && stage !== 'base' && String(u.stage) !== stage) return false;
            if (!q) return true;
            // ค้นได้ทั้งชื่อ รหัสในเกม และชื่อสกิล
            return u.name.toLowerCase().includes(q)
                || u.id.toLowerCase().includes(q)
                || u.skills.some((s) => s.name.toLowerCase().includes(q));
        });

        render(list);
    };

    /* ── หน้ารายละเอียด ── */
    const statHtml = (label, value, icon) => value
        ? `<div class="unit-stat">
               <span class="unit-stat-icon"><i class="ph ${icon}" aria-hidden="true"></i></span>
               <span class="unit-stat-label">${esc(label)}</span>
               <span class="unit-stat-value">${esc(value)}</span>
           </div>`
        : '';

    const linkHtml = (id, label) => {
        const u = byId.get(id);
        if (!u) return '';
        return `<button class="unit-link" type="button" data-id="${esc(u.id)}">
                    ${iconTag(u, 'unit-link-icon')}
                    <span>${esc(u.name)}</span>
                    ${u.tier ? `<span class="unit-link-tier">${esc(tierLabel(u.tier))}</span>` : ''}
                </button>`;
    };

    const openUnit = (id, keepScroll = false) => {
        const u = byId.get(id);
        if (!u) return;
        currentId = id;

        const stats = [
            statHtml(t('ระดับ', 'Level'), u.level, 'ph-stack'),
            statHtml(t('ค่าใช้จ่าย', 'Cost'), u.cost, 'ph-coins'),
            statHtml(t('พลังชีวิต', 'HP'), u.hp, 'ph-heart'),
            statHtml(t('พลังโจมตี', 'Damage'), u.dmg, 'ph-crosshair'),
            statHtml(t('ความเร็วโจมตี', 'Attack Speed'), u.speed, 'ph-lightning'),
            statHtml(t('ระยะโจมตี', 'Attack Range'), u.range, 'ph-arrows-out-line-horizontal'),
            statHtml(t('เกราะ', 'Armor'), u.armor, 'ph-shield-check'),
        ].join('');

        const skills = u.skills.length
            ? u.skills.map((s) => `
                <div class="unit-skill">
                    ${s.icon ? `<img class="unit-skill-icon" src="${esc(s.icon)}" alt="" loading="lazy" width="32" height="32">` : ''}
                    <div>
                        <div class="unit-skill-name">${esc(s.name)}</div>
                        ${s.desc ? `<p class="unit-skill-desc">${esc(s.desc)}</p>` : ''}
                    </div>
                </div>`).join('')
            : `<p class="unit-empty-note">${t('ไม่มีข้อมูลสกิล', 'No skill data')}</p>`;

        const ups = u.up.map((x) => linkHtml(x)).filter(Boolean).join('');
        const froms = u.from.map((x) => linkHtml(x)).filter(Boolean).join('');

        dialogBody.innerHTML = `
            <div class="unit-detail-head">
                ${iconTag(u, 'unit-detail-icon')}
                <div>
                    ${u.base ? `<span class="unit-badge">${t('ยูนิตเริ่มต้น', 'Base unit')}</span>` : ''}
                    <h3 class="unit-detail-name">${esc(u.name)}</h3>
                    <div class="unit-detail-types">${typeTag(u.atk, ATK, 'ph-sword')}${typeTag(u.def, DEF, 'ph-shield')}</div>
                </div>
            </div>

            <div class="unit-stat-grid">${stats}</div>

            <div class="unit-detail-cols">
                <div>
                    <h4 class="unit-detail-sub"><i class="ph ph-scroll" aria-hidden="true"></i> ${t('สกิล', 'Skills')}</h4>
                    ${skills}
                </div>
                <div>
                    <h4 class="unit-detail-sub"><i class="ph ph-tree-structure" aria-hidden="true"></i> ${t('อัปเกรดต่อ', 'Upgrades to')}</h4>
                    ${ups || `<p class="unit-empty-note">${t('อัปเกรดต่อไม่ได้แล้ว', 'No further upgrades')}</p>`}
                    ${froms ? `<h4 class="unit-detail-sub" style="margin-top: var(--space-300);"><i class="ph ph-arrow-u-up-left" aria-hidden="true"></i> ${t('อัปเกรดมาจาก', 'Upgrades from')}</h4>${froms}` : ''}
                </div>
            </div>`;

        if (!dialog.open) dialog.showModal();
        if (!keepScroll) dialogBody.scrollTop = 0;
    };

    /* ── เหตุการณ์ ── */
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.unit-card');
        if (card) openUnit(card.dataset.id);
    });

    dialogBody.addEventListener('click', (e) => {
        const link = e.target.closest('.unit-link');
        if (link) openUnit(link.dataset.id);
    });

    // คลิกนอกกล่องให้ปิด
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
    });
    dialog.querySelector('.unit-dialog-close').addEventListener('click', () => dialog.close());

    let timer = 0;
    search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(apply, 150);
    });
    tierSel.addEventListener('change', apply);
    stageSel.addEventListener('change', apply);
    atkSel.addEventListener('change', apply);
    defSel.addEventListener('change', apply);
    clearBtn.addEventListener('click', () => {
        search.value = '';
        tierSel.value = '';
        stageSel.value = 'base';
        atkSel.value = '';
        defSel.value = '';
        apply();
    });

    // สลับภาษา: วาดตารางใหม่ตามคำค้นและตัวกรองที่ค้างอยู่ในช่อง และกล่องรายละเอียดถ้าเปิดอยู่
    let failed = null;
    const showError = (err) => {
        countEl.textContent = '';
        grid.innerHTML = `<p class="unit-empty-note">${t('โหลดข้อมูลยูนิตไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง', 'Could not load unit data. Try refreshing the page')}<br><span style="color:var(--text-muted)">${esc(err.message)}</span></p>`;
    };
    document.addEventListener('langchange', () => {
        if (failed) { showError(failed); return; }
        if (!units.length) return;
        quiet = true;
        apply();
        quiet = false;
        if (dialog.open && currentId) openUnit(currentId, true);
    });

    /* ── โหลดข้อมูล ── */
    fetch('../assets/data/units.json?v=e0eff7b8')
        .then((r) => {
            if (!r.ok) throw new Error(t('โหลดข้อมูลไม่สำเร็จ ', 'Load failed ') + r.status);
            return r.json();
        })
        .then((data) => {
            // ยังไม่แสดงสกิน ([Skin] ...) ตัดออกทั้งจากตารางและลิงก์อัปเกรด ข้อมูลยังเก็บไว้ใน units.json
            units = data.filter((u) => !u.skin);
            byId = new Map(units.map((u) => [u.id, u]));
            apply();
        })
        .catch((err) => {
            failed = err;
            showError(err);
        });
})();
