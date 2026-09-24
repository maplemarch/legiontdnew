/* scene3d.js — ฉากสามมิติด้วย Three.js
 *
 *   หน้าแรก  data-scene="hero"     วงเวทสองชั้นหมุนสวนกัน เสาแสงจางๆ
 *                                  และประกายไฟลอยขึ้น ตั้งใจให้เบา ไม่แย่งข้อความ
 *   หน้าอื่น data-scene="ambient"  ประกายไฟจางๆ กับวงเวทใหญ่มุมจอ อยู่หลังเนื้อหา
 *
 *   ถ้าเบราว์เซอร์ไม่มี WebGL หรือโหลดไลบรารีไม่ได้ ไฟล์นี้จะหยุดเงียบๆ
 *   หน้าหลักยังเหลือจุดแสงแบบ CSS ของ particles.js ไว้แทน
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const host = document.querySelector('[data-scene]');
if (host) start(host);

function start(host) {
    const mode = host.dataset.scene;
    const isHero = mode === 'hero';
    const small = window.matchMedia('(max-width: 720px)').matches;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
        return; // ไม่มี WebGL ปล่อยให้หน้าใช้แบบเดิม
    }

    // จอความละเอียดสูงเรนเดอร์เกิน 1.75 เท่าแล้วเครื่องร้อนโดยไม่ได้ความคมเพิ่มจนสังเกตได้
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const gold = new THREE.Color('#f0b429');
    const goldLight = new THREE.Color('#ffd166');
    const violet = new THREE.Color('#a855f7');

    /* ── ประกายไฟ ──────────────────────────────────────────────
       ทุกจุดคำนวณตำแหน่งใน shader จาก uTime จึงไม่ต้องอัปเดตข้อมูลทุกเฟรม */
    const emberCount = isHero ? (small ? 160 : 420) : (small ? 90 : 200);
    const emberRange = 11;
    const emberGeo = new THREE.BufferGeometry();
    const base = new Float32Array(emberCount * 3);
    const seed = new Float32Array(emberCount * 4);
    for (let i = 0; i < emberCount; i += 1) {
        base[i * 3] = (Math.random() - 0.5) * 2;       // ขยายตามความกว้างจอใน uniform
        base[i * 3 + 1] = Math.random() * emberRange;
        base[i * 3 + 2] = -7 + Math.random() * 11;
        seed[i * 4] = 0.25 + Math.random() * 0.75;     // ความเร็ว
        seed[i * 4 + 1] = Math.random();               // เฟส
        seed[i * 4 + 2] = 0.5 + Math.random() * 1.1;   // ขนาด
        seed[i * 4 + 3] = Math.random();               // โทนสี
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(base, 3));
    emberGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));

    const emberMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uSpeed: { value: isHero ? 0.9 : 0.35 },
            uRange: { value: emberRange },
            uWidth: { value: 10 },
            uSize: { value: (isHero ? 120 : 110) * renderer.getPixelRatio() },
            uOpacity: { value: isHero ? 1 : 0.5 },
            uGold: { value: gold },
            uAmber: { value: goldLight },
            uViolet: { value: violet },
        },
        vertexShader: /* glsl */`
            uniform float uTime, uSpeed, uRange, uWidth, uSize;
            uniform vec3 uGold, uAmber, uViolet;
            attribute vec4 aSeed;
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                vec3 p = position;
                p.x *= uWidth;
                float rise = uTime * uSpeed * aSeed.x + aSeed.y * uRange;
                p.y = mod(p.y + rise, uRange) - uRange * 0.5;
                p.x += sin(uTime * 0.7 * aSeed.x + aSeed.y * 6.2831) * 0.45;
                p.z += cos(uTime * 0.5 * aSeed.x + aSeed.y * 9.0) * 0.4;

                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mv;
                gl_PointSize = uSize * aSeed.z / -mv.z;

                // เกิดที่ขอบล่าง จางหายก่อนถึงขอบบน และกะพริบคนละจังหวะ
                float life = (p.y + uRange * 0.5) / uRange;
                vAlpha = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.65, 1.0, life));
                vAlpha *= 0.55 + 0.45 * sin(uTime * 3.0 * aSeed.x + aSeed.y * 40.0);

                vColor = aSeed.w < 0.55 ? uGold : (aSeed.w < 0.85 ? uAmber : uViolet);
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uOpacity;
            varying vec3 vColor;
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float glow = smoothstep(0.5, 0.0, d);
                glow = glow * glow * (0.35 + 0.65 * glow);
                gl_FragColor = vec4(vColor, glow * vAlpha * uOpacity);
            }
        `,
    });
    const embers = new THREE.Points(emberGeo, emberMat);
    embers.frustumCulled = false;
    scene.add(embers);

    /* ── วงเวท ─────────────────────────────────────────────── */
    const runeTex = makeRuneTexture(renderer);
    const glowTex = makeGlowTexture();

    const rig = new THREE.Group();       // ตัวที่ย้ายตำแหน่งตามขนาดจอ
    scene.add(rig);
    const circle = new THREE.Group();    // วงเวทวางเอียงเหมือนพื้น
    circle.rotation.x = -1.18;
    rig.add(circle);

    const ringMat = (opacity, color) => new THREE.MeshBasicMaterial({
        map: runeTex,
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
    });

    const outer = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), ringMat(isHero ? 0.55 : 0.16, gold));
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), ringMat(isHero ? 0.35 : 0.1, goldLight));
    inner.position.z = 0.02;
    circle.add(outer, inner);

    // วงคลื่นที่ขยายออกจากกลางวงเวทเป็นจังหวะ
    const waves = [];
    for (let i = 0; i < 1; i += 1) {
        const wave = new THREE.Mesh(
            new THREE.RingGeometry(0.96, 1, 96),
            new THREE.MeshBasicMaterial({
                color: goldLight, transparent: true, opacity: 0, depthWrite: false,
                side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
            })
        );
        wave.position.z = 0.03;
        wave.userData.offset = i;
        circle.add(wave);
        waves.push(wave);
    }

    // แสงเรืองใต้วงเวท
    const floorGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(7.5, 7.5),
        new THREE.MeshBasicMaterial({
            map: glowTex, color: gold, transparent: true, opacity: isHero ? 0.55 : 0.08,
            depthWrite: false, blending: THREE.AdditiveBlending,
        })
    );
    floorGlow.position.z = -0.02;
    circle.add(floorGlow);

    /* ── เสาแสง (เฉพาะหน้าแรก) ───────── */
    let beam = null;

    if (isHero) {
        beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 1.35, 5.2, 48, 1, true),
            new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                uniforms: { uTime: { value: 0 }, uColor: { value: gold }, uOpacity: { value: 0 } },
                vertexShader: /* glsl */`
                    varying vec2 vUv;
                    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
                `,
                fragmentShader: /* glsl */`
                    uniform float uTime, uOpacity;
                    uniform vec3 uColor;
                    varying vec2 vUv;
                    void main() {
                        float fade = pow(1.0 - vUv.y, 1.6);
                        float streak = 0.55 + 0.45 * sin(vUv.x * 62.83 + uTime * 1.4) * sin(vUv.x * 25.13 - uTime * 0.9);
                        float flow = 0.7 + 0.3 * sin(vUv.y * 18.0 - uTime * 3.0);
                        gl_FragColor = vec4(uColor, fade * streak * flow * 0.16 * uOpacity);
                    }
                `,
            })
        );
        beam.position.y = 2.2;
        rig.add(beam);
    }

    /* ── วางตำแหน่งตามขนาดจอ ─────────────────────────────── */
    let viewW = 10;
    let viewH = 8;
    let baseScale = 1;
    function layout() {
        const w = host.clientWidth || window.innerWidth;
        const h = host.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        viewW = viewH * camera.aspect;
        emberMat.uniforms.uWidth.value = viewW * 0.75;

        if (isHero) {
            if (camera.aspect > 1.05) {
                // จอกว้าง วงเวทอยู่ฝั่งขวา ข้อความอยู่ซ้าย
                baseScale = Math.min(1.05, viewW / 15);
                rig.position.set(viewW * 0.22, -viewH * 0.14, 0);
                rig.rotation.y = -1.1; // หันวงเวทกลับด้านให้เอียงเข้าหาข้อความ
            } else {
                // จอแนวตั้ง วางไว้ครึ่งล่างหลังปุ่ม ย่อลงและจางลงไม่ให้แย่งข้อความ
                baseScale = Math.min(0.62, viewW / 7);
                rig.position.set(0, -viewH * 0.46, -1.5);
                rig.rotation.y = 0;
            }
        } else {
            baseScale = 1.8;
            rig.position.set(-viewW * 0.42, -viewH * 0.42, -2); // มุมซ้ายล่าง
            // วงเวทอยู่ซ้ายกล้อง มุมมองจึงเอียงกลับด้านจากตอนอยู่ขวา หมุนชดเชยให้หันเข้ากลางจอ
            rig.rotation.y = 0.9;
        }
    }
    layout();
    new ResizeObserver(layout).observe(host);

    /* ── เมาส์กับการเลื่อนหน้า ─────────────────────────────── */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', (e) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    let scrollY = window.scrollY;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    /* ── หยุดเรนเดอร์เมื่อมองไม่เห็น ─────────────────────────── */
    let visible = true;
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(host);

    document.documentElement.classList.add('has-webgl');

    const clock = new THREE.Clock();
    let elapsed = 0;
    const easeOut = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
    const dim = isHero && camera.aspect <= 1.05 ? 0.55 : 1;

    function frame() {
        requestAnimationFrame(frame);
        if (!visible || document.hidden) { clock.getDelta(); return; }

        // จำกัด delta ไว้ กลับมาจากแท็บอื่นแล้วฉากจะไม่กระโดด
        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;
        const t = elapsed;

        pointer.x += (pointer.tx - pointer.x) * 0.045;
        pointer.y += (pointer.ty - pointer.y) * 0.045;

        camera.position.x = pointer.x * 0.5;
        camera.position.y = -pointer.y * 0.3 - (isHero ? 0 : scrollY * 0.0015);
        camera.lookAt(0, isHero ? 0 : -scrollY * 0.0015, 0);

        emberMat.uniforms.uTime.value = t;

        // เปิดฉาก วงเวทกางออกจากจุดกลางใน 1.8 วินาที
        const intro = easeOut(t / 1.8);
        rig.scale.setScalar(baseScale * (0.35 + 0.65 * intro));
        outer.material.opacity = (isHero ? 0.55 : 0.16) * intro * dim;
        inner.material.opacity = (isHero ? 0.35 : 0.1) * intro * dim;
        floorGlow.material.opacity = (isHero ? 0.28 + Math.sin(t * 1.3) * 0.06 : 0.08) * intro * dim;

        outer.rotation.z = t * 0.06;
        inner.rotation.z = -t * 0.14;
        circle.rotation.y = pointer.x * 0.12;

        waves.forEach((wave) => {
            const k = (t * 0.28 + wave.userData.offset) % 1;
            wave.scale.setScalar(0.4 + k * 2.6);
            wave.material.opacity = (1 - k) * (isHero ? 0.25 : 0.08) * intro * dim;
        });

        if (isHero) {
            beam.material.uniforms.uTime.value = t;
            beam.material.uniforms.uOpacity.value = easeOut((t - 0.6) / 1.4) * dim;
        }

        renderer.render(scene, camera);
    }
    frame();
}

