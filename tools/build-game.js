/* build-game.js — สร้าง assets/data/game.json (ครีปแต่ละเวฟ, King, Wisp & Tree) จากไฟล์ที่แตกออกมาจากแมพ
 *
 * วิธีใช้:
 *   1) แตกแมพ .w3x ด้วย MPQ Editor ลง w3x/Work (อยู่ใน .gitignore)
 *   2) node tools/build-game.js [โฟลเดอร์ที่แตกไว้]
 *   3) node tools/bust-cache.js
 *
 * ค่ายูนิตอ่านจาก Units\*.slk ส่วนลำดับเวฟ จำนวนครีป และเงินต่อตัว อ่านจากสคริปต์เกม Scripts\war3map.j
 * ถ้าแมพเวอร์ชันใหม่เปลี่ยนชื่อตัวแปรในสคริปต์ สคริปต์นี้จะหยุดและบอกว่าหาอะไรไม่เจอ
 */

const fs = require('fs');
const path = require('path');
const { clean, stripCodes, num, cap, iconResolver, loadMap, damageOf } = require('./lib/w3');

const ROOT = process.cwd();
const SRC = path.resolve(process.argv[2] || 'w3x/Work');
const OUT = path.join(ROOT, 'assets/data/game.json');
const iconFor = iconResolver(path.join(ROOT, 'assets/img/units'));
const map = loadMap(SRC);
const { balance, weapons, abilities, upgrades, unitStr, upgradeStr, abilStr } = map;

const jassFile = [path.join(SRC, 'Scripts/war3map.j'), path.join(SRC, 'war3map.j')].find(fs.existsSync);
if (!jassFile) throw new Error('ไม่เจอ war3map.j');
// สคริปต์ในแมพจริงขึ้นบรรทัดปนกันทั้ง CR อย่างเดียวและ LF ทำให้เป็น LF ก่อน regex ด้านล่างจะได้ใช้ได้ทุกแบบ
const J = fs.readFileSync(jassFile, 'latin1').replace(/\r\n?/g, '\n');

/* ชื่อฟังก์ชันในสคริปต์ที่ถูก optimizer ตั้งชื่อสั้นให้ ถ้าแมพเวอร์ชันใหม่เปลี่ยนชื่อ ให้แก้ตรงนี้
   - WAVE_FUNC     ตั้งค่าเวฟชุดที่เกมใช้จริงตอนเริ่มแมพ (จำนวนครีปต่อเลน ทองต่อตัว ชนิดโจมตี/เกราะ)
                   ในสคริปต์มีอีกชุด (D0E) ที่ใช้เฉพาะบางเงื่อนไข ไม่ใช่เกมปกติ
   - MODE_PR_FUNC  โหมด pr (Prophet Random) ของ -prmiccahx2 กำหนดทองจบเวฟ
   - LAST_WAVE     เกมจบที่เวฟ 20 (หลังเวฟ 20 เป็น Arena ตัดสินผล) */
const WAVE_FUNC = 'DIE';
const MODE_PR_FUNC = 'RKX';
const LAST_WAVE = 20;

const need = (v, what) => { if (v === undefined || v === null) throw new Error('หาในสคริปต์ไม่เจอ: ' + what); return v; };
const csv = (s) => s.split(',').slice(1); // ทุกลิสต์ในสคริปต์ขึ้นต้นด้วยจุลภาค
const funcBody = (name) => {
    const i = need(J.indexOf(`function ${name} takes`) >= 0 ? J.indexOf(`function ${name} takes`) : null, name);
    return J.slice(i, J.indexOf('endfunction', i));
};
const waveCfg = funcBody(WAVE_FUNC);
const strVar = (name) => need(waveCfg.match(new RegExp(`set ${name}="([^"]*)"`)), name)[1];
const missingIcons = new Set();
const icon = (art) => {
    const hit = iconFor(art);
    if (!hit && art) missingIcons.add(path.win32.basename(art.split(',')[0]));
    return hit;
};

