/* game.js — แท็บ Creep, King และ Wisp & Tree ในหน้าข้อมูลแมพ
   ข้อมูลมาจาก assets/data/game.json ซึ่ง tools/build-game.js สร้างจากไฟล์แมพ
   ถ้าโหลดไม่ได้ กล่อง "กำลังรวบรวมข้อมูล" เดิมยังแสดงอยู่ตามปกติ */
(function () {
    const creepEl = document.getElementById('creep-data');
    const kingEl = document.getElementById('king-data');
    const champEl = document.getElementById('champion-data');
    const wispEl = document.getElementById('wisp-data');
    if (!creepEl && !kingEl && !wispEl && !champEl) return;

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmt = (n) => (n === '' || n == null ? '' : Number(n).toLocaleString('en-US'));

    // สีตามที่เกมใช้ประกาศชนิดโจมตีและเกราะก่อนเริ่มเวฟ (ปรับสีเข้มบางตัวให้อ่านออกบนพื้นมืด)
    const TYPE_CLASS = {
        Piercing: 'pierce', Normal: 'normal', Magic: 'magic', Siege: 'siege', Chaos: 'chaos',
        Light: 'light', Medium: 'medium', Heavy: 'heavy', Fortified: 'fort', Unarmored: 'unarmored', Enchanted: 'enchanted',
    };
    const typeTag = (t, kind) => t
        ? `<span class="type-tag type-${TYPE_CLASS[t] || 'normal'}"><i class="ph ${kind === 'atk' ? 'ph-sword' : 'ph-shield'}" aria-hidden="true"></i>${esc(t)}</span>`
        : '';

    const iconTag = (src, cls, fallback) => src
        ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" decoding="async" width="48" height="48">`
        : `<span class="${cls} game-icon-blank" aria-hidden="true"><i class="ph ${fallback}"></i></span>`;

    const stat = (label, value, icon) => value === '' || value == null ? '' : `
        <div class="unit-stat">
            <span class="unit-stat-icon"><i class="ph ${icon}" aria-hidden="true"></i></span>
            <span class="unit-stat-label">${esc(label)}</span>
            <span class="unit-stat-value">${esc(value)}</span>
        </div>`;

    const skill = (s) => `
        <div class="unit-skill">
            ${s.icon ? `<img class="unit-skill-icon" src="${esc(s.icon)}" alt="" loading="lazy" width="36" height="36">` : ''}
            <div>
                <div class="unit-skill-name">${esc(s.name)}</div>
                ${s.desc ? `<p class="unit-skill-desc">${esc(s.desc)}</p>` : ''}
            </div>
        </div>`;

    const cost = (item) => [
        item.lumber ? `<span class="game-cost game-cost-lumber"><i class="ph ph-tree" aria-hidden="true"></i>${fmt(item.lumber)}</span>` : '',
        item.gold ? `<span class="game-cost"><i class="ph ph-coins" aria-hidden="true"></i>${fmt(item.gold)}</span>` : '',
    ].join('');

    /* ── ครีป ── */
    const unitStats = (u) => [
        stat('ระยะ', u.range, 'ph-arrows-out-line-horizontal'),
        stat('โจมตีเร็ว', u.speed ? `${u.speed} วินาที` : '', 'ph-lightning'),
        stat('ความเร็วเดิน', u.move, 'ph-sneaker-move'),
        stat('ฟื้นพลังชีวิต', +u.regen ? `${u.regen}/วินาที` : '', 'ph-heartbeat'),
    ].join('');

    const waveRow = (c) => {
        const tag = c.boss ? '<span class="wave-flag wave-flag-boss">บอส</span>' : '';
        return `
        <details class="wave${c.boss ? ' wave-boss' : ''}">
            <summary class="wave-sum">
                <span class="wave-no"><small>เวฟ</small>${c.wave}</span>
                ${iconTag(c.icon, 'wave-icon', c.boss ? 'ph-crown-simple' : 'ph-skull')}
                <span class="wave-main">
                    <span class="wave-name">${esc(c.name)} ${tag}</span>
                    <span class="wave-types">${typeTag(c.atkType, 'atk')}${typeTag(c.defType, 'def')}</span>
                </span>
                <span class="wave-nums">
                    <span class="wave-num" title="พลังชีวิต"><i class="ph ph-heart" aria-hidden="true"></i>${fmt(c.hp)}</span>
                    <span class="wave-num" title="โจมตี"><i class="ph ph-crosshair" aria-hidden="true"></i>${esc(c.dmg)}</span>
                    <span class="wave-num" title="เกราะ"><i class="ph ph-shield-check" aria-hidden="true"></i>${esc(c.armor)}</span>
                    <span class="wave-num" title="จำนวนต่อเลน"><i class="ph ph-users-three" aria-hidden="true"></i>×${fmt(c.count)}</span>
                    <span class="wave-num wave-gold" title="ทองต่อตัว"><i class="ph ph-coins" aria-hidden="true"></i>${c.bounty ? '+' + c.bounty : '–'}</span>
                    <span class="wave-num wave-gold" title="ทองจบเวฟ"><i class="ph ph-flag-checkered" aria-hidden="true"></i>${c.finish ? '+' + fmt(c.finish) : '–'}</span>
                </span>
                <i class="ph ph-caret-down wave-caret" aria-hidden="true"></i>
            </summary>
            <div class="wave-body">
                <div class="unit-stat-grid">${unitStats(c)}${stat('มูลค่าเวฟ', fmt(c.value), 'ph-scales')}</div>
                ${c.skills.length ? `<h4 class="unit-detail-sub"><i class="ph ph-magic-wand" aria-hidden="true"></i> สกิล</h4>${c.skills.map(skill).join('')}` : ''}
            </div>
        </details>`;
    };

    const renderCreeps = (creeps) => `
        <p class="game-mode"><i class="ph ph-sliders-horizontal" aria-hidden="true"></i>
            ข้อมูลตามโหมด <code>-prmiccahx2</code> · เกมจบที่เวฟ ${creeps.length} · เวฟ 10 และ 20 ได้ทองจบเวฟสองเท่า</p>
        <div class="wave-head" aria-hidden="true">
            <span>เวฟ</span><span></span><span>ครีป</span>
            <span>พลังชีวิต</span><span>โจมตี</span><span>เกราะ</span><span>จำนวน/เลน</span><span>ทอง/ตัว</span><span>จบเวฟ</span><span></span>
        </div>
        <div class="wave-list">${creeps.map(waveRow).join('')}</div>
        <p class="game-note">กดที่แถวเพื่อดูระยะโจมตี ความเร็ว และสกิลของครีป · จำนวนคือจำนวนครีปต่อเลนในเวฟนั้น</p>`;

    /* ── King ── */
    const shopCard = (item, extra = '') => `
        <article class="shop-card">
            <div class="shop-head">
                ${iconTag(item.icon, 'shop-icon', 'ph-storefront')}
                <div>
                    <div class="shop-name">${esc(item.name)}</div>
                    <div class="shop-costs">${cost(item)}${extra}</div>
                </div>
            </div>
            ${item.desc ? `<p class="shop-desc">${esc(item.desc)}</p>` : ''}
        </article>`;

    /* ค่า King สองชุด ค่าเริ่มเกมกับค่าเมื่ออัปเกรดครบ สลับด้วยปุ่มด้านบน
       ช่องที่เปลี่ยนเก็บทั้งสองค่าไว้ใน data-base กับ data-max */
    const kingStats = (k) => {
        const m = k.max;
        const [lo, hi] = k.dmg.split('-').map(Number);
        const swap = (label, base, max, icon) => `
            <div class="unit-stat king-swap">
                <span class="unit-stat-icon"><i class="ph ${icon}" aria-hidden="true"></i></span>
                <span class="unit-stat-label">${esc(label)}</span>
                <span class="unit-stat-value" data-base="${esc(base)}" data-max="${esc(max)}">${esc(base)}</span>
            </div>`;
        return `
        <p class="game-note king-max-note"
            data-base="ค่าตอนเริ่มเกม ยังไม่ได้ซื้ออัปเกรด · กดอัปเต็มเพื่อดูค่าเมื่อซื้อครบทุกเลเวล"
            data-max="HP ${m.levels.hp} เลเวล (+${fmt(m.hp)}) · Attack ${m.levels.atk} เลเวล (+${fmt(m.dmg)}) · Regeneration ${m.levels.regen} เลเวล (+${fmt(m.regen)}/วินาที) · ยังไม่รวม Presence และสกิลของ King">ค่าตอนเริ่มเกม ยังไม่ได้ซื้ออัปเกรด · กดอัปเต็มเพื่อดูค่าเมื่อซื้อครบทุกเลเวล</p>
        <div class="unit-stat-grid">
            ${swap('พลังชีวิต', fmt(k.hp), fmt(+k.hp + m.hp), 'ph-heart')}
            ${swap('ฟื้นพลังชีวิต', `${k.regen}/วินาที`, `${fmt(+k.regen + m.regen)}/วินาที`, 'ph-heartbeat')}
            ${swap('โจมตี', k.dmg, `${fmt(lo + m.dmg)}-${fmt(hi + m.dmg)}`, 'ph-crosshair')}
            ${stat('มานา', fmt(k.mana), 'ph-drop')}
            ${stat('เกราะ', k.armor, 'ph-shield-check')}
            ${stat('โจมตีเร็ว', `${k.speed} วินาที`, 'ph-lightning')}
            ${stat('ระยะ', k.range, 'ph-arrows-out-line-horizontal')}
        </div>`;
    };

    const bindKingToggle = (root) => {
        root.addEventListener('click', (e) => {
            const btn = e.target.closest('.king-toggle-btn');
            if (!btn) return;
            const mode = btn.dataset.king;
            root.querySelectorAll('.king-toggle-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
            root.querySelectorAll('.king-swap .unit-stat-value').forEach((v) => { v.textContent = v.dataset[mode]; });
            root.querySelectorAll('.king-swap').forEach((s) => s.classList.toggle('is-max', mode === 'max'));
            // เปลี่ยนแค่ข้อความ บรรทัดนี้มีอยู่ตลอด หน้าจึงไม่ขยับตอนสลับ
            const note = root.querySelector('.king-max-note');
            note.textContent = note.dataset[mode];
        });
    };

    // Presence: สรุปหนึ่งบรรทัด แล้วแตกรายละเอียดเป็นข้อๆ
    const presenceCard = (p) => `
        <article class="shop-card">
            <div class="shop-head">
                ${iconTag(p.icon, 'shop-icon', 'ph-sparkle')}
                <div>
                    <div class="shop-name">${esc(p.name)}</div>
                    <div class="shop-costs">${cost(p)}</div>
                </div>
            </div>
            <p class="shop-summary">${esc(p.summary)}</p>
            <ul class="shop-bullets">${p.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        </article>`;

    // ตารางค่าสกิล แถวคือค่าแต่ละอย่าง คอลัมน์คือช่วงเวฟที่เกมปรับเลเวลให้
    const kingSkill = (s) => `
        <article class="shop-card">
            <div class="shop-head">
                ${iconTag(s.icon, 'shop-icon', 'ph-lightning')}
                <div>
                    <div class="shop-name">${esc(s.name)}</div>
                    <div class="shop-costs"><span class="game-cost game-cost-max">โหวตครั้งละ</span>${cost(s)}</div>
                </div>
            </div>
            <p class="shop-summary">${esc(s.summary)}</p>
            <div class="lumber-wrap">
                <table class="lumber-table skill-table">
                    <thead><tr><th>เวฟ</th>${s.stages.map((st) => `<th>${esc(st.waves)}</th>`).join('')}</tr></thead>
                    <tbody>${s.stages[0].values.map((v, i) => `
                        <tr><th scope="row">${esc(v.label)}</th>${s.stages.map((st) => `<td>${esc(st.values[i].value || '–')}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </div>
            ${s.unknownFrom ? `<p class="game-note" style="margin-top: 0;">เวฟ ${esc(s.unknownFrom)} เกมขึ้นเป็นเลเวล 5 แต่ไฟล์แมพไม่มีค่าของเลเวลนี้</p>` : ''}
        </article>`;

    const renderKing = (k) => `
        <div class="game-hero">
            ${iconTag(k.icon, 'game-hero-icon', 'ph-crown-simple')}
            <div>
                <h3 class="game-hero-name">${esc(k.name)}</h3>
                <p class="game-hero-sub">ตัวที่ต้องปกป้อง ครีปที่หลุดเลนจะเดินมาตี King</p>
            </div>
            <div class="king-toggle" role="group" aria-label="เลือกชุดค่าของ King">
                <button type="button" class="king-toggle-btn" data-king="base" aria-pressed="true">ค่าเริ่มเกม</button>
                <button type="button" class="king-toggle-btn" data-king="max" aria-pressed="false">
                    <i class="ph ph-crown-simple" aria-hidden="true"></i> อัปเต็ม
                </button>
            </div>
        </div>
        ${kingStats(k)}

        <h3 class="game-sub"><i class="ph ph-arrow-fat-up" aria-hidden="true"></i> อัปเกรด King</h3>
        <div class="shop-grid">
            ${k.upgrades.map((u) => `
                <article class="shop-card">
                    <div class="shop-head">
                        ${iconTag(u.items[0].icon, 'shop-icon', 'ph-arrow-fat-up')}
                        <div>
                            <div class="shop-name">${esc(u.name)}</div>
                            <div class="shop-costs"><span class="game-cost game-cost-max">สูงสุด ${u.max} เลเวล</span></div>
                        </div>
                    </div>
                    <p class="shop-desc">${esc(u.items[0].desc)}</p>
                    <div class="shop-options">${u.items.map((i) => `
                        <div class="shop-option">
                            <span>${/x5/i.test(i.name) ? 'ซื้อทีละ 5 เลเวล' : 'ซื้อทีละ 1 เลเวล'}</span>
                            <span class="shop-costs">${cost(i)}</span>
                        </div>`).join('')}
                    </div>
                </article>`).join('')}
        </div>

        <h3 class="game-sub"><i class="ph ph-sparkle" aria-hidden="true"></i> Presence <small>เลือกได้ 1 แบบ</small></h3>
        <div class="shop-grid shop-grid-2">${k.presence.map(presenceCard).join('')}</div>

        <h3 class="game-sub"><i class="ph ph-hand-pointing" aria-hidden="true"></i> สกิลของ King <small>ทีมโหวตเลือก เลเวลขึ้นเองตามเวฟ</small></h3>
        <div class="shop-grid shop-grid-2">${k.skills.map(kingSkill).join('')}</div>`;

    /* ── Challenge Champion ── */
    const renderChampion = (c) => {
        const rows = c.waves.map((w) => w.can ? `
            <tr>
                <td class="champ-wave"><span class="wave-no"><small>เวฟ</small>${w.wave}</span></td>
                <td><span class="champ-creep">${iconTag(w.icon, 'champ-icon', 'ph-skull')}${esc(w.name)}</span></td>
                <td><span class="game-cost"><i class="ph ph-coins" aria-hidden="true"></i>${fmt(w.gold)}</span></td>
                <td class="champ-stack">${w.stack ? '+' + fmt(w.stack) : '–'}</td>
                <td class="champ-total">${fmt(w.gold + w.stack)}</td>
                <td>${w.hp ? '+' + fmt(w.hp) : '–'}${w.dmg ? ` <span class="champ-extra">ดาเมจ +${fmt(w.dmg)}</span>` : ''}</td>
            </tr>` : `
            <tr class="champ-off">
                <td class="champ-wave"><span class="wave-no"><small>เวฟ</small>${w.wave}</span></td>
                <td><span class="champ-creep">${iconTag(w.icon, 'champ-icon', 'ph-skull')}${esc(w.name)}</span></td>
                <td colspan="4">เวฟบอส ท้าไม่ได้</td>
            </tr>`).join('');
        return `
        <div class="champ-cols">
            <div>
                <h3 class="game-sub" style="margin-top: 0;"><i class="ph ph-sword" aria-hidden="true"></i> กติกา</h3>
                <ul class="shop-bullets">${c.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
            </div>
            <div>
                <h3 class="game-sub" style="margin-top: 0;"><i class="ph ph-skull" aria-hidden="true"></i> แชมเปี้ยนได้เพิ่มทุกตัว</h3>
                <ul class="shop-bullets">${c.buffs.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
            </div>
        </div>

        <h3 class="game-sub"><i class="ph ph-coins" aria-hidden="true"></i> ทองแต่ละเวฟ</h3>
        <div class="lumber-wrap">
            <table class="lumber-table champ-table">
                <thead><tr>
                    <th>เวฟ</th><th>ครีป</th><th>ทองจากการท้า</th>
                    <th>โบนัส stack</th><th>รวม</th><th>HP แชมเปี้ยนเพิ่ม</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <p class="game-note">โบนัส stack ในตารางคิดแบบท้าติดกันมาตั้งแต่เวฟ 1 ไม่เคยข้าม ถ้าเริ่มท้าทีหลัง stack จะนับจากเวฟที่เริ่ม</p>`;
    };

    /* ── Wisp & Tree ── */
    const renderWisp = (w) => {
        const g = w.gather || { per: 0, every: 0 };
        const perMin = (n) => (g.every ? Math.round((n * 60) / g.every * 10) / 10 : 0);
        let total = 0;
        const rows = w.lumber.levels.map((l) => {
            total += l.add;
            return `<tr>
                <td>${l.level}</td>
                <td><span class="game-cost"><i class="ph ph-coins" aria-hidden="true"></i>${fmt(l.gold)}</span></td>
                <td><span class="game-cost game-cost-lumber"><i class="ph ph-tree" aria-hidden="true"></i>${fmt(l.lumber)}</span></td>
                <td>${l.time} วิ</td>
                <td class="lumber-total">+${total}</td>
                <td><strong>${g.per + total}</strong> <span class="lumber-min">(${perMin(g.per + total)}/นาที)</span></td>
            </tr>`;
        }).join('');
        return `
        <div class="game-hero">
            ${iconTag(w.icon, 'game-hero-icon', 'ph-sparkle')}
            <div>
                <h3 class="game-hero-name">${esc(w.name)}</h3>
                <p class="game-hero-sub">${esc(w.desc)}</p>
            </div>
        </div>
        <div class="unit-stat-grid">
            ${stat('เก็บไม้เริ่มต้น', g.per ? `${g.per} ไม้ ทุก ${g.every} วิ` : '', 'ph-tree')}
            ${stat('เฉลี่ยต่อนาที', g.per ? `${perMin(g.per)} ไม้/นาที ต่อตัว` : '', 'ph-timer')}
            ${stat('ราคา', `${fmt(w.gold)} ทอง`, 'ph-coins')}
            ${stat('พลังชีวิต', fmt(w.hp), 'ph-heart')}
            ${stat('ความเร็วเดิน', w.move, 'ph-sneaker-move')}
        </div>
        ${w.skills.map(skill).join('')}
        ${w.cap ? `<ul class="shop-bullets" style="margin-top: var(--space-200);">
            <li>Wisp ทุกตัวเก็บไม้ได้ตั้งแต่ซื้อ ตัวละ ${g.per} ไม้ทุก ${g.every} วินาที ยิ่งมีหลายตัวยิ่งได้มาก</li>
            <li>งานวิจัยเก็บไม้แต่ละขั้นเพิ่มให้ Wisp ทุกตัวเก็บได้อีก +1 ไม้ต่อรอบ</li>
            <li>เพดานไม้ = ${w.cap.per} × (จำนวน Wisp + ขั้นวิจัยเก็บไม้) ขั้นต่ำ ${w.cap.min} ไม้ที่เกินเกมจะตัดทิ้งตอนจบเวฟ</li>
        </ul>` : ''}

        <h3 class="game-sub"><i class="ph ph-tree" aria-hidden="true"></i> ${esc(w.lumber.name.replace(/\s*\d+$/, ''))}</h3>
        <p class="game-note" style="margin-top: 0;">${esc(w.lumber.desc)} · ในแมพนี้ไม้เรียกว่า tree</p>
        <div class="lumber-wrap">
            <table class="lumber-table">
                <thead><tr><th>ขั้น</th><th>ทอง</th><th>ไม้</th><th>เวลาวิจัย</th><th>เก็บไม้เพิ่มรวม</th><th>ไม้ต่อรอบ ต่อ Wisp</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    };

    const show = (el, html) => {
        if (!el) return;
        el.innerHTML = html;
        el.hidden = false;
        const fallback = el.parentElement.querySelector('.empty-state');
        if (fallback) fallback.hidden = true;
    };

    fetch('../assets/data/game.json?v=2b206317')
        .then((r) => r.json())
        .then((g) => {
            show(creepEl, renderCreeps(g.creeps));
            show(kingEl, renderKing(g.king));
            if (kingEl) bindKingToggle(kingEl);
            show(wispEl, renderWisp(g.wisp));
            if (g.champion) show(champEl, renderChampion(g.champion));
            document.querySelectorAll('[data-game-version]').forEach((el) => { el.textContent = g.version; });
        })
        .catch(() => { /* โหลดไม่ได้ ปล่อยกล่องเดิมไว้ */ });
})();
