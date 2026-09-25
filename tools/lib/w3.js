/* w3.js — ตัวอ่านไฟล์ข้อมูลที่แตกออกมาจากแมพ Warcraft III ใช้ร่วมกันระหว่าง build-units.js กับ build-game.js */

const fs = require('fs');
const path = require('path');

/* ── อ่านไฟล์ SLK (ตารางแบบ Excel ข้อความ) เป็น { id: { คอลัมน์: ค่า } } ── */
function readSlk(file) {
    const cells = {};
    let x = 0, y = 0;
    for (const line of fs.readFileSync(file, 'latin1').split(/\r?\n/)) {
        if (!line.startsWith('C;')) continue;
        let val;
        for (const f of line.split(';').slice(1)) {
            if (f[0] === 'X') x = +f.slice(1);
            else if (f[0] === 'Y') y = +f.slice(1);
            else if (f[0] === 'K') val = f.slice(1).replace(/^"(.*)"$/, '$1');
        }
        if (val !== undefined) (cells[y] ||= {})[x] = val;
    }
    const head = cells[1] || {};
    const out = {};
    for (const [row, r] of Object.entries(cells)) {
        if (row === '1' || !r[1]) continue;
        const o = {};
        for (const [col, v] of Object.entries(r)) if (head[col]) o[head[col]] = v;
        out[r[1]] = o;
    }
    return out;
}

/* ── อ่านไฟล์ข้อความแบบ INI เช่น CampaignUnitStrings.txt ── */
function readIni(file) {
    const out = {};
    if (!fs.existsSync(file)) return out;
    let cur = null;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\[(.+)\]$/);
        if (m) { cur = out[m[1]] ||= {}; continue; }
        const i = line.indexOf('=');
        if (cur && i > 0) cur[line.slice(0, i)] = line.slice(i + 1);
    }
    return out;
}

// ค่าหลายเลเวลคั่นด้วยจุลภาค เอาเลเวลแรก ถ้าอยู่ในเครื่องหมายคำพูดให้เอาทั้งก้อน
const firstLevel = (v = '') => {
    v = v.trim();
    if (v.startsWith('"')) {
        const end = v.indexOf('"', 1);
        return end > 0 ? v.slice(1, end) : v.slice(1);
    }
    return v.split(',')[0];
};

// ข้อความบางช่องในแมพเข้ารหัสผิดมาสองชั้น เครื่องหมาย ’ “ ” – กลายเป็น "โ€" ตามด้วยอักษรแปลก
// ประกอบไบต์กลับเป็น UTF-8 เดิม (E2 80 xx)
const fixMojibake = (v) => v.replace(/โ€([\u0080-¿])/g, (m, c) => Buffer.from([0xE2, 0x80, c.charCodeAt(0)]).toString('utf8'));

// ลบรหัสสีของ WC3 (|cffRRGGBB ... |r) และแปลง |n เป็นขึ้นบรรทัดใหม่
const stripCodes = (v = '') => fixMojibake(v)
    .replace(/\|c[0-9a-f]{8}/gi, '')
    .replace(/\|r/gi, '')
    .replace(/\|n/gi, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const clean = (v = '') => stripCodes(firstLevel(v));

const num = (v) => (v === undefined || v === '' || v === '-' ? '' : String(+v));
const cap = (v = '') => (v ? v[0].toUpperCase() + v.slice(1) : '');

/* ── ไอคอน: จับคู่ชื่อไฟล์ .blp กับรูปที่แปลงไว้แล้วใน assets/img/units ── */
function iconResolver(iconDir) {
    const files = fs.readdirSync(iconDir);
    return (art) => {
        if (!art) return '';
        const base = path.win32.basename(firstLevel(art)).replace(/\.(blp|dds|tga)$/i, '').toLowerCase().replace(/\s+/g, '-');
        const hit = files.find((f) => f.slice(0, f.lastIndexOf('-')) === base);
        return hit ? `../assets/img/units/${hit}` : '';
    };
}

/* ── อ่านไฟล์ object data แบบไบนารี (war3map.w3a และตระกูลเดียวกัน)
   optimizer เก็บค่าเลเวล 5 ขึ้นไปไว้ที่นี่ เพราะตาราง SLK มีช่องแค่ 4 เลเวล
   คืนค่า { รหัส: { 'ฟิลด์@เลเวล': ค่า } } ── */
function readObjectData(file, withLevels = true) {
    const out = {};
    if (!fs.existsSync(file)) return out;
    const b = fs.readFileSync(file);
    let o = 0;
    const i32 = () => { const v = b.readInt32LE(o); o += 4; return v; };
    const id4 = () => { const s = b.toString('latin1', o, o + 4); o += 4; return s; };
    const ver = i32();
    for (let table = 0; table < 2; table++) {
        const n = i32();
        for (let k = 0; k < n; k++) {
            const orig = id4(), custom = id4();
            const key = /[^\0\s]/.test(custom) ? custom : orig; // ของที่แก้จากต้นฉบับจะมีรหัสใหม่เป็นศูนย์
            const sets = ver >= 3 ? i32() : 1;
            for (let s = 0; s < sets; s++) {
                if (ver >= 3) i32();
                const mods = i32();
                for (let j = 0; j < mods; j++) {
                    const field = id4(), type = i32();
                    let level = 0;
                    if (withLevels) { level = i32(); i32(); }
                    let v;
                    if (type === 0) v = i32();
                    else if (type === 1 || type === 2) { v = b.readFloatLE(o); o += 4; }
                    else { const e = b.indexOf(0, o); v = b.toString('utf8', o, e); o = e + 1; }
                    id4();
                    (out[key] ||= {})[level ? `${field}@${level}` : field] = v;
                }
            }
        }
    }
    return out;
}

/* ── โหลดตารางหลักทั้งหมดจากโฟลเดอร์ที่แตกไว้ ── */
function loadMap(src) {
    const U = path.join(src, 'Units');
    return {
        balance: readSlk(path.join(U, 'UnitBalance.slk')),
        weapons: readSlk(path.join(U, 'UnitWeapons.slk')),
        abilities: readSlk(path.join(U, 'UnitAbilities.slk')),
        upgrades: readSlk(path.join(U, 'UpgradeData.slk')),
        abilityData: readSlk(path.join(U, 'AbilityData.slk')),
        w3a: readObjectData(path.join(src, 'war3map.w3a')),
        unitStr: readIni(path.join(U, 'CampaignUnitStrings.txt')),
        upgradeStr: readIni(path.join(U, 'CampaignUpgradeStrings.txt')),
        abilStr: {
            ...readIni(path.join(U, 'CommonAbilityStrings.txt')),
            ...readIni(path.join(U, 'ItemAbilityStrings.txt')),
            ...readIni(path.join(U, 'CampaignAbilityStrings.txt')),
        },
    };
}

// ดาเมจจากตารางอาวุธ: ค่าบวก + ลูกเต๋า (ต่ำสุด–สูงสุด)
const damageOf = (w = {}) => {
    const dice = +w.dice1 || 0, sides = +w.sides1 || 0, plus = +w.dmgplus1 || 0;
    return dice || plus ? `${plus + dice}-${plus + dice * sides}` : '';
};

module.exports = { readSlk, readIni, readObjectData, firstLevel, stripCodes, clean, num, cap, iconResolver, loadMap, damageOf };