/* ── ค่าของยูนิตหนึ่งตัวในรูปแบบเดียวกับ units.json ── */
function unitInfo(id) {
    const b = need(balance[id], 'ยูนิต ' + id), w = weapons[id] || {}, s = unitStr[id] || {};
    const skills = [];
    const list = [abilities[id]?.abilList, abilities[id]?.heroAbilList].join(',').split(',').map((x) => x.trim()).filter(Boolean);
    for (const a of list) {
        const st = abilStr[a];
        if (!st) continue;
        const name = clean(st.Name || st.Tip), desc = clean(st.Ubertip || st.Researchubertip);
        if (!name || !desc || skills.some((k) => k.name === name)) continue;
        skills.push({ name, desc, icon: icon(st.Art) });
    }
    return {
        id,
        name: clean(s.Name),
        icon: icon(s.Art),
        hp: num(b.HP),
        regen: num(b.regenHP),
        mana: num(b.manaN),
        armor: num(b.def),
        def: b.defType || '',
        move: num(b.spd),
        dmg: damageOf(w),
        speed: num(w.cool1),
        range: num(w.rangeN1),
        atk: cap(w.atkType1),
        skills,
    };
}

/* ── ครีป ────────────────────────────────────────────── */
const waveIds = [...funcBody('DAE').matchAll(/set WV\[EE\]='(\w{4})'/g)].map((m) => m[1]);
need(waveIds.length || null, 'รายชื่อครีป (WV)');

const counts = csv(strVar('ZX')).map((v) => parseInt(v, 10));
const bounty = csv(strVar('VO')).map((v) => parseInt(v, 10) || 0);
const value = {};
for (const m of funcBody('DRE').matchAll(/set QC\[(\d+)\]="(\d+)"/g)) value[m[1]] = +m[2];

// ชนิดโจมตีและเกราะที่เกมประกาศก่อนเริ่มเวฟ (ลิสต์เลขเวฟแยกตามชนิด)
const typeOf = (lists) => {
    const out = {};
    for (const [label, name] of lists) for (const w of csv(strVar(name))) out[parseInt(w, 10)] = label;
    return out;
};
const atkLabel = typeOf([['Piercing', 'GX'], ['Normal', 'HX'], ['Magic', 'JX'], ['Siege', 'KX'], ['Chaos', 'LX']]);
const defLabel = typeOf([['Light', 'SX'], ['Medium', 'TX'], ['Heavy', 'UX'], ['Fortified', 'YX'], ['Unarmored', 'VR'], ['Enchanted', 'WX']]);

// ทองจบเวฟของโหมด pr (Prophet Random) เขียนเป็นสูตรลบในสคริปต์ เช่น 35-1
// เวฟ 10 กับ 20 เกมคูณสองให้ตอนจ่าย
const finishGold = {};
for (const m of funcBody(MODE_PR_FUNC).matchAll(/set OO\[(\d+)\]=(\d+)(?:-(\d+))?/g)) {
    const w = +m[1];
    finishGold[w] = (+m[2] - (+m[3] || 0)) * (w === 10 || w === 20 ? 2 : 1);
}

// Kick value ต่อเวฟ ตั้งใน main เป็นลูปช่วงละสูตร เช่น เวฟ 0-10 = 250*i แล้วเวฟ 11 = 455*i
// ค่านี้ใช้เหมือนกันทุกโหมด (ฟังก์ชันอื่นที่ตั้งซ้ำก็ใช้ค่าเดียวกัน)
const kickValue = {};
{
    let i = 0;
    for (const m of funcBody('main').matchAll(/exitwhen i>(\d+)(?:\r\n|\r|\n)set WAVE_KICK_VALUE\[i\]=(\d+)\*i/g)) {
        for (; i <= +m[1]; i += 1) kickValue[i] = i * +m[2];
    }
    need(kickValue[LAST_WAVE] || null, 'WAVE_KICK_VALUE');
}

const creeps = waveIds.slice(0, LAST_WAVE).map((id, i) => {
    const wave = i + 1;
    return {
        wave,
        ...unitInfo(id),
        atkType: atkLabel[wave] || '',
        defType: defLabel[wave] || '',
        count: counts[i] || 0,
        bounty: bounty[i] || 0,
        finish: finishGold[wave] || 0,
        value: value[wave] || 0,
        kick: kickValue[wave] || 0,
        boss: wave % 10 === 0,
    };
});

