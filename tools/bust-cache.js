/* bust-cache.js — ต่อท้าย URL ของไฟล์ CSS JS และรูปพื้นหลังด้วยรหัสจากเนื้อไฟล์
 *
 * ปัญหา: GitHub Pages บอกเบราว์เซอร์ให้เก็บไฟล์ static ไว้ 10 นาที
 *        พอแก้ CSS แล้ว push คนที่เคยเข้าเว็บจะยังเห็นของเก่าจนกว่าจะกด Ctrl+F5
 *
 * วิธีแก้: เติม ?v=<รหัส> ท้าย URL โดยรหัสคำนวณจากเนื้อไฟล์
 *        ไฟล์เปลี่ยน รหัสเปลี่ยน เบราว์เซอร์มองเป็นคนละไฟล์จึงโหลดใหม่ทันที
 *        ไฟล์ไม่เปลี่ยน รหัสเท่าเดิม เบราว์เซอร์ใช้ของในแคชต่อไม่ต้องโหลดซ้ำ
 *
 * วิธีใช้: node tools/bust-cache.js   (รันก่อน commit ทุกครั้งที่แก้ CSS หรือ JS)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();

const hashOf = (file) => {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
};

const walk = (dir, out = []) => {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules' || name === 'tools') continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const files = walk(ROOT);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

let changed = 0;

/* ── 0) ไฟล์ข้อมูลที่ JS โหลดเอง (fetch('../assets/data/xxx.json'))
   ต้องทำก่อนข้อ 1 เพราะแก้เนื้อไฟล์ JS รหัสของไฟล์ JS ในหน้า HTML จึงต้องคำนวณทีหลัง ── */
const jsFiles = files.filter((f) => f.endsWith('.js') && f.includes(path.join('assets', 'js')));
for (const js of jsFiles) {
  let src = fs.readFileSync(js, 'utf8');
  const before = src;
  src = src.replace(
    /(fetch\('\.\.\/assets\/data\/([\w-]+\.json))(?:\?v=[\w]+)?(')/g,
    (m, pre, name, post) => {
      const h = hashOf(path.join(ROOT, 'assets/data', name));
      return h ? `${pre}?v=${h}${post}` : m;
    }
  );
  if (src !== before) {
    fs.writeFileSync(js, src);
    changed += 1;
    console.log('  ' + path.relative(ROOT, js) + '  (ไฟล์ข้อมูล)');
  }
}

/* ── 1) ไฟล์ CSS กับ JS ที่หน้า HTML เรียกใช้ ── */
for (const html of htmlFiles) {
  const dir = path.dirname(html);
  let src = fs.readFileSync(html, 'utf8');
  const before = src;

  src = src.replace(
    /((?:href|src)=")((?:\.\.\/)*assets\/(?:css|js|img)\/[\w.-]+\.(?:css|js|png|jpg|jpeg|svg|webp))(?:\?v=[\w]+)?(")/g,
    (m, pre, rel, post) => {
      const h = hashOf(path.resolve(dir, rel));
      return h ? `${pre}${rel}?v=${h}${post}` : m;
    }
  );

  if (src !== before) {
    fs.writeFileSync(html, src);
    changed += 1;
    console.log('  ' + path.relative(ROOT, html));
  }
}

/* ── 2) รูปพื้นหลังที่ CSS เรียกใช้ ── */
const cssFiles = files.filter((f) => f.endsWith('.css'));
for (const css of cssFiles) {
  const dir = path.dirname(css);
  let src = fs.readFileSync(css, 'utf8');
  const before = src;

  src = src.replace(
    /(url\(')((?:\.\.\/)*img\/[\w.-]+\.(?:png|jpg|jpeg|svg|webp))(?:\?v=[\w]+)?('\))/g,
    (m, pre, rel, post) => {
      const h = hashOf(path.resolve(dir, rel));
      return h ? `${pre}${rel}?v=${h}${post}` : m;
    }
  );

  if (src !== before) {
    fs.writeFileSync(css, src);
    changed += 1;
    console.log('  ' + path.relative(ROOT, css));
  }
}

console.log(changed ? `\nอัปเดตรหัสไฟล์แล้ว ${changed} ไฟล์` : '\nไม่มีอะไรต้องอัปเดต รหัสตรงกับเนื้อไฟล์อยู่แล้ว');