/* วาดลายวงเวทลงแคนวาส ใช้สุ่มแบบกำหนด seed ให้ได้ลายเดิมทุกครั้งที่โหลด */
function makeRuneTexture(renderer) {
    const size = 1024;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const cx = size / 2;
    let s = 7;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);

    g.translate(cx, cx);
    g.strokeStyle = '#ffffff';
    g.fillStyle = '#ffffff';
    g.lineCap = 'round';
    g.shadowColor = 'rgba(255, 220, 140, 0.9)';
    g.shadowBlur = 10;

    const ring = (r, w, alpha = 1) => {
        g.globalAlpha = alpha;
        g.lineWidth = w;
        g.beginPath();
        g.arc(0, 0, r, 0, Math.PI * 2);
        g.stroke();
    };
    const poly = (r, n, rot, w, alpha = 1) => {
        g.globalAlpha = alpha;
        g.lineWidth = w;
        g.beginPath();
        for (let i = 0; i <= n; i += 1) {
            const a = rot + (i / n) * Math.PI * 2;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
    };

    ring(496, 4);
    ring(478, 1.5, 0.8);
    ring(408, 2);
    ring(398, 1, 0.6);

    // แถบอักษรรูน ขีดสุ่มสามถึงห้าเส้นในกรอบเล็ก หมุนตามแนววง
    const glyphs = 40;
    for (let i = 0; i < glyphs; i += 1) {
        const a = (i / glyphs) * Math.PI * 2;
        g.save();
        g.rotate(a);
        g.translate(0, -443);
        g.globalAlpha = 0.95;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(0, -18);
        g.lineTo(0, 18);
        const strokes = 2 + Math.floor(rand() * 3);
        for (let k = 0; k < strokes; k += 1) {
            const y0 = -18 + rand() * 36;
            const dir = rand() > 0.5 ? 1 : -1;
            g.moveTo(0, y0);
            g.lineTo(dir * (6 + rand() * 8), y0 + (rand() - 0.5) * 22);
        }
        g.stroke();
        g.restore();
    }

    // ขีดบอกองศา
    for (let i = 0; i < 144; i += 1) {
        const a = (i / 144) * Math.PI * 2;
        const long = i % 6 === 0;
        g.globalAlpha = long ? 0.9 : 0.5;
        g.lineWidth = long ? 2.5 : 1.2;
        g.beginPath();
        g.moveTo(Math.cos(a) * 372, Math.sin(a) * 372);
        g.lineTo(Math.cos(a) * (long ? 392 : 384), Math.sin(a) * (long ? 392 : 384));
        g.stroke();
    }

    ring(362, 2.5);
    poly(362, 3, -Math.PI / 2, 2.5, 0.9);
    poly(362, 3, Math.PI / 2, 2.5, 0.9);
    ring(210, 2);
    poly(210, 4, Math.PI / 4, 1.8, 0.8);
    poly(210, 4, 0, 1.8, 0.8);
    ring(150, 1.5, 0.7);

    // ดวงเล็กที่ปลายดาวหกแฉก
    for (let i = 0; i < 6; i += 1) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        g.save();
        g.translate(Math.cos(a) * 362, Math.sin(a) * 362);
        ring(24, 2.5);
        ring(12, 1.5, 0.8);
        g.restore();
    }

    ring(64, 3);
    ring(40, 1.5, 0.8);
    g.globalAlpha = 1;
    g.beginPath();
    g.arc(0, 0, 14, 0, Math.PI * 2);
    g.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
}

function makeGlowTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.08)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