/* ── King ────────────────────────────────────────────── */
// ของในร้าน King: อัปเกรด ค่าสถานะ, Presence และสกิลสุ่มของ King
const shopItem = (id) => {
    const b = balance[id] || {}, s = unitStr[id] || {};
    return {
        id,
        name: clean(s.Name),
        icon: icon(s.Art),
        lumber: num(b.lumbercost),
        gold: num(b.goldcost),
        desc: clean(s.Ubertip),
    };
};
const maxLevel = (upg) => {
    const scripted = J.match(new RegExp(`SetPlayerTechMaxAllowed\\([^,]+,'${upg}',(\\d+)\\)`));
    return scripted ? +scripted[1] : +(upgrades[upg]?.maxlevel || 0);
};
/* ค่า King เมื่ออัปเกรดเต็ม
   - HP: ร้านใช้ทริก "ใส่แล้วถอด" ความสามารถ King Life (AIml) ที่เลเวลถัดไป
         ได้ HP ถาวร = DataA1 − DataA(เลเวล+1) ต่อการซื้อหนึ่งครั้ง เลเวลเกินสูงสุดจะติดอยู่ที่เลเวลสุดท้าย
   - ดาเมจ: King Damage (AIat) เลเวล = จำนวนครั้งที่ซื้อ บวกงานวิจัย R001 (ratt) อีกเลเวลละ base+mod*(n-1)
   - ฟื้นเลือด: งานวิจัย R002 (rhpr) base+mod*(n-1)
   ค่าเลเวล 5 ขึ้นไปของความสามารถอยู่ใน war3map.w3a เพราะตาราง SLK เก็บได้แค่ 4 เลเวล */
const abilLevels = (id) => {
    const base = map.abilityData[id] || {};
    const out = {};
    for (let lv = 1; lv <= 4; lv++) out[lv] = +base['DataA' + lv] || 0;
    for (const [k, v] of Object.entries(map.w3a[id] || {})) {
        const m = k.match(/@(\d+)$/);
        if (m) out[+m[1]] = +v;
    }
    return out;
};
const upgradeAt = (upg, n) => {
    const u = upgrades[upg] || {};
    return n > 0 ? (+u.base1 || 0) + (+u.mod1 || 0) * (n - 1) : 0;
};
const kingMax = (() => {
    const hpMax = maxLevel('R000'), atkMax = maxLevel('R001'), regenMax = maxLevel('R002');
    const life = abilLevels('A05P');
    const top = Math.max(...Object.keys(life).map(Number));
    let hp = 0;
    for (let n = 1; n <= hpMax; n++) hp += life[1] - life[Math.min(n + 1, top)];
    const dmgLv = abilLevels('A05O');
    const atkTop = Math.max(...Object.keys(dmgLv).map(Number));
    const dmg = dmgLv[Math.min(atkMax, atkTop)] + upgradeAt('R001', atkMax);
    const regen = upgradeAt('R002', regenMax);
    return { hp, dmg, regen, levels: { hp: hpMax, atk: atkMax, regen: regenMax } };
})();

/* สกิลของ King ที่ทีมโหวตเลือก ผู้เล่นไม่ได้อัปเลเวลเอง เกมปรับเลเวลให้ตามเวฟ
   (ฟังก์ชัน After_Wave_Change_Barrack_and_King_States) ค่าตัวเลขอ่านจากตารางความสามารถ
   คำอธิบายในเกมของสกิลพวกนี้เป็นตัวเลขเก่า จึงไม่ใช้ */
