/* 视觉特效 & 音效引擎 */
(function (global) {
  const cv = document.getElementById('fx-canvas');
  const ctx = cv ? cv.getContext('2d') : null;
  let parts = [];
  let running = false;
  let dpr = Math.min(global.devicePixelRatio || 1, 2);

  function resize() {
    if (!cv) return;
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  function loop() {
    if (!parts.length) { running = false; ctx && ctx.clearRect(0, 0, innerWidth, innerHeight); return; }
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= 1 / 60;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.g;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'shard') {
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.9);
      } else {
        // 上升的光屑
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.6, p.size * 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    requestAnimationFrame(loop);
  }

  function kick() {
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  function add(p) { parts.push(p); kick(); }

  /** 位置爆发 */
  function burst(x, y, color, opts = {}) {
    if (!ctx) return;
    const count = opts.count || 34;
    const power = opts.power || 5.4;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = power * (0.35 + Math.random());
      add({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 1.2,
        g: opts.g === undefined ? 0.055 : opts.g,
        drag: 0.975,
        size: (opts.size || 3.6) * (0.5 + Math.random()),
        color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.3,
        life: opts.life || (0.9 + Math.random() * 0.9),
        maxLife: opts.life || 1.6,
        type: Math.random() > 0.45 ? 'shard' : 'spark'
      });
    }
  }

  /** 从底部升腾的光屑幕 */
  function rise(x, y, color, opts = {}) {
    const count = opts.count || 26;
    for (let i = 0; i < count; i++) {
      add({
        x: x + (Math.random() - 0.5) * (opts.spread || 160),
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(1.6 + Math.random() * 2.6),
        g: -0.008,
        drag: 0.99,
        size: 2.4 + Math.random() * 2.6,
        color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.12,
        life: 1.2 + Math.random(),
        maxLife: 2.2,
        type: 'rise'
      });
    }
  }

  /** 全屏烟花（UR 专属） */
  function fireworks(colors) {
    const w = innerWidth, h = innerHeight;
    let shots = 0;
    const timer = setInterval(() => {
      burst(w * (0.2 + Math.random() * 0.6), h * (0.18 + Math.random() * 0.45), colors, { count: 42, power: 6.5, life: 2 });
      if (++shots >= 6) clearInterval(timer);
    }, 260);
  }

  function screenFlash(color, alpha) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;inset:0;z-index:95;pointer-events:none;background:${color};opacity:${alpha};mix-blend-mode:screen;`;
    document.body.appendChild(el);
    el.animate([{ opacity: alpha }, { opacity: 0 }], { duration: 620, easing: 'ease-out' }).onfinish = () => el.remove();
  }

  /* ---------------- 音效（WebAudio 合成，零素材） ---------------- */
  let actx = null;
  let enabled = true;

  function audio() {
    if (!enabled) return null;
    if (!actx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) { enabled = false; return null; }
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }

  function tone(freq, dur, opts = {}) {
    const a = audio();
    if (!a) return;
    const t0 = a.currentTime + (opts.delay || 0);
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    const vol = opts.vol === undefined ? 0.14 : opts.vol;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (opts.filter) {
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      node.connect(f);
      node = f;
    }
    node.connect(gain);
    gain.connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, opts = {}) {
    const a = audio();
    if (!a) return;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const g = a.createGain();
    const f = a.createBiquadFilter();
    f.type = opts.hp ? 'highpass' : 'lowpass';
    f.frequency.value = opts.freq || 1200;
    g.gain.value = opts.vol === undefined ? 0.1 : opts.vol;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start();
  }

  const Sfx = {
    setEnabled: (v) => { enabled = !!v; },
    unlock: () => audio(),
    click: () => tone(680, 0.07, { type: 'triangle', vol: 0.09, to: 520 }),
    hover: () => tone(880, 0.05, { type: 'sine', vol: 0.05 }),
    charge: () => {
      tone(180, 1.0, { type: 'sawtooth', vol: 0.05, to: 900, filter: 1800 });
      noise(0.9, { freq: 900, vol: 0.05 });
    },
    beam: () => { tone(420, 0.5, { type: 'square', vol: 0.06, to: 1600 }); noise(0.4, { freq: 2400, hp: true, vol: 0.06 }); },
    reveal: (level) => {
      const base = [0, 520, 620, 760, 880, 1040][Math.min(5, Math.max(1, level || 1))];
      if (level >= 4) {
        // 传说以上：上行琶音
        [0, 0.09, 0.18, 0.3].forEach((d, i) => tone(base * Math.pow(1.26, i), 0.5, { type: 'triangle', vol: 0.12, delay: d }));
      } else if (level === 3) {
        [0, 0.08, 0.16].forEach((d, i) => tone(base * Math.pow(1.2, i), 0.34, { type: 'triangle', vol: 0.1, delay: d }));
      } else {
        tone(base, 0.22, { type: 'sine', vol: 0.08 });
      }
    },
    ur: () => {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.9, { type: 'triangle', vol: 0.12, delay: i * 0.11 }));
      noise(1.1, { freq: 3200, hp: true, vol: 0.05 });
    },
    coin: () => { tone(1200, 0.09, { type: 'square', vol: 0.07 }); tone(1600, 0.14, { type: 'square', vol: 0.05, delay: 0.06 }); },
    error: () => tone(220, 0.24, { type: 'sawtooth', vol: 0.08, to: 130 })
  };

  global.FX = { burst, rise, fireworks, screenFlash, Sfx };
})(window);
