/* build-units.js — สร้าง assets/data/units.json ใหม่จากไฟล์ที่แตกออกมาจากแมพ
 *
 * วิธีใช้:
 *   1) แตกแมพ .w3x ด้วย MPQ Editor ลงโฟลเดอร์ (ค่าเริ่มต้น w3x/Work ซึ่งอยู่ใน .gitignore)
 *   2) node tools/build-units.js [โฟลเดอร์ที่แตกไว้]
 *   3) node tools/bust-cache.js
 *
 * แมพที่ผ่าน optimizer จะไม่มี war3map.w3u แต่ข้อมูลยูนิตถูกแปลงไปอยู่ใน Units\*.slk และ *Strings.txt
 * สคริปต์นี้อ่านจากไฟล์เหล่านั้น แล้วอัปเดตเฉพาะยูนิตที่เว็บมีอยู่แล้ว
 * ค่าที่เว็บกำหนดเอง (tier, base, skin, ไอคอนที่มีอยู่แล้ว) คงไว้ตามเดิม
 */

const fs = require('fs');
const path = require('path');
const { firstLevel, clean, num, cap, iconResolver, loadMap, damageOf } = require('./lib/w3');

const ROOT = process.cwd();
const SRC = path.resolve(process.argv[2] || 'w3x/Work');
const OUT = path.join(ROOT, 'assets/data/units.json');
const iconFor = iconResolver(path.join(ROOT, 'assets/img/units'));

/* ── โหลดข้อมูลจากแมพ ── */
const { balance, weapons, abilities, unitStr, abilStr } = loadMap(SRC);
const old = JSON.parse(fs.readFileSync(OUT, 'utf8'));

// ความสามารถที่ติดอยู่กับยูนิตเกือบทุกตัว เช่น Sell เป็นระบบของแมพ ไม่ใช่สกิลเฉพาะตัว ไม่ต้องแสดง
const abilCount = {};
// ฮีโร่เก็บสกิลไว้ใน heroAbilList แยกจาก abilList ต้องอ่านทั้งสองช่อง
const abilsOf = (id) => [abilities[id]?.abilList, abilities[id]?.heroAbilList].join(',').split(',').map((s) => s.trim()).filter((s) => s && s !== '_');
for (const u of old) for (const a of new Set(abilsOf(u.id))) abilCount[a] = (abilCount[a] || 0) + 1;
const common = new Set(Object.keys(abilCount).filter((a) => abilCount[a] > old.length * 0.5));
const report = { updated: 0, changed: [], removed: [], missingIcons: new Set() };

function skillsOf(id, prev) {
    const list = abilsOf(id);
    const out = [];
    for (const a of list) {
        const s = abilStr[a];
        if (!s || common.has(a)) continue;
        const name = clean(s.Name || s.Tip);
        const desc = clean(s.Ubertip || s.Researchubertip);
        if (!name || !desc) continue; // ความสามารถซ่อน เช่น ตัวนับหรือบัฟระบบ ไม่มีคำอธิบาย ไม่ต้องแสดง
        if (out.some((o) => o.name === name)) continue; // บางยูนิตใส่สกิลชื่อเดียวกันซ้ำสองช่อง
        let icon = iconFor(s.Art || s.ResearchArt);
        if (!icon) {
            icon = prev.find((p) => p.name === name)?.icon || '';
            if (!icon) report.missingIcons.add(path.win32.basename(firstLevel(s.Art || '')));
        }
        out.push({ name, desc, icon });
    }
    return out;
}

const next = [];
for (const u of old) {
    const b = balance[u.id];
    if (!b) { report.removed.push(`${u.id} ${u.name}`); continue; }
    const w = weapons[u.id] || {};
    const s = unitStr[u.id] || {};

    const n = {
        ...u,
        name: clean(s.Name) || u.name,
        tip: clean(s.Tip) || u.tip,
        desc: clean(s.Ubertip) || u.desc,
        cost: num(b.goldcost),
        hp: num(b.HP),
        level: num(b.level) || u.level,
        dmg: damageOf(w),
        speed: num(w.cool1),
        range: num(w.rangeN1),
        armor: num(b.def),
        atk: cap(w.atkType1),
        def: b.defType || u.def,
        icon: u.icon || iconFor(s.Art),
        skills: skillsOf(u.id, u.skills),
        up: firstLevel(s.Upgrade) ? s.Upgrade.split(',').map((x) => x.trim()).filter(Boolean) : u.up,
    };

    const diff = ['cost', 'hp', 'dmg', 'speed', 'range'].filter((k) => String(u[k]) !== String(n[k]));
    if (diff.length) report.changed.push(`${n.name}: ` + diff.map((k) => `${k} ${u[k] || '-'}→${n[k] || '-'}`).join(', '));
    next.push(n);
    report.updated++;
}

// ลิงก์อัปเกรด: ตัดรหัสที่ไม่มีในเว็บทิ้ง แล้วสร้าง "อัปเกรดมาจาก" ใหม่จากลิงก์ขาไป
const ids = new Set(next.map((u) => u.id));
for (const u of next) { u.up = u.up.filter((x) => ids.has(x)); u.from = []; }
for (const u of next) for (const x of u.up) next.find((v) => v.id === x).from.push(u.id);

fs.writeFileSync(OUT, JSON.stringify(next));

console.log(`อัปเดต ${report.updated} ยูนิต`);
console.log(`ค่าต่างจากเดิม ${report.changed.length} ยูนิต`);
report.changed.slice(0, 40).forEach((c) => console.log('  ' + c));
if (report.removed.length) console.log(`ไม่มีในแมพแล้ว ถอดออก ${report.removed.length}: ${report.removed.join(', ')}`);
if (report.missingIcons.size) console.log(`ไอคอนสกิลที่ยังไม่มีรูป ${report.missingIcons.size}: ${[...report.missingIcons].join(', ')}`);