const stageWaves = (() => {
    const body = funcBody('After_Wave_Change_Barrack_and_King_States');
    const out = {};
    for (const m of body.matchAll(/if (OE[^\n]*?)then\s*\ncall Change_King_Abilities_level\((\d+)\)/g)) {
        const lo = m[1].match(/OE>=(\d+)/), hi = m[1].match(/OE<=(\d+)/), lt = m[1].match(/OE<(\d+)/);
        const from = lo ? +lo[1] : 1;
        const to = hi ? +hi[1] : lt ? +lt[1] - 1 : LAST_WAVE;
        out[+m[2]] = from === to ? `${from}` : `${from}–${to}`;
    }
    return out;
})();
// ชื่อค่าในตารางสกิลเป็นภาษาอังกฤษ (หน้าเว็บสลับภาษาได้) หน่วย วิ = s
const LABEL_EN = {
    'ดาเมจ': 'Damage', 'สตัน': 'Stun', 'สตันบอส': 'Boss stun', 'รัศมี': 'Radius', 'คูลดาวน์': 'Cooldown',
    'มานา': 'Mana', 'เผาต่อวิ': 'Burn/s', 'ระยะ': 'Range', 'ดาเมจต่อวิ': 'Damage/s', 'มานาต่อวิ': 'Mana/s',
};
const UNIT_EN = { 'วิ': 's' };
const KING_SKILLS = [
    // [ร้านโหวต, รหัสสกิลจริง, [สรุปสั้น ไทย, อังกฤษ], รายการค่าที่แสดง [ชื่อ, ฟิลด์, หน่วย]]
    ['uu9d', 'A022', ['กระแทกพื้น ทำดาเมจและสตันศัตรูทุกตัวรอบ King', 'Slams the ground, damaging and stunning every enemy around the King'], [['ดาเมจ', 'DataA'], ['สตัน', 'Dur', 'วิ'], ['สตันบอส', 'HeroDur', 'วิ'], ['รัศมี', 'Area'], ['คูลดาวน์', 'Cool', 'วิ'], ['มานา', 'Cost']]],
    ['uu9r', 'A982', ['ปล่อยคลื่นพลังเป็นเส้นตรง ทำดาเมจแล้วเผาต่อเนื่อง', 'Fires a shockwave in a straight line that deals damage, then keeps burning'], [['ดาเมจ', 'DataA'], ['เผาต่อวิ', 'DataE'], ['ระยะ', 'Rng'], ['รัศมี', 'Area'], ['คูลดาวน์', 'Cool', 'วิ'], ['มานา', 'Cost']]],
    ['uu1d', 'A01T', ['เผาศัตรูรอบตัวตลอดเวลาที่เปิด กินมานาทุกวินาที', 'Burns nearby enemies while toggled on, draining mana every second'], [['ดาเมจต่อวิ', 'DataA'], ['รัศมี', 'Area'], ['มานาต่อวิ', 'DataB']]],
];
const kingSkills = KING_SKILLS.map(([shop, abil, [summary, summaryEn], fields]) => {
    const row = map.abilityData[abil] || {};
    const st = abilStr[abil] || {};
    const levels = +row.levels || 0;
    const stages = [];
    for (let lv = 1; lv <= levels; lv++) {
        const vals = fields.map(([label, f, unit]) => {
            const raw = row[f + lv] ?? map.w3a[abil]?.[`${f}@${lv}`];
            const v = raw === undefined || raw === '' || raw === '-' ? '' : Math.round(+raw * 10) / 10;
            return {
                label,
                labelEn: LABEL_EN[label] || label,
                value: v === '' ? '' : `${v}${unit ? ' ' + unit : ''}`,
                valueEn: v === '' ? '' : `${v}${unit ? ' ' + (UNIT_EN[unit] || unit) : ''}`,
            };
        });
        // ตาราง SLK เก็บได้ 4 เลเวล ถ้าเลเวลเกินนั้นไม่มีค่าใน war3map.w3a ก็ไม่รู้ค่าจริง ไม่แสดง
        if (vals.every((x) => x.value === '')) continue;
        stages.push({ level: lv, waves: stageWaves[lv] || '', values: vals });
    }
    return {
        ...shopItem(shop),
        name: clean(st.Name) || shopItem(shop).name,
        summary,
        summaryEn,
        stages,
        unknownFrom: stages.length < levels ? stageWaves[stages.length + 1] || '' : '',
    };
});

/* Presence: ทีมต้องซื้อครบจำนวนเลเวลของงานวิจัย (R998/R999) สกิลถึงจะติดตัว King และเลือกได้แบบเดียว
   ตัวเลขที่มีในตารางความสามารถ (มานา คูลดาวน์ ระยะเวลา รัศมี ตัวคูณดาเมจ) อ่านจากแมพ
   กลไกที่สคริปต์ทำเอง (เด้ง ดูดเลือด เผา % เลือด) ไม่มีในตาราง จึงอ้างจากคำอธิบายในเกมและ Patch Notes 2.7 */
