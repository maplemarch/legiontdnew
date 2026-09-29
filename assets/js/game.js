/* game.js — แท็บ Creep, King และ Wisp & Tree ในหน้า Wiki
   ข้อมูลมาจาก assets/data/game.json ซึ่ง tools/build-game.js สร้างจากไฟล์แมพ
   ถ้าโหลดไม่ได้ กล่อง "กำลังรวบรวมข้อมูล" เดิมยังแสดงอยู่ตามปกติ
   สลับภาษาแล้ว (langchange) วาดใหม่ทั้งหมดจากข้อมูลที่โหลดไว้ */
(function () {
    const creepEl = document.getElementById('creep-data');
    const damageEl = document.getElementById('damage-data');
    const kingEl = document.getElementById('king-data');
    const champEl = document.getElementById('champion-data');
    const wispEl = document.getElementById('wisp-data');
    if (!creepEl && !damageEl && !kingEl && !wispEl && !champEl) return;

    const t = (th, en) => (window.LTD_I18N ? window.LTD_I18N.t(th, en) : th);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmt = (n) => (n === '' || n == null ? '' : Number(n).toLocaleString('en-US'));

    // สีตามที่เกมใช้ประกาศชนิดโจมตีและเกราะก่อนเริ่มเวฟ (ปรับสีเข้มบางตัวให้อ่านออกบนพื้นมืด)
    const TYPE_CLASS = {
        Piercing: 'pierce', Normal: 'normal', Magic: 'magic', Siege: 'siege', Chaos: 'chaos',
        Light: 'light', Medium: 'medium', Heavy: 'heavy', Fortified: 'fort', Unarmored: 'unarmored', Enchanted: 'enchanted',
    };
    const typeTag = (type, kind) => type
        ? `<span class="type-tag type-${TYPE_CLASS[type] || 'normal'}"><i class="ph ${kind === 'atk' ? 'ph-sword' : 'ph-shield'}" aria-hidden="true"></i>${esc(type)}</span>`
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

    const sec = () => t('วินาที', 's');
    const perSec = () => t('/วินาที', '/s');

    /* ── ครีป ── */
    const unitStats = (u) => [
        stat(t('ระยะโจมตี', 'Attack Range'), u.range, 'ph-arrows-out-line-horizontal'),
        stat(t('ความเร็วโจมตี', 'Attack Speed'), u.speed ? `${u.speed} ${sec()}` : '', 'ph-lightning'),
        stat(t('ความเร็วเคลื่อนที่', 'Move Speed'), u.move, 'ph-sneaker-move'),
        stat(t('ฟื้นพลังชีวิต', 'HP Regen'), +u.regen ? `${u.regen}${perSec()}` : '', 'ph-heartbeat'),
    ].join('');

    const waveRow = (c) => {
        const waveGold = c.count * c.bounty; // ทองที่ได้ถ้าฆ่าครบทั้งเลน
        const tag = c.boss ? `<span class="wave-flag wave-flag-boss">${t('บอส', 'Boss')}</span>` : '';
        return `
        <details class="wave${c.boss ? ' wave-boss' : ''}">
            <summary class="wave-sum">
                <span class="wave-no"><small>${t('เวฟ', 'Wave')}</small>${c.wave}</span>
                ${iconTag(c.icon, 'wave-icon', c.boss ? 'ph-crown-simple' : 'ph-skull')}
                <span class="wave-main">
                    <span class="wave-name">${esc(c.name)} ${tag}</span>
                    <span class="wave-types">${typeTag(c.atkType, 'atk')}${typeTag(c.defType, 'def')}</span>
                </span>
                <span class="wave-nums">
                    <span class="wave-num" title="${t('จำนวนต่อเลน', 'Count per lane')}"><i class="ph ph-users-three" aria-hidden="true"></i>×${fmt(c.count)}</span>
                    <span class="wave-num wave-gold" title="${t('ทองต่อตัว', 'Gold per unit')}"><i class="ph ph-coins" aria-hidden="true"></i>${c.bounty ? '+' + c.bounty : '–'}</span>
                    <span class="wave-num wave-gold" title="${t('โบนัสจบเวฟ', 'Wave clear bonus')}"><i class="ph ph-flag-checkered" aria-hidden="true"></i>${c.finish ? '+' + fmt(c.finish) : '–'}</span>
                    <span class="wave-num wave-gold" title="${t('มูลค่าเวฟ (จำนวน × ทองต่อตัว)', 'Wave value (count × gold per unit)')}"><i class="ph ph-scales" aria-hidden="true"></i>${waveGold ? fmt(waveGold) : '–'}</span>
                    <span class="wave-num" title="${t('Value แนะนำ ค่ายูนิตที่ควรมีเพื่อรับเวฟนี้ (ที่เกมแสดงเป็น Value: ตอนประกาศเวฟ)', 'Recommended value: the unit value you should have to hold this wave (shown in game as Value:)')}"><i class="ph ph-thumbs-up" aria-hidden="true"></i>${c.value ? fmt(c.value) : '–'}</span>
                    <span class="wave-num" title="${t('Valuekick ค่ายูนิตขั้นต่ำ ต่ำกว่านี้เกมเตะออกอัตโนมัติ', 'Valuekick: minimum unit value, below this the game kicks you automatically')}"><i class="ph ph-sneaker" aria-hidden="true"></i>${c.kick ? fmt(c.kick) : '–'}</span>
                </span>
                <i class="ph ph-caret-down wave-caret" aria-hidden="true"></i>
            </summary>
            <div class="wave-body">
                <div class="unit-stat-grid">
                    ${stat(t('พลังชีวิต', 'HP'), fmt(c.hp), 'ph-heart')}
                    ${stat(t('พลังโจมตี', 'Damage'), c.dmg, 'ph-crosshair')}
                    ${stat(t('เกราะ', 'Armor'), c.armor, 'ph-shield-check')}
                    ${unitStats(c)}
                </div>
                ${c.skills.length ? `<h4 class="unit-detail-sub"><i class="ph ph-magic-wand" aria-hidden="true"></i> ${t('สกิล', 'Skills')}</h4>${c.skills.map(skill).join('')}` : ''}
            </div>
        </details>`;
    };

    const renderCreeps = (creeps) => `
        <p class="game-mode"><i class="ph ph-sliders-horizontal" aria-hidden="true"></i>
            ${t(`ข้อมูลตามโหมด <code>-prmiccahx2</code> · เกมจบที่เวฟ ${creeps.length} · เวฟ 10 และ 20 ได้ทองจบเวฟสองเท่า`,
                `Data for mode <code>-prmiccahx2</code> · The game ends at wave ${creeps.length} · Waves 10 and 20 pay double wave clear gold`)}</p>
        <div class="wave-head" aria-hidden="true">
            <span>${t('เวฟ', 'Wave')}</span><span></span><span>${t('ครีป', 'Creep')}</span>
            <span>${t('จำนวน/เลน', 'Count/lane')}</span><span>${t('ทอง/ตัว', 'Gold/unit')}</span><span>${t('โบนัสจบเวฟ', 'Wave clear bonus')}</span><span>${t('มูลค่าเวฟ', 'Wave value')}</span><span>${t('Value แนะนำ', 'Rec. value')}</span><span>Valuekick</span><span></span>
        </div>
        <div class="wave-list">${creeps.map(waveRow).join('')}</div>
        <p class="game-note">${t('กดที่แถวเพื่อดูพลังชีวิต โจมตี เกราะ ความเร็ว และสกิลของครีป · จำนวนคือจำนวนครีปต่อเลนในเวฟนั้น · มูลค่าเวฟคือจำนวน × ทองต่อตัว · Value แนะนำคือค่ายูนิตที่เกมแนะนำให้มีก่อนเวฟนั้น · Valuekick คือค่ายูนิตขั้นต่ำของเวฟนั้น ต่ำกว่านี้เกมเตะออกอัตโนมัติ',
            'Tap a row to see the creep\'s HP, damage, armor, speed and skills · Count is the number of creeps per lane in that wave · Wave value is count × gold per unit · Rec. value is the unit value the game recommends for that wave · Valuekick is the minimum unit value for that wave, below it the game kicks you automatically')}</p>`;

    /* ── ดาเมจตามชนิดโจมตีและเกราะ ── */
    const dmgCell = (pct) => {
        const cls = pct > 100 ? 'dmg-up' : pct < 100 ? 'dmg-down' : 'dmg-even';
        return `<td class="dmg-cell ${cls}">${pct}%</td>`;
    };
    const renderDamage = (d) => `
        <div class="lumber-wrap">
            <table class="lumber-table dmg-table">
                <thead><tr>
                    <th>${t('โจมตี \\ เกราะ', 'Attack \\ Armor')}</th>${d.armor.map((a) => `<th>${typeTag(a, 'def')}</th>`).join('')}
                </tr></thead>
                <tbody>${d.attack.map((a) => `<tr><th scope="row">${typeTag(a.name, 'atk')}</th>${a.pct.map(dmgCell).join('')}</tr>`).join('')}</tbody>
            </table>
        </div>
        <p class="game-note">${t('ตัวเลขคือดาเมจที่ทำได้จริงเทียบกับดาเมจปกติ เช่น Piercing ตี Light ได้ 145% · ค่าจากไฟล์แมพ (war3mapMisc) · Chaos แมพไม่ได้แก้ จึงเป็น 100% ทุกเกราะ',
            'Numbers are the damage actually dealt compared with normal damage, e.g. Piercing hits Light for 145% · Values from the map file (war3mapMisc) · The map doesn\'t change Chaos, so it is 100% against every armor')}</p>`;

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
        const baseNote = t('ค่าตอนเริ่มเกม ยังไม่ได้ซื้ออัปเกรด · กดอัปเต็มเพื่อดูค่าเมื่อซื้อครบทุกเลเวล',
            'Starting values, no upgrades bought · Press Maxed to see the values with every level bought');
        const maxNote = t(`HP ${m.levels.hp} เลเวล (+${fmt(m.hp)}) · Attack ${m.levels.atk} เลเวล (+${fmt(m.dmg)}) · Regeneration ${m.levels.regen} เลเวล (+${fmt(m.regen)}/วินาที) · ยังไม่รวม Presence และสกิลของ King`,
            `HP ${m.levels.hp} levels (+${fmt(m.hp)}) · Attack ${m.levels.atk} levels (+${fmt(m.dmg)}) · Regeneration ${m.levels.regen} levels (+${fmt(m.regen)}/s) · Not including Presence or King skills`);
        return `
        <p class="game-note king-max-note"
            data-base="${esc(baseNote)}"
            data-max="${esc(maxNote)}">${esc(baseNote)}</p>
        <div class="unit-stat-grid">
            ${swap(t('พลังชีวิต', 'HP'), fmt(k.hp), fmt(+k.hp + m.hp), 'ph-heart')}
            ${swap(t('ฟื้นพลังชีวิต', 'HP Regen'), `${k.regen}${perSec()}`, `${fmt(+k.regen + m.regen)}${perSec()}`, 'ph-heartbeat')}
            ${swap(t('พลังโจมตี', 'Damage'), k.dmg, `${fmt(lo + m.dmg)}-${fmt(hi + m.dmg)}`, 'ph-crosshair')}
            ${stat(t('มานา', 'Mana'), fmt(k.mana), 'ph-drop')}
            ${stat(t('เกราะ', 'Armor'), k.armor, 'ph-shield-check')}
            ${stat(t('ความเร็วโจมตี', 'Attack Speed'), `${k.speed} ${sec()}`, 'ph-lightning')}
            ${stat(t('ระยะโจมตี', 'Attack Range'), k.range, 'ph-arrows-out-line-horizontal')}
        </div>`;
    };

    // จำชุดค่าที่เลือกไว้ วาดใหม่ตอนสลับภาษาแล้วยังอยู่ชุดเดิม
    let kingMode = 'base';
    const setKingMode = (root, mode) => {
        kingMode = mode;
        root.querySelectorAll('.king-toggle-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.king === mode)));
        root.querySelectorAll('.king-swap .unit-stat-value').forEach((v) => { v.textContent = v.dataset[mode]; });
        root.querySelectorAll('.king-swap').forEach((s) => s.classList.toggle('is-max', mode === 'max'));
        // เปลี่ยนแค่ข้อความ บรรทัดนี้มีอยู่ตลอด หน้าจึงไม่ขยับตอนสลับ
        const note = root.querySelector('.king-max-note');
        if (note) note.textContent = note.dataset[mode];
    };

    // ผูกครั้งเดียวที่กล่องนอก ปุ่มข้างในวาดใหม่ได้โดยไม่ต้องผูกซ้ำ
    const bindKingToggle = (root) => {
        root.addEventListener('click', (e) => {
            const btn = e.target.closest('.king-toggle-btn');
            if (btn) setKingMode(root, btn.dataset.king);
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
            <p class="shop-summary">${esc(t(p.summary, p.summaryEn))}</p>
            <ul class="shop-bullets">${t(p.bullets, p.bulletsEn).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        </article>`;

    // ตารางค่าสกิล แถวคือค่าแต่ละอย่าง คอลัมน์คือช่วงเวฟที่เกมปรับเลเวลให้
    const kingSkill = (s) => `
        <article class="shop-card">
            <div class="shop-head">
                ${iconTag(s.icon, 'shop-icon', 'ph-lightning')}
                <div>
                    <div class="shop-name">${esc(s.name)}</div>
                    <div class="shop-costs"><span class="game-cost game-cost-max">${t('โหวตครั้งละ', 'Per vote')}</span>${cost(s)}</div>
                </div>
            </div>
            <p class="shop-summary">${esc(t(s.summary, s.summaryEn))}</p>
            <div class="lumber-wrap">
                <table class="lumber-table skill-table">
                    <thead><tr><th>${t('เวฟ', 'Wave')}</th>${s.stages.map((st) => `<th>${esc(st.waves)}</th>`).join('')}</tr></thead>
                    <tbody>${s.stages[0].values.map((v, i) => `
                        <tr><th scope="row">${esc(t(v.label, v.labelEn))}</th>${s.stages.map((st) => `<td>${esc(t(st.values[i].value, st.values[i].valueEn) || '–')}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </div>
            ${s.unknownFrom ? `<p class="game-note" style="margin-top: 0;">${t(`เวฟ ${esc(s.unknownFrom)} เกมขึ้นเป็นเลเวล 5 แต่ไฟล์แมพไม่มีค่าของเลเวลนี้`, `In waves ${esc(s.unknownFrom)} the game raises it to level 5, but the map file has no values for that level`)}</p>` : ''}
        </article>`;

    const renderKing = (k) => `
        <div class="game-hero">
            ${iconTag(k.icon, 'game-hero-icon', 'ph-crown-simple')}
            <div>
                <h3 class="game-hero-name">${esc(k.name)}</h3>
                <p class="game-hero-sub">${t('ตัวที่ต้องปกป้อง ครีปที่หลุดเลนจะเดินมาตี King', 'The unit you must protect. Creeps that leak from a lane walk over to attack the King')}</p>
            </div>
            <div class="king-toggle" role="group" aria-label="${t('เลือกชุดค่าของ King', 'Choose King stat set')}">
                <button type="button" class="king-toggle-btn" data-king="base" aria-pressed="true">${t('ค่าเริ่มเกม', 'Starting')}</button>
                <button type="button" class="king-toggle-btn" data-king="max" aria-pressed="false">
                    <i class="ph ph-crown-simple" aria-hidden="true"></i> ${t('อัปเต็ม', 'Maxed')}
                </button>
            </div>
        </div>
        ${kingStats(k)}

        <h3 class="game-sub"><i class="ph ph-arrow-fat-up" aria-hidden="true"></i> ${t('อัปเกรด King', 'King Upgrades')}</h3>
        <div class="shop-grid">
            ${k.upgrades.map((u) => `
                <article class="shop-card">
                    <div class="shop-head">
                        ${iconTag(u.items[0].icon, 'shop-icon', 'ph-arrow-fat-up')}
                        <div>
                            <div class="shop-name">${esc(u.name)}</div>
                            <div class="shop-costs"><span class="game-cost game-cost-max">${t(`สูงสุด ${u.max} เลเวล`, `Max ${u.max} levels`)}</span></div>
                        </div>
                    </div>
                    <p class="shop-desc">${esc(u.items[0].desc)}</p>
                    <div class="shop-options">${u.items.map((i) => `
                        <div class="shop-option">
                            <span>${/x5/i.test(i.name) ? t('ซื้อทีละ 5 เลเวล', 'Buy 5 levels at a time') : t('ซื้อทีละ 1 เลเวล', 'Buy 1 level at a time')}</span>
                            <span class="shop-costs">${cost(i)}</span>
                        </div>`).join('')}
                    </div>
                </article>`).join('')}
        </div>

        <h3 class="game-sub"><i class="ph ph-sparkle" aria-hidden="true"></i> Presence <small>${t('เลือกได้ 1 แบบ', 'Pick 1')}</small></h3>
        <div class="shop-grid shop-grid-2">${k.presence.map(presenceCard).join('')}</div>

        <h3 class="game-sub"><i class="ph ph-hand-pointing" aria-hidden="true"></i> ${t('สกิลของ King', 'King Skills')} <small>${t('ทีมโหวตเลือก เลเวลขึ้นเองตามเวฟ', 'Chosen by team vote, levels up automatically with the waves')}</small></h3>
        <div class="shop-grid shop-grid-2">${k.skills.map(kingSkill).join('')}</div>`;

    /* ── Challenge Champion ── */
    const renderChampion = (c) => {
        const waveNo = (w) => `<td class="champ-wave"><span class="wave-no"><small>${t('เวฟ', 'Wave')}</small>${w.wave}</span></td>`;
        const rows = c.waves.map((w) => w.can ? `
            <tr>
                ${waveNo(w)}
                <td><span class="champ-creep">${iconTag(w.icon, 'champ-icon', 'ph-skull')}${esc(w.name)}</span></td>
                <td><span class="game-cost"><i class="ph ph-coins" aria-hidden="true"></i>${fmt(w.gold)}</span></td>
                <td class="champ-stack">${w.stack ? '+' + fmt(w.stack) : '–'}</td>
                <td class="champ-total">${fmt(w.gold + w.stack)}</td>
                <td>${w.hp ? '+' + fmt(w.hp) : '–'}${w.dmg ? ` <span class="champ-extra">${t('ดาเมจ', 'Damage')} +${fmt(w.dmg)}</span>` : ''}</td>
            </tr>` : `
            <tr class="champ-off">
                ${waveNo(w)}
                <td><span class="champ-creep">${iconTag(w.icon, 'champ-icon', 'ph-skull')}${esc(w.name)}</span></td>
                <td colspan="4">${t('เวฟบอส ท้าไม่ได้', 'Boss wave, cannot challenge')}</td>
            </tr>`).join('');
        return `
        <div class="champ-cols">
            <div>
                <h3 class="game-sub" style="margin-top: 0;"><i class="ph ph-sword" aria-hidden="true"></i> ${t('กติกา', 'Rules')}</h3>
                <ul class="shop-bullets">${t(c.bullets, c.bulletsEn).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
            </div>
            <div>
                <h3 class="game-sub" style="margin-top: 0;"><i class="ph ph-skull" aria-hidden="true"></i> ${t('แชมเปี้ยนได้เพิ่มทุกตัว', 'Every Champion gets')}</h3>
                <ul class="shop-bullets">${t(c.buffs, c.buffsEn).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
            </div>
        </div>

        <h3 class="game-sub"><i class="ph ph-coins" aria-hidden="true"></i> ${t('ทองแต่ละเวฟ', 'Gold per wave')}</h3>
        <div class="lumber-wrap">
            <table class="lumber-table champ-table">
                <thead><tr>
                    <th>${t('เวฟ', 'Wave')}</th><th>${t('ครีป', 'Creep')}</th><th>${t('ทองจากการท้า', 'Challenge gold')}</th>
                    <th>${t('โบนัส stack', 'Stack bonus')}</th><th>${t('รวม', 'Total')}</th><th>${t('HP แชมเปี้ยนเพิ่ม', 'Champion bonus HP')}</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <p class="game-note">${t('โบนัส stack ในตารางคิดแบบท้าติดกันมาตั้งแต่เวฟ 1 ไม่เคยข้าม ถ้าเริ่มท้าทีหลัง stack จะนับจากเวฟที่เริ่ม',
            'The stack bonus in this table assumes you challenged every wave in a row from wave 1. If you start later, the stack counts from the wave you started')}</p>`;
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
                <td>${l.time} ${t('วิ', 's')}</td>
                <td class="lumber-total">+${total}</td>
                <td><strong>${g.per + total}</strong> <span class="lumber-min">(${perMin(g.per + total)}${t('/นาที', '/min')})</span></td>
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
            ${stat(t('เก็บไม้เริ่มต้น', 'Base harvest'), g.per ? t(`${g.per} ไม้ ทุก ${g.every} วิ`, `${g.per} lumber every ${g.every} s`) : '', 'ph-tree')}
            ${stat(t('เฉลี่ยต่อนาที', 'Average per minute'), g.per ? t(`${perMin(g.per)} ไม้/นาที ต่อตัว`, `${perMin(g.per)} lumber/min per Wisp`) : '', 'ph-timer')}
            ${stat(t('ราคา', 'Cost'), t(`${fmt(w.gold)} ทอง`, `${fmt(w.gold)} gold`), 'ph-coins')}
            ${stat(t('พลังชีวิต', 'HP'), fmt(w.hp), 'ph-heart')}
            ${stat(t('ความเร็วเคลื่อนที่', 'Move Speed'), w.move, 'ph-sneaker-move')}
        </div>
        ${w.skills.map(skill).join('')}
        ${w.cap ? `<ul class="shop-bullets" style="margin-top: var(--space-200);">
            <li>${t(`Wisp ทุกตัวเก็บไม้ได้ตั้งแต่ซื้อ ตัวละ ${g.per} ไม้ทุก ${g.every} วินาที ยิ่งมีหลายตัวยิ่งได้มาก`,
                `Every Wisp harvests from the moment it is bought, ${g.per} lumber every ${g.every} seconds each. More Wisps means more lumber`)}</li>
            <li>${t('งานวิจัยเก็บไม้แต่ละขั้นเพิ่มให้ Wisp ทุกตัวเก็บได้อีก +1 ไม้ต่อรอบ', 'Each lumber research level gives every Wisp +1 lumber per cycle')}</li>
            <li>${t(`เพดานไม้ = ${w.cap.per} × (จำนวน Wisp + ขั้นวิจัยเก็บไม้) ขั้นต่ำ ${w.cap.min} ไม้ที่เกินเกมจะตัดทิ้งตอนจบเวฟ`,
                `Lumber cap = ${w.cap.per} × (Wisps + lumber research levels), minimum ${w.cap.min}. Lumber over the cap is removed at the end of the wave`)}</li>
        </ul>` : ''}

        <h3 class="game-sub"><i class="ph ph-tree" aria-hidden="true"></i> ${esc(w.lumber.name.replace(/\s*\d+$/, ''))}</h3>
        <p class="game-note" style="margin-top: 0;">${esc(w.lumber.desc)} · ${t('ในแมพนี้ไม้เรียกว่า tree', 'In this map lumber is called tree')}</p>
        <div class="lumber-wrap">
            <table class="lumber-table">
                <thead><tr><th>${t('ขั้น', 'Level')}</th><th>${t('ทอง', 'Gold')}</th><th>${t('ไม้', 'Lumber')}</th><th>${t('เวลาวิจัย', 'Research time')}</th><th>${t('เก็บไม้เพิ่มรวม', 'Total extra harvest')}</th><th>${t('ไม้ต่อรอบ ต่อ Wisp', 'Lumber per cycle, per Wisp')}</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    };

    // รอบวาดใหม่ตอนสลับภาษา ติด data-revealed ให้ของที่สร้างใหม่ก่อน MutationObserver ของ reveal.js ทำงาน
    // ของจะแสดงทันที ไม่เล่นอนิเมชันเลื่อนขึ้นซ้ำ (reveal.js ข้ามตัวที่มี data-revealed)
    const REVEAL = '.card, .file-row, .contact-card, .unit-card, .wave, .shop-card, .unit-stat, .lumber-wrap, .map-card';
    let quiet = false;
    const show = (el, html) => {
        if (!el) return;
        el.innerHTML = html;
        if (quiet) el.querySelectorAll(REVEAL).forEach((n) => { n.dataset.revealed = '1'; });
        el.hidden = false;
        const fallback = el.parentElement.querySelector('.empty-state');
        if (fallback) fallback.hidden = true;
    };

    let data = null;
    const renderAll = (g) => {
        if (g.damage) show(damageEl, renderDamage(g.damage));
        // เวฟที่เปิดดูอยู่ เปิดค้างไว้เหมือนเดิมหลังวาดใหม่
        const open = creepEl ? Array.from(creepEl.querySelectorAll('.wave'), (d) => d.open) : [];
        show(creepEl, renderCreeps(g.creeps));
        if (creepEl) creepEl.querySelectorAll('.wave').forEach((d, i) => { if (open[i]) d.open = true; });
        show(kingEl, renderKing(g.king));
        if (kingEl && kingMode !== 'base') setKingMode(kingEl, kingMode);
        show(wispEl, renderWisp(g.wisp));
        if (g.champion) show(champEl, renderChampion(g.champion));
        document.querySelectorAll('[data-game-version]').forEach((el) => { el.textContent = g.version; });
    };

    fetch('../assets/data/game.json?v=320c23b6')
        .then((r) => r.json())
        .then((g) => {
            data = g;
            renderAll(g);
            if (kingEl) bindKingToggle(kingEl);
        })
        .catch(() => { /* โหลดไม่ได้ ปล่อยกล่องเดิมไว้ */ });

    document.addEventListener('langchange', () => {
        if (!data) return;
        quiet = true;
        renderAll(data);
        quiet = false;
    });
})();
