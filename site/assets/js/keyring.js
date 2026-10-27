/* ================================================================
   휴대폰 키링 — 두 가지만
   1) letters  영어 스트랩: 은색 고리 끈 + 은 구슬 + 은색 글자 큐브 + 맨 아래 은 하트 (색 고정)
   2) acrylic  아크릴 키링: 은 체인 + 고리 + 내가 넣은 이미지 (투명 PNG면 모양대로 흰 테두리)
   window.Keyring.html(k) → { html } 또는 null   (k = { type, text, img })
   폰 오른쪽 위 고리(ph-lug)에 맨 위 한 점(가로 57px, 세로 8px)이 걸려요
   ================================================================ */
window.Keyring = (function () {
  const f = n => (+n).toFixed(2);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const SC = 1.9, VW = 60, CX = 30, TOP = 4;
  const DEFS = `<defs>
    <radialGradient id="krC" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#e9ecf6"/><stop offset=".62" stop-color="#8a90ad"/><stop offset=".82" stop-color="#d9dcea"/><stop offset="1" stop-color="#6f7590"/></radialGradient>
    <linearGradient id="krM" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfcff"/><stop offset=".45" stop-color="#c9cde0"/><stop offset=".55" stop-color="#9aa0bb"/><stop offset="1" stop-color="#eef0f8"/></linearGradient></defs>`;
  const ball = (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#krC)"/>${r > 2 ? `<ellipse cx="${f(x - r * .34)}" cy="${f(y - r * .38)}" rx="${f(r * .3)}" ry="${f(r * .19)}" fill="#fff" opacity=".9"/>` : ''}`;
  const cube = (x, y, ch) => `<rect x="${f(x - 3.3)}" y="${f(y - 3.3)}" width="6.6" height="6.6" rx="1.1" fill="url(#krM)" stroke="#7d839f" stroke-width=".35"/>
    <rect x="${f(x - 2.6)}" y="${f(y - 2.9)}" width="5.2" height="1.1" rx=".5" fill="#fff" opacity=".7"/>
    <text x="${f(x)}" y="${f(y + 2.3)}" font-size="5.6" font-weight="900" text-anchor="middle" fill="#2a2e45" font-family="Arial Black, Arial, sans-serif">${esc(ch)}</text>`;
  const heart = (cx, cy, s) => `M${f(cx)} ${f(cy + .9 * s)} C${f(cx + .25 * s)} ${f(cy + .62 * s)} ${f(cx + s)} ${f(cy + .25 * s)} ${f(cx + s)} ${f(cy - .28 * s)} C${f(cx + s)} ${f(cy - .82 * s)} ${f(cx + .38 * s)} ${f(cy - 1.02 * s)} ${f(cx)} ${f(cy - .56 * s)} C${f(cx - .38 * s)} ${f(cy - 1.02 * s)} ${f(cx - s)} ${f(cy - .82 * s)} ${f(cx - s)} ${f(cy - .28 * s)} C${f(cx - s)} ${f(cy + .25 * s)} ${f(cx - .25 * s)} ${f(cy + .62 * s)} ${f(cx)} ${f(cy + .9 * s)}Z`;
  const svgWrap = (H, body) => `<svg class="kr-svg" viewBox="0 0 ${VW} ${f(H)}" style="width:${VW * SC}px;height:${f(H * SC)}px" aria-hidden="true">${DEFS}${body}</svg>`;

  /* 1) 영어 스트랩: 맨 위 한 점에서 갈라졌다 아래에서 만나는 고리 · 왼쪽 줄에 글자, 나머지는 은 구슬 */
  function letters(text) {
    const L = [...String(text || '').toUpperCase().replace(/[^0-9A-Z]/g, '')].slice(0, 10);
    if (!L.length) return null;
    const Wd = 11, D = Math.max(40, L.length * 7.4 + 14), P = s => [CX + Wd * Math.sin(s), TOP + D / 2 * (1 - Math.cos(s))];
    let path = ''; for (let k = 0; k <= 120; k++) { const [x, y] = P(k / 120 * Math.PI * 2); path += (k ? 'L' : 'M') + f(x) + ' ' + f(y); }
    const pts = []; let acc = 0, prev = P(0);
    for (let k = 1; k <= 600; k++) { const s = k / 600 * Math.PI * 2, p = P(s); acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]); pts.push([s, acc, p]); prev = p; }
    const slots = []; for (let a = 5; a < acc - 5; a += 7.4) { const e = pts.find(q => q[1] >= a); if (e && Math.abs(e[0] - Math.PI) > .2) slots.push(e); }
    const left = slots.filter(e => e[0] < Math.PI), right = slots.filter(e => e[0] > Math.PI);
    const st = Math.max(0, Math.round(left.length / 2 - L.length / 2));
    let beads = '';
    left.forEach((e, k) => { const [x, y] = e[2], i = k - st; beads += i >= 0 && i < L.length ? cube(x, y, L[i]) : ball(x, y, 1.9); });
    right.forEach((e, k) => { const [x, y] = e[2]; beads += k % 3 === 1 ? ball(x, y, 2.8) : ball(x, y, 1.9); });
    const bot = TOP + D, H = bot + 22;
    return svgWrap(H, `<path d="${path}" fill="none" stroke="#c9cdd8" stroke-width="1"/>${beads}
      <path d="M${CX} ${f(bot)}V${f(bot + 3)}" stroke="#c9cdd8" stroke-width=".8"/><circle cx="${CX}" cy="${f(bot + 6)}" r="2.8" fill="none" stroke="url(#krM)" stroke-width="1.2"/>
      <path d="${heart(CX, bot + 14.5, 5.6)}" fill="url(#krC)" stroke="#6f7590" stroke-width=".4"/><ellipse cx="${CX - 2.2}" cy="${f(bot + 12)}" rx="1.6" ry="1" fill="#fff" opacity=".9"/>`);
  }

  /* 2) 아크릴 키링: 짧은 은 체인 → 고리 → 이미지 (이미지가 없으면 달지 않아요) */
  function acrylic(img) {
    if (!img) return null;
    const chain = [0, 1, 2].map(i => `<ellipse cx="${CX}" cy="${f(TOP + 3 + i * 4.6)}" rx="${i % 2 ? 1 : 1.6}" ry="2.4" fill="none" stroke="url(#krM)" stroke-width="1"/>`).join('');
    return svgWrap(24, `<circle cx="${CX}" cy="${TOP}" r="1.6" fill="#9aa0bb"/>${chain}<circle cx="${CX}" cy="${f(TOP + 17)}" r="3" fill="none" stroke="url(#krM)" stroke-width="1.3"/>`)
      + `<span class="kr-acryl"><img src="${esc(img)}" alt="" referrerpolicy="no-referrer" draggable="false"></span>`;
  }

  return {
    TYPES: { none: '없음', letters: '영어 스트랩 (은색)', acrylic: '아크릴 키링' },
    html(k) {
      if (!k || !k.type || k.type === 'none') return null;
      const out = k.type === 'letters' ? letters(k.text) : k.type === 'acrylic' ? acrylic(k.img) : null;
      return out ? { html: out } : null;
    }
  };
})();