function presence() {
    const abil = (id, f) => {
        const v = map.abilityData[id]?.[f + '1'];
        return v === undefined || v === '' ? '' : +v;
    };
    const income = (shop) => {
        const body = J.slice(J.indexOf(`GetUnitTypeId(GetSoldUnit())=='${shop}' then`));
        const m = body.match(/set BI\[[^\]]+\]=BI\[[^\]]+\]\+(\d+)/);
        return m ? +m[1] : 0;
    };
    const buyCount = (upg) => +(upgrades[upg]?.maxlevel || 0);
    // แต่ละข้อเป็นคู่ [ไทย, อังกฤษ] แล้วแยกเป็น bullets กับ bulletsEn
    const common = (shop, upg) => [
        [`ทีมต้องซื้อครบ ${buyCount(upg)} ครั้งสกิลถึงจะใช้ได้ (ครั้งละ ${num(balance[shop]?.lumbercost)} ไม้ ได้ income +${income(shop)})`,
            `The team must buy it ${buyCount(upg)} times before the skill works (${num(balance[shop]?.lumbercost)} lumber each, +${income(shop)} income)`],
        ['เลือกได้ทีมละ 1 Presence ซื้ออันหนึ่งแล้วอีกอันจะซื้อไม่ได้', 'Each team can pick only 1 Presence; buying one locks out the other'],
        ['ติดตัว: ฟื้นมานา 1% ของมานาสูงสุดต่อวินาที', 'Passive: regenerates 1% of max mana per second'],
    ];
    const card = (shop, [summary, summaryEn], list) => ({
        ...shopItem(shop),
        summary,
        summaryEn,
        bullets: list.map((b) => b[0]),
        bulletsEn: list.map((b) => b[1]),
    });
    return [
        card('u99r', ['เผาเลือดศัตรูรอบตัว King เป็น % ของเลือดสูงสุด', 'Burns enemies around the King for a % of their max HP'], [
            ['ศัตรูในรัศมีเสียเลือด 2.5% ของ Max HP ต่อวินาที นาน 10 วินาที', 'Enemies in the radius lose 2.5% of Max HP per second for 10 seconds'],
            ['ลดเลือดได้สูงสุด 25% และไม่ทำให้ตาย (เป้าจะเหลืออย่างน้อย 1%)', 'Removes at most 25% HP and cannot kill (targets keep at least 1%)'],
            [`รัศมี ${abil('A975', 'Area')}`, `Radius ${abil('A975', 'Area')}`],
            [`คูลดาวน์ ${abil('A971', 'Cool')} วินาที · ใช้มานา ${abil('A971', 'Cost')}`, `Cooldown ${abil('A971', 'Cool')} s · ${abil('A971', 'Cost')} mana`],
            ...common('u99r', 'R998'),
        ]),
        card('u99d', ['King ตีแรงขึ้นหลายเท่า ตีเด้งหลายตัว และดูดเลือด', 'The King hits several times harder, bounces between targets and steals life'], [
            [`ดาเมจพื้นฐาน +${Math.round(abil('A969', 'DataA') * 100)}%`, `Base damage +${Math.round(abil('A969', 'DataA') * 100)}%`],
            ['การตีเด้งไปโดนได้ 3 เป้า เป้าที่ 2 รับ 75% เป้าที่ 3 รับ 56%', 'Attacks bounce to 3 targets: the 2nd takes 75%, the 3rd takes 56%'],
            ['ดูดเลือด 45% ของดาเมจที่ทำ', 'Life steal 45% of damage dealt'],
            [`นาน ${abil('A969', 'Dur')} วินาที · คูลดาวน์ ${abil('A969', 'Cool')} วินาที · ใช้มานา ${abil('A969', 'Cost')}`,
                `Lasts ${abil('A969', 'Dur')} s · Cooldown ${abil('A969', 'Cool')} s · ${abil('A969', 'Cost')} mana`],
            ['หลังกดใช้ ให้รอ King ตีครั้งแรกก่อนค่อยเปลี่ยนเป้า', 'After casting, wait for the King\'s first hit before switching targets'],
            ...common('u99d', 'R999'),
        ]),
    ];
}

const king = {
    ...unitInfo('h00K'),
    max: kingMax,
    skills: kingSkills,
    upgrades: [
        { name: 'King Hit Points', max: maxLevel('R000'), items: ['u008', 'u998'].map(shopItem) },
        { name: 'King Attack', max: maxLevel('R001'), items: ['u009', 'u999'].map(shopItem) },
        { name: 'King Regeneration', max: maxLevel('R002'), items: ['u00A', 'u99A'].map(shopItem) },
    ],
    presence: presence(),
};

/* ── Challenge Champion (โหมด cc) ─────────────────────────
   ผู้เล่นกดท้าแชมเปี้ยนก่อนเริ่มเวฟ ครีปตัวหนึ่งในเลนจะกลายเป็นแชมเปี้ยน (Z3E = กดท้า, BGE = สร้างแชมเปี้ยน)
   ได้ทองตามเลขเวฟ และถ้าท้าติดกันทุกเวฟจะได้โบนัส stack เพิ่ม */
