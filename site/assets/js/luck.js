/* ================================================================
   천장 연출: 재앙 알림 · 사리 알림 · 숫자 룰렛 팡파레
   실제로 알림이 있을 때만 받아요 (common.js 의 luckShow)
   ================================================================ */
(function () {
  const LINES = ['나는 너무 불행해......', '오늘은 운이 안 좋네......', '피곤해......'];
  const SHAPE = {
    star: 'M50 3l14 31 34 4-25 23 7 34-30-17-30 17 7-34L2 38l34-4z',
    heart: 'M50 92S6 62 6 32a23 23 0 0 1 44-9 23 23 0 0 1 44 9c0 30-44 60-44 60z',
    dia: 'M50 2l34 36-34 60L16 38zM16 38h68'
  };
  const COLORS = ['#ff9db5', '#ffc98f', '#ffe97a', '#a8f0b4', '#9fdcff', '#b7a8ff', '#f3a8e6'];
  const SPARK = 'M50 2c3.6 27 14 39.4 48 48-34 8.6-44.4 21-48 48-3.6-27-14-39.4-48-48 34-8.6 44.4-21 48-48z';   // 네 갈래 반짝이 별
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clear = () => document.querySelectorAll('.lk-pop, .lk-vig').forEach(x => x.remove());

  function piece(x, y, kinds, power) {
    const k = kinds[Math.floor(Math.random() * kinds.length)], s = 12 + Math.random() * 18, c = COLORS[Math.floor(Math.random() * COLORS.length)];
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '0 0 100 100'); el.setAttribute('class', 'lk-pc'); el.style.width = el.style.height = s + 'px';
    // 별은 반반: 하얀 반짝이 별 + 색 그림자 / 모서리가 둥근 색 별
    if (k === 'star' && Math.random() < .5) { el.innerHTML = `<path d="${SPARK}" fill="#fff"/>`; el.style.filter = `drop-shadow(0 0 3px ${c}) drop-shadow(0 0 7px ${c})`; }
    else el.innerHTML = `<path d="${SHAPE[k]}" fill="${c}" ${k === 'dia' ? 'stroke="#fff" stroke-width="3"' : k === 'star' ? `stroke="${c}" stroke-width="9" stroke-linejoin="round"` : ''}/>`;
    document.body.appendChild(el);
    const a = Math.random() * Math.PI * 2, d = power * (.45 + Math.random() * .75), dx = Math.cos(a) * d, dy = Math.sin(a) * d, rot = (Math.random() - .5) * 720, T = 1100 + Math.random() * 900;
    const at = (px, py, r, sc) => `translate(${x + px - s / 2}px, ${y + py - s / 2}px) rotate(${r}deg) scale(${sc})`;
    el.animate([
      { transform: at(0, 0, 0, .2), opacity: 1 },
      { transform: at(dx * .72, dy * .72 - 18, rot * .5, 1.15), opacity: 1, offset: .3 },
      { transform: at(dx, dy + 70, rot * .8, 1), opacity: 1, offset: .7 },
      { transform: at(dx * 1.06, dy + 170, rot, .75), opacity: 0 }
    ], { duration: T, easing: 'cubic-bezier(.15, .7, .4, 1)', delay: Math.random() * 180, fill: 'both' }).onfinish = () => el.remove();
  }
  const burstAt = (x, y, n, kinds, power) => { if (!REDUCE) for (let i = 0; i < n; i++) piece(x, y, kinds, power); };

  /* 불운 5번: 화면이 죽고, 끊기듯 내려와서, 글자가 떨며 번져요 · 두상은 내 캐릭터 */
  async function doom() {
    clear();
    let head = '';
    try {
      const me = await Store.user(), c = (await Store.charCards()).find(x => x.owner_id === me.id && x.data && x.data.head);
      if (c) head = (window.headMp4 && headMp4(c.data.head) || {}).poster || c.data.head;
    } catch (e) {}
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    const v = document.createElement('div'); v.className = 'lk-vig'; document.body.appendChild(v); void v.offsetWidth; v.classList.add('on');
    const el = document.createElement('div'); el.className = 'lk-pop lk-doom'; el.setAttribute('role', 'status');
    el.innerHTML = `<svg class="lk-crack" viewBox="0 0 380 90" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width=".8"><path d="M380 8l-46 12-18-8-30 22-22-6-20 16M334 20l6 24 22 10M286 34l-8 26"/><path d="M0 70l34-8 16 10 28-14"/></svg>
      <span class="lk-av"></span><div class="lk-top"><b>과거의 나</b><small>메시지 · 지금</small></div>
      <div class="lk-msg">${[...line].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join('')}</div>`;
    if (head) el.querySelector('.lk-av').style.backgroundImage = `url('${String(head).replace(/['"\\()]/g, '')}')`;
    document.body.appendChild(el); void el.offsetWidth; el.classList.add('go');
    setTimeout(() => { el.remove(); v.classList.remove('on'); setTimeout(() => v.remove(), 1200); }, 8000);
  }

  /* 천장: 까만 불운 도트를 사리가 소용돌이로 먹고, 꿀꺽 → 하트 · 별 */
  async function sari() {
    clear();
    const el = document.createElement('div'); el.className = 'lk-pop lk-sari'; el.setAttribute('role', 'status');
    el.innerHTML = `<span class="lk-sav"><span class="lk-av"></span></span><div class="lk-top"><b>사리</b><small>메시지 · 지금</small></div><div class="lk-msg">너의 불운은 이 몸이<br><em>다 먹어 주었다냥!</em></div>`;
    document.body.appendChild(el); void el.offsetWidth; el.classList.add('go');
    setTimeout(() => el.remove(), 8000);
    if (REDUCE) return;
    await wait(650); if (!el.isConnected) return;
    const av = el.querySelector('.lk-sav'), r = av.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, N = 14, GAP = 75, OUT = 480, IN = 720;
    const nom = () => av.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 170 });   // 동그란 모양 그대로 냠
    for (let i = 0; i < N; i++) {
      const size = 7 + Math.random() * 9, a0 = Math.PI * (.02 + .96 * i / (N - 1)), R = 110 + Math.random() * 90, turn = Math.PI * 1.5;
      const at = (t, sc) => { const rad = R * Math.pow(1 - t, 1.25), ang = a0 + turn * t; return `translate(${cx + Math.cos(ang) * rad * 1.35 - size / 2}px, ${cy + Math.abs(Math.sin(ang)) * rad * .85 * (1 - t) + Math.sin(ang) * rad * .5 * t - size / 2}px) scale(${sc})`; };
      const frames = [{ transform: at(0, 0), opacity: 0, offset: 0 }, { transform: at(0, 1.25), opacity: 1, offset: OUT / (OUT + IN) * .55 }, { transform: at(0, 1), opacity: 1, offset: OUT / (OUT + IN) }];
      for (let k = 1; k <= 8; k++) { const t = k / 8; frames.push({ transform: at(t * t, 1 - t * .72), opacity: 1, offset: OUT / (OUT + IN) + (IN / (OUT + IN)) * t }); }
      [0, 45, 90].forEach((lag, n) => {
        const p = document.createElement('i'); p.className = 'lk-dot' + (n ? ' tail' : ''); p.style.width = p.style.height = size * (1 - n * .24) + 'px'; document.body.appendChild(p);
        p.animate(frames, { duration: OUT + IN, delay: i * GAP + lag, easing: 'linear', fill: 'both' }).onfinish = () => { p.remove(); if (!n && el.isConnected) { nom(); burstAt(cx, cy, 1, ['star'], 26); } };
      });
    }
    setTimeout(() => { if (!el.isConnected) return; av.classList.remove('gulp'); void av.offsetWidth; av.classList.add('gulp'); burstAt(cx, cy, 22, ['heart', 'star'], 110); }, (N - 1) * GAP + OUT + IN + 120);
  }

  /* 숫자 칸: 별이 팡 → 숫자가 위로 쭉 올라가서 새 숫자에 멈춤 → 무지개 그림자 + 별 · 하트 · 다이아 팡파레 */
  async function reel(box, from, to, onTick) {
    const M = [1.5, 2, 4, 6, 10], list = [from]; for (let i = 0; i < 16; i++) list.push(M[i % 5]); list.push(to);
    box.classList.add('lk-reel');
    box.innerHTML = `<div class="lk-win"><div class="lk-col">${list.map(n => `<b>×${n}</b>`).join('')}</div></div><svg class="lk-bang" viewBox="0 0 100 100" fill="currentColor"><path d="M50 0c4 30 16 42 50 50-34 8-46 20-50 50-4-30-16-42-50-50 34-8 46-20 50-50z"/></svg>`;
    const col = box.querySelector('.lk-col'), bang = box.querySelector('.lk-bang'), b = box.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    bang.classList.add('go'); burstAt(cx, cy, 16, ['star'], 130);
    await wait(220);
    const DUR = REDUCE ? 1 : 1700;
    const spin = col.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-64 * (list.length - 1)}px)` }], { duration: DUR, easing: 'cubic-bezier(.16, .72, .16, 1)', fill: 'forwards' });
    const t0 = performance.now(), tick = t => { const p = Math.min(1, (t - t0) / DUR); if (onTick) onTick(1 - Math.pow(1 - p, 3)); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await spin.finished.catch(() => {});
    if (onTick) onTick(1);
    box.classList.add('lk-gold', 'lk-land');
    const c2 = box.getBoundingClientRect();
    burstAt(c2.left + c2.width / 2, c2.top + c2.height / 2, 70, ['star', 'heart', 'dia'], 340);
    await wait(420);
    burstAt(c2.left + c2.width / 2, c2.top + c2.height / 2, 40, ['star', 'heart', 'dia'], 240);
  }

  window.Luck = { doom, sari, reel, show: n => n === 'doom' ? doom() : n === 'pity' ? sari() : null };
})();
