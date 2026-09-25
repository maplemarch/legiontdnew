/* fetch-icons.js — ดาวน์โหลดไอคอนมาตรฐานของ Warcraft III ที่ไม่ได้อยู่ในไฟล์แมพ
 *
 * ไอคอนอย่าง BTNSpiderCrab.blp มากับตัวเกม แมพแค่อ้างชื่อไว้ จึงแตกจากแมพไม่ได้
 * สคริปต์นี้ถาม Warcraft Wiki (warcraft.wiki.gg) ว่ารูป PNG ของชื่อนั้นอยู่ที่ไหน แล้วโหลดมาเก็บใน assets/img/units
 * ตั้งชื่อไฟล์แบบเดียวกับรูปเดิม (ชื่อตัวเล็ก-รหัส.png) เพื่อให้ build-units.js กับ build-game.js หาเจอเอง
 *
 * วิธีใช้: node tools/fetch-icons.js BTNSpiderCrab BTNWisp ...   (ใส่ .blp ต่อท้ายมาด้วยก็ได้)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT = path.join(process.cwd(), 'assets/img/units');
const API = 'https://warcraft.wiki.gg/api.php';
const UA = 'LegionTD-NE-site/1.0 (icon sync for ltdnew.online)';

const names = process.argv.slice(2).map((n) => path.basename(n).replace(/\.(blp|png)$/i, '')).filter(Boolean);
if (!names.length) {
    console.log('ใส่ชื่อไอคอนด้วย เช่น node tools/fetch-icons.js BTNSpiderCrab');
    process.exit(1);
}

const existing = new Set(fs.readdirSync(OUT).map((f) => f.slice(0, f.lastIndexOf('-'))));

async function lookup(batch) {
    const titles = batch.map((n) => `File:${n}.png`).join('|');
    const url = `${API}?action=query&format=json&prop=imageinfo&iiprop=url|size&titles=${encodeURIComponent(titles)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const json = await res.json();
    const found = {};
    // ชื่อไฟล์ในวิกิขึ้นต้นตัวใหญ่เสมอ จับคู่กลับด้วยตัวเล็ก
    const norm = {};
    for (const n of json.query?.normalized || []) norm[n.to.toLowerCase()] = n.from;
    for (const p of Object.values(json.query?.pages || {})) {
        const info = p.imageinfo?.[0];
        if (!info) continue;
        const from = norm[p.title.toLowerCase()] || p.title;
        found[from.replace(/^File:/, '').replace(/\.png$/, '').toLowerCase()] = info;
    }
    return found;
}

(async () => {
    const todo = names.filter((n) => !existing.has(n.toLowerCase().replace(/\s+/g, '-')));
    if (todo.length < names.length) console.log(`มีอยู่แล้ว ข้าม ${names.length - todo.length} รูป`);
    const missing = [];
    for (let i = 0; i < todo.length; i += 40) {
        const batch = todo.slice(i, i + 40);
        const found = await lookup(batch);
        for (const n of batch) {
            const info = found[n.toLowerCase()];
            if (!info) { missing.push(n); continue; }
            const res = await fetch(info.url, { headers: { 'User-Agent': UA } });
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.readUInt32BE(0) !== 0x89504e47) { missing.push(n); continue; }
            const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
            const file = `${n.toLowerCase().replace(/\s+/g, '-')}-${hash}.png`;
            fs.writeFileSync(path.join(OUT, file), buf);
            console.log(`  ${file}  (${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)})`);
        }
    }
    if (missing.length) console.log(`หาไม่เจอในวิกิ ${missing.length}: ${missing.join(', ')}`);
})();