const champion = (() => {
    // ทองที่ได้: if OE+1>a and OE<=b then set Gold_Challenge[..]=(OE+1)*m  (OE+1 คือเวฟที่กำลังจะเล่น)
    const goldRules = [...funcBody('Z3E').matchAll(/OE\+1>(\d+) and OE<=(\d+) then\s*\nset Gold_Challenge\[[^\]]+\]=\(OE\+1\)\*(\d+)/g)]
        .map((m) => ({ from: +m[1] + 1, to: +m[2] + 1, mult: +m[3] }));
    const blocked = [...funcBody('Z3E').matchAll(/OE==(\d+) or OE==(\d+) then\s*\ncall DisplayTimedTextToPlayer\(p,0\.,0\.,5\.,"You can't Challenge a Champion on a Boss Wave"\)/g)]
        .flatMap((m) => [+m[1] + 1, +m[2] + 1]);
    const goldFor = (wave) => {
        const r = goldRules.find((g) => wave >= g.from && wave <= g.to);
        return r ? wave * r.mult : 0;
    };
    // แชมเปี้ยนได้ HP เพิ่มตามเวฟ: if OE==x or ... then call UnitAddAbility(BHE,'Axxx')
    const body = funcBody('BGE');
    const hpByWave = {}, dmgByWave = {};
    for (const m of body.matchAll(/((?:OE==\d+(?: or )?)+) then\s*\n((?:call UnitAddAbility\(BHE,'\w{4}'\)\s*\n)+)/g)) {
        const waves = [...m[1].matchAll(/OE==(\d+)/g)].map((x) => +x[1]);
        for (const [, abil] of m[2].matchAll(/'(\w{4})'/g)) {
            const row = map.abilityData[abil] || {};
            for (const w of waves) {
                if (row.code === 'AIml') hpByWave[w] = (hpByWave[w] || 0) + (+row.DataA1 || 0);
                if (row.code === 'AIat') dmgByWave[w] = (dmgByWave[w] || 0) + (+row.DataA1 || 0);
            }
        }
    }
    const stackGold = +(J.match(/\(Challenge_Stack\[i_1\]-1\)\*(\d+)/) || [])[1] || 0;
    const roar = +(map.abilityData.A943?.DataA1 || 0);
    const armorAura = map.abilityData.A933 || {};
    const regenAura = map.abilityData.A945 || {};
    const thorns = +(map.abilityData.A929?.DataA1 || 0);
    // เกราะเพิ่ม (AIde) ที่ใส่ต่อจากสกิลแชมเปี้ยน A921 ทุกเวฟ
    const armorAdd = [...new Set([...J.matchAll(/UnitAddAbility\(BHE,'A921'\)\s*\ncall UnitAddAbility\(BHE,'(\w{4})'\)/g)].map((m) => m[1]))]
        .filter((a) => map.abilityData[a]?.code === 'AIde')
        .reduce((s, a) => s + (+map.abilityData[a].DataA1 || 0), 0);

    const waves = creeps.map((c) => {
        const canChallenge = !blocked.includes(c.wave) && goldFor(c.wave) > 0;
        return {
            wave: c.wave,
            name: c.name,
            icon: c.icon,
            can: canChallenge,
            gold: canChallenge ? goldFor(c.wave) : 0,
            stack: canChallenge ? (c.wave - 1) * stackGold : 0, // ถ้าท้าติดกันมาตั้งแต่เวฟ 1
            hp: hpByWave[c.wave] || 0,
            dmg: dmgByWave[c.wave] || 0,
        };
    });
    // แต่ละข้อเป็นคู่ [ไทย, อังกฤษ] แล้วแยกเป็น bullets กับ bulletsEn
    const bossWaves = blocked.filter((w) => w <= LAST_WAVE).join(', ');
    const bullets = [
        ['กดท้าก่อนเริ่มเวฟ ครีปตัวหนึ่งในเลนของคุณจะกลายเป็นแชมเปี้ยนที่แข็งกว่าปกติ แลกกับทองตอนจบเวฟ',
            'Challenge before the wave starts: one creep in your lane becomes a Champion that is stronger than normal, in exchange for gold at the end of the wave'],
        // รวมช่วงเวฟที่ตัวคูณเท่ากันเป็นข้อเดียว (ในสคริปต์เขียนแยกช่วงซ้อนกัน)
        ...goldRules.reduce((acc, g) => {
            const last = acc[acc.length - 1];
            if (last && last.mult === g.mult && g.from <= last.to + 1) last.to = Math.max(last.to, g.to);
            else acc.push({ ...g });
            return acc;
        }, []).map((g) => {
            const to = Math.min(g.to, LAST_WAVE - (blocked.includes(LAST_WAVE) ? 1 : 0));
            return [`เวฟ ${g.from}–${to}: ได้ทอง = เลขเวฟ × ${g.mult}`, `Waves ${g.from}–${to}: gold = wave number × ${g.mult}`];
        }),
        bossWaves ? [`ท้าไม่ได้ในเวฟบอส ${bossWaves}`, `Cannot challenge on boss wave ${bossWaves}`] : null,
        [`Stack: ท้าติดกันทุกเวฟ stack เพิ่มทีละ 1 ได้โบนัส (stack − 1) × ${stackGold} ทอง ข้ามเวฟเมื่อไหร่ stack กลับเป็น 0`,
            `Stack: challenge every wave in a row and the stack grows by 1, giving a bonus of (stack − 1) × ${stackGold} gold. Skip a wave and the stack resets to 0`],
        ['ถ้าแชมเปี้ยนหลุดเลน ทองที่จะได้จากการท้าเวฟนั้นลดเหลือครึ่งเดียว', 'If the Champion leaks out of your lane, the challenge gold for that wave is cut in half'],
    ].filter(Boolean);
    const buffs = [
        [`ดาเมจ +${Math.round(roar * 100)}%`, `Damage +${Math.round(roar * 100)}%`],
        armorAdd ? [`เกราะ +${armorAdd}`, `Armor +${armorAdd}`] : null,
        [`ลดเกราะศัตรูรอบตัว ${Math.abs(+armorAura.DataA1 || 0)} หน่วย รัศมี ${+armorAura.Area1 || 0}`,
            `Reduces armor of nearby enemies by ${Math.abs(+armorAura.DataA1 || 0)}, radius ${+armorAura.Area1 || 0}`],
        [`ออร่าฟื้นเลือด ${Math.round((+regenAura.DataB1 || 0) * 100)}% ของเลือดสูงสุดต่อวินาที รัศมี ${+regenAura.Area1 || 0}`,
            `HP regen aura: ${Math.round((+regenAura.DataB1 || 0) * 100)}% of max HP per second, radius ${+regenAura.Area1 || 0}`],
        [`สะท้อนดาเมจ ${Math.round(thorns * 100)}% กลับไปหาคนตี`, `Reflects ${Math.round(thorns * 100)}% of damage back to the attacker`],
        ['ผิวต้านเวท (Resistant Skin) ติดสถานะสั้นลงและไม่โดนสกิลบางอย่าง', 'Resistant Skin: shorter debuff durations and immune to some skills'],
    ].filter(Boolean);
    return {
        stackGold,
        rules: goldRules,
        bullets: bullets.map((b) => b[0]),
        bulletsEn: bullets.map((b) => b[1]),
        buffs: buffs.map((b) => b[0]),
        buffsEn: buffs.map((b) => b[1]),
        waves,
    };
})();

