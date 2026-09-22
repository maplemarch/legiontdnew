/* units.js — ตารางยูนิต ค้นหา กรอง และหน้ารายละเอียด
   ข้อมูลมาจาก assets/data/units.json โหลดครั้งเดียวตอนเปิดหน้า */
(function () {
    const grid = document.getElementById('unit-grid');
    if (!grid) return;

    const search = document.getElementById('unit-search');
    const tierSel = document.getElementById('unit-tier');
    const countEl = document.getElementById('unit-count');
    const clearBtn = document.getElementById('unit-clear');
    const dialog = document.getElementById('unit-dialog');
    const dialogBody = document.getElementById('unit-dialog-body');

    let units = [];
    let byId = new Map();

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
        countEl.textContent = list.length ? `พบ ${list.length} รายการ` : 'ไม่พบยูนิตที่ตรงกับที่ค้นหา';
        grid.innerHTML = list.map(cardHtml).join('');
    };

    const apply = () => {
        const q = search.value.trim().toLowerCase();
        const tier = tierSel.value;

        const list = units.filter((u) => {
            if (tier === 'base' && !u.base) return false;
            if (tier && tier !== 'base' && String(u.tier) !== tier) return false;
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
                    ${u.tier ? `<span class="unit-link-tier">Tier ${esc(u.tier)}</span>` : ''}
                </button>`;
    };

    const openUnit = (id) => {
        const u = byId.get(id);
        if (!u) return;

        const stats = [
            statHtml('ระดับ', u.level, 'ph-stack'),
            statHtml('ค่าใช้จ่าย', u.cost, 'ph-coins'),
            statHtml('พลังชีวิต', u.hp, 'ph-heart'),
            statHtml('โจมตี', u.dmg, 'ph-crosshair'),
            statHtml('โจมตีเร็ว', u.speed, 'ph-lightning'),
            statHtml('ระยะ', u.range, 'ph-arrows-out-line-horizontal'),
            statHtml('ชนิดโจมตี', u.atk, 'ph-sword'),
            statHtml('ชนิดเกราะ', u.def, 'ph-shield'),
            statHtml('เกราะ', u.armor, 'ph-shield-check'),
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
            : '<p class="unit-empty-note">ไม่มีข้อมูลสกิล</p>';

        const ups = u.up.map((x) => linkHtml(x)).filter(Boolean).join('');
        const froms = u.from.map((x) => linkHtml(x)).filter(Boolean).join('');

        dialogBody.innerHTML = `
            <div class="unit-detail-head">
                ${iconTag(u, 'unit-detail-icon')}
                <div>
                    ${u.base ? '<span class="unit-badge">ยูนิตเริ่มต้น</span>' : ''}
                    <h3 class="unit-detail-name">${esc(u.name)}</h3>
                    <p class="unit-detail-id">${esc(u.id)}${u.tier ? ` · Tier ${esc(u.tier)}` : ''}</p>
                    ${u.tip ? `<p class="unit-detail-tip">${esc(u.tip)}</p>` : ''}
                </div>
            </div>

            <div class="unit-stat-grid">${stats}</div>

            <div class="unit-detail-cols">
                <div>
                    <h4 class="unit-detail-sub"><i class="ph ph-scroll" aria-hidden="true"></i> สกิล</h4>
                    ${skills}
                </div>
                <div>
                    <h4 class="unit-detail-sub"><i class="ph ph-tree-structure" aria-hidden="true"></i> อัปเกรดต่อ</h4>
                    ${ups || '<p class="unit-empty-note">อัปเกรดต่อไม่ได้แล้ว</p>'}
                    ${froms ? `<h4 class="unit-detail-sub" style="margin-top: var(--space-300);"><i class="ph ph-arrow-u-up-left" aria-hidden="true"></i> อัปเกรดมาจาก</h4>${froms}` : ''}
                </div>
            </div>`;

        if (!dialog.open) dialog.showModal();
        dialogBody.scrollTop = 0;
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
    clearBtn.addEventListener('click', () => {
        search.value = '';
        tierSel.value = 'base';
        apply();
    });

    /* ── โหลดข้อมูล ── */
    fetch('../assets/data/units.json')
        .then((r) => {
            if (!r.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ ' + r.status);
            return r.json();
        })
        .then((data) => {
            units = data;
            byId = new Map(data.map((u) => [u.id, u]));
            apply();
        })
        .catch((err) => {
            countEl.textContent = '';
            grid.innerHTML = `<p class="unit-empty-note">โหลดข้อมูลยูนิตไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง<br><span style="color:var(--text-muted)">${esc(err.message)}</span></p>`;
        });
})();
