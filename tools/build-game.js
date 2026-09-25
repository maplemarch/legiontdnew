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
const J = fs.readFileSync(jassFile, 'latin1');

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
const KING_SKILLS = [
    // [ร้านโหวต, รหัสสกิลจริง, สรุปสั้น, รายการค่าที่แสดง [ชื่อ, ฟิลด์, หน่วย]]
    ['uu9d', 'A022', 'กระแทกพื้น ทำดาเมจและสตันศัตรูทุกตัวรอบ King', [['ดาเมจ', 'DataA'], ['สตัน', 'Dur', 'วิ'], ['สตันบอส', 'HeroDur', 'วิ'], ['รัศมี', 'Area'], ['คูลดาวน์', 'Cool', 'วิ'], ['มานา', 'Cost']]],
    ['uu9r', 'A982', 'ปล่อยคลื่นพลังเป็นเส้นตรง ทำดาเมจแล้วเผาต่อเนื่อง', [['ดาเมจ', 'DataA'], ['เผาต่อวิ', 'DataE'], ['ระยะ', 'Rng'], ['รัศมี', 'Area'], ['คูลดาวน์', 'Cool', 'วิ'], ['มานา', 'Cost']]],
    ['uu1d', 'A01T', 'เผาศัตรูรอบตัวตลอดเวลาที่เปิด กินมานาทุกวินาที', [['ดาเมจต่อวิ', 'DataA'], ['รัศมี', 'Area'], ['มานาต่อวิ', 'DataB']]],
];
const kingSkills = KING_SKILLS.map(([shop, abil, summary, fields]) => {
    const row = map.abilityData[abil] || {};
    const st = abilStr[abil] || {};
    const levels = +row.levels || 0;
    const stages = [];
    for (let lv = 1; lv <= levels; lv++) {
        const vals = fields.map(([label, f, unit]) => {
            const raw = row[f + lv] ?? map.w3a[abil]?.[`${f}@${lv}`];
            const v = raw === undefined || raw === '' || raw === '-' ? '' : Math.round(+raw * 10) / 10;
            return { label, value: v === '' ? '' : `${v}${unit ? ' ' + unit : ''}` };
        });
        // ตาราง SLK เก็บได้ 4 เลเวล ถ้าเลเวลเกินนั้นไม่มีค่าใน war3map.w3a ก็ไม่รู้ค่าจริง ไม่แสดง
        if (vals.every((x) => x.value === '')) continue;
        stages.push({ level: lv, waves: stageWaves[lv] || '', values: vals });
    }
    return {
        ...shopItem(shop),
        name: clean(st.Name) || shopItem(shop).name,
        summary,
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
    const common = (shop, upg) => [
        `ทีมต้องซื้อครบ ${buyCount(upg)} ครั้งสกิลถึงจะใช้ได้ (ครั้งละ ${num(balance[shop]?.lumbercost)} ไม้ ได้ income +${income(shop)})`,
        'เลือกได้ทีมละ 1 Presence ซื้ออันหนึ่งแล้วอีกอันจะซื้อไม่ได้',
        'ติดตัว: ฟื้นมานา 1% ของมานาสูงสุดต่อวินาที',
    ];
    return [
        {
            ...shopItem('u99r'),
            summary: 'เผาเลือดศัตรูรอบตัว King เป็น % ของเลือดสูงสุด',
            bullets: [
                'ศัตรูในรัศมีเสียเลือด 2.5% ของ Max HP ต่อวินาที นาน 10 วินาที',
                'ลดเลือดได้สูงสุด 25% และไม่ทำให้ตาย (เป้าจะเหลืออย่างน้อย 1%)',
                `รัศมี ${abil('A975', 'Area')}`,
                `คูลดาวน์ ${abil('A971', 'Cool')} วินาที · ใช้มานา ${abil('A971', 'Cost')}`,
                ...common('u99r', 'R998'),
            ],
        },
        {
            ...shopItem('u99d'),
            summary: 'King ตีแรงขึ้นหลายเท่า ตีเด้งหลายตัว และดูดเลือด',
            bullets: [
                `ดาเมจพื้นฐาน +${Math.round(abil('A969', 'DataA') * 100)}%`,
                'การตีเด้งไปโดนได้ 3 เป้า เป้าที่ 2 รับ 75% เป้าที่ 3 รับ 56%',
                'ดูดเลือด 45% ของดาเมจที่ทำ',
                `นาน ${abil('A969', 'Dur')} วินาที · คูลดาวน์ ${abil('A969', 'Cool')} วินาที · ใช้มานา ${abil('A969', 'Cost')}`,
                'หลังกดใช้ ให้รอ King ตีครั้งแรกก่อนค่อยเปลี่ยนเป้า',
                ...common('u99d', 'R999'),
            ],
        },
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
    return {
        stackGold,
        rules: goldRules,
        bullets: [
            'กดท้าก่อนเริ่มเวฟ ครีปตัวหนึ่งในเลนของคุณจะกลายเป็นแชมเปี้ยนที่แข็งกว่าปกติ แลกกับทองตอนจบเวฟ',
            // รวมช่วงเวฟที่ตัวคูณเท่ากันเป็นข้อเดียว (ในสคริปต์เขียนแยกช่วงซ้อนกัน)
            ...goldRules.reduce((acc, g) => {
                const last = acc[acc.length - 1];
                if (last && last.mult === g.mult && g.from <= last.to + 1) last.to = Math.max(last.to, g.to);
                else acc.push({ ...g });
                return acc;
            }, []).map((g) => `เวฟ ${g.from}–${Math.min(g.to, LAST_WAVE - (blocked.includes(LAST_WAVE) ? 1 : 0))}: ได้ทอง = เลขเวฟ × ${g.mult}`),
            blocked.filter((w) => w <= LAST_WAVE).length ? `ท้าไม่ได้ในเวฟบอส ${blocked.filter((w) => w <= LAST_WAVE).join(', ')}` : '',
            `Stack: ท้าติดกันทุกเวฟ stack เพิ่มทีละ 1 ได้โบนัส (stack − 1) × ${stackGold} ทอง ข้ามเวฟเมื่อไหร่ stack กลับเป็น 0`,
            'ถ้าแชมเปี้ยนหลุดเลน ทองที่จะได้จากการท้าเวฟนั้นลดเหลือครึ่งเดียว',
        ].filter(Boolean),
        buffs: [
            `ดาเมจ +${Math.round(roar * 100)}%`,
            `ลดเกราะศัตรูรอบตัว ${Math.abs(+armorAura.DataA1 || 0)} หน่วย รัศมี ${+armorAura.Area1 || 0}`,
            `ออร่าฟื้นเลือด ${Math.round((+regenAura.DataB1 || 0) * 100)}% ของเลือดสูงสุดต่อวินาที รัศมี ${+regenAura.Area1 || 0}`,
            `สะท้อนดาเมจ ${Math.round(thorns * 100)}% กลับไปหาคนตี`,
            'ผิวต้านเวท (Resistant Skin) ติดสถานะสั้นลงและไม่โดนสกิลบางอย่าง',
        ],
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
const wispUnit = unitInfo('ewsp');
const wisp = {
    ...wispUnit,
    gold: num(balance.ewsp.goldcost),
    desc: clean(unitStr.ewsp?.Ubertip),
    // การเก็บไม้ของ Wisp มาจากความสามารถ Harvest (Wisp) รหัส Awha: DataA = ไม้ต่อรอบ, Dur = วินาทีต่อรอบ
    // งานวิจัย R003/R00H ชี้มาที่ Awha (code1) เพิ่มไม้ต่อรอบทีละ base1
    gather: (() => {
        const id = (abilities.ewsp?.abilList || '').split(',').find((a) => map.abilityData[a]?.code === 'Awha');
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

const info = fs.readFileSync(path.join(SRC, 'war3map.w3i'), 'latin1');
// ชื่อแมพในไฟล์ข้อมูลแมพใส่รหัสสีคั่นทุกตัวอักษร ต้องลบรหัสสีก่อนค่อยหาเลขเวอร์ชัน
const version = (stripCodes(info.replace(/[^\x20-\x7e]/g, ' ')).match(/Legion TD NewEdition\s+(\d+\.\d+\w*)/) || [])[1] || '';

fs.writeFileSync(OUT, JSON.stringify({ version, creeps, king, wisp, champion }));

console.log(`แมพเวอร์ชัน ${version}`);
console.log(`ครีป ${creeps.length} เวฟ (บอส: ${creeps.filter((c) => c.boss).map((c) => c.wave).join(', ')})`);
console.log(`ทองต่อตัว: ${creeps.map((c) => c.bounty).join(' ')}`);
console.log(`ทองจบเวฟ (โหมด pr): ${creeps.map((c) => c.finish).join(' ')}`);
console.log(`King HP ${king.hp} · อัปเต็ม HP +${kingMax.hp} ดาเมจ +${kingMax.dmg} ฟื้นเลือด +${kingMax.regen}/วิ`);
console.log(`Wisp ราคา ${wisp.gold} · อัปเกรดเก็บไม้ ${lumberLevels.length} ขั้น`);
if (missingIcons.size) console.log(`ไอคอนที่ยังไม่มีรูป ${missingIcons.size}: ${[...missingIcons].join(', ')}`);