/* ── Wisp & Tree (ไม้ในแมพนี้เรียกว่า tree) ───────────────── */
const lumberLevels = [];
for (const upg of ['R003', 'R00H']) {
    const u = need(upgrades[upg], 'อัปเกรด ' + upg);
    const tips = (upgradeStr[upg]?.Tip || '').split(',');
    for (let lv = 1; lv <= +u.maxlevel; lv++) {
        const tip = clean(tips[lv - 1] || '');
        const n = tip.match(/(\d+)\/(\d+)/);
        lumberLevels.push({
            level: n ? +n[1] : lumberLevels.length + 1,
            gold: (+u.goldbase || 0) + (+u.goldmod || 0) * (lv - 1),
            lumber: (+u.lumberbase || 0) + (+u.lumbermod || 0) * (lv - 1),
            time: (+u.timebase || 0) + (+u.timemod || 0) * (lv - 1),
            add: +u.base1 || 0, // แต่ละขั้นเก็บไม้เพิ่มจากขั้นก่อนหน้ากี่หน่วย
        });
    }
}
// Wisp ที่ผู้เล่นผลิตจริงคือ e003 (Town h023 ผลิต ในเกมชื่อ Worker) ส่วน ewsp ไม่มีตึกไหนผลิต
const WISP = 'e003';
const wispUnit = unitInfo(WISP);
const wisp = {
    ...wispUnit,
    name: 'Wisp',
    gold: num(balance[WISP].goldcost),
    time: num(balance[WISP].bldtm),
    desc: clean(unitStr[WISP]?.Ubertip),
    // การเก็บไม้ของ Wisp มาจากความสามารถ Harvest (Wisp) รหัส Awha: DataA = ไม้ต่อรอบ, Dur = วินาทีต่อรอบ
    // งานวิจัย R003/R00H ชี้มาที่ Awha (code1) เพิ่มไม้ต่อรอบทีละ base1
    gather: (() => {
        const id = (abilities[WISP]?.abilList || '').split(',').find((a) => map.abilityData[a]?.code === 'Awha');
        const row = map.abilityData[id] || {};
        return { per: +row.DataA1 || 0, every: +row.Dur1 || 0 };
    })(),
    // เพดานไม้ (ฟังก์ชัน GNE): 100 × (จำนวน Wisp + ขั้นวิจัยเก็บไม้) ขั้นต่ำ 200 เกินจากนี้เกมตัดทิ้งตอนจบเวฟ
    cap: (() => {
        const m = funcBody('GNE').match(/set EE=EE\*(\d+)\s*\nif EE<(\d+) then/);
        return m ? { per: +m[1], min: +m[2] } : null;
    })(),
    lumber: {
        name: clean(upgradeStr.R003?.Name),
        icon: icon(upgradeStr.R003?.Art),
        desc: clean(upgradeStr.R003?.Ubertip),
        levels: lumberLevels,
    },
};

/* ── ตารางดาเมจตามชนิดโจมตีและเกราะ ───────────────────── */
// war3mapMisc.txt เก็บเป็นลิสต์ตามลำดับเกราะของเกม: small medium large fort normal hero divine none
// ชื่อที่เกมประกาศก่อนเวฟไม่ตรงกับรหัส: Fortified คือ normal, Enchanted คือ divine, Unarmored คือ none
const misc = {};
for (const line of fs.readFileSync(path.join(SRC, 'war3mapMisc.txt'), 'latin1').split(/\r?\n/)) {
    const m = line.match(/^DamageBonus(\w+)=(.+)$/);
    if (m) misc[m[1]] = m[2].split(',').map(Number);
}
const ARMOR_SLOT = { Light: 0, Medium: 1, Heavy: 2, Fortified: 4, Enchanted: 6, Unarmored: 7 };
const ATTACK_KEY = { Piercing: 'Pierce', Normal: 'Normal', Magic: 'Magic', Siege: 'Siege', Chaos: 'Chaos' };
const damage = {
    armor: Object.keys(ARMOR_SLOT),
    attack: Object.keys(ATTACK_KEY).map((name) => {
        // แมพไม่ได้แก้ Chaos จึงใช้ค่าเดิมของ Warcraft III คือ 100% ทุกเกราะ
        const row = misc[ATTACK_KEY[name]] || (name === 'Chaos' ? Array(8).fill(1) : need(null, 'DamageBonus' + ATTACK_KEY[name]));
        return { name, pct: Object.values(ARMOR_SLOT).map((i) => Math.round(row[i] * 100)) };
    }),
};

const info = fs.readFileSync(path.join(SRC, 'war3map.w3i'), 'latin1');
// ชื่อแมพในไฟล์ข้อมูลแมพใส่รหัสสีคั่นทุกตัวอักษร ต้องลบรหัสสีก่อนค่อยหาเลขเวอร์ชัน
const version = (stripCodes(info.replace(/[^\x20-\x7e]/g, ' ')).match(/Legion TD NewEdition\s+(\d+\.\d+\w*)/) || [])[1] || '';

fs.writeFileSync(OUT, JSON.stringify({ version, creeps, damage, king, wisp, champion }));

console.log(`แมพเวอร์ชัน ${version}`);
console.log(`ครีป ${creeps.length} เวฟ (บอส: ${creeps.filter((c) => c.boss).map((c) => c.wave).join(', ')})`);
console.log(`ทองต่อตัว: ${creeps.map((c) => c.bounty).join(' ')}`);
console.log(`ทองจบเวฟ (โหมด pr): ${creeps.map((c) => c.finish).join(' ')}`);
console.log(`Kick value: ${creeps.map((c) => c.kick).join(' ')}`);
console.log(`ดาเมจ (${damage.armor.join(' ')}): ${damage.attack.map((a) => a.name + ' ' + a.pct.join('/')).join(' · ')}`);
console.log(`King HP ${king.hp} · อัปเต็ม HP +${kingMax.hp} ดาเมจ +${kingMax.dmg} ฟื้นเลือด +${kingMax.regen}/วิ`);
console.log(`Wisp ราคา ${wisp.gold} · อัปเกรดเก็บไม้ ${lumberLevels.length} ขั้น`);
if (missingIcons.size) console.log(`ไอคอนที่ยังไม่มีรูป ${missingIcons.size}: ${[...missingIcons].join(', ')}`);
