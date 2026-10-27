/* ================================================================
   진입 연출 (멤버란 시스템 링크)
   캐릭터를 누르면 약 4초 동안:
   접속 문구 타이핑 → 큰 소속 이름 → 타일 전환 → 같은 팀 인물이 차례로 지나감
   → 마지막에 누른 인물 + 승인 서명 → 가로로 쓸어 넘기며 인물 인트로로 이어져요.
   EntrySeq.play({...}) → 화면이 덮이는 순간 resolve (그 뒤에 인트로를 띄우면 돼요)
   ================================================================ */
(function () {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function rng(str) {
    let s = [...String(str)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 5);
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function city(r, cls, h, tone) {
    let x = -10, s = '';
    while (x < 1010) {
      const w = 22 + r() * 64, bh = h * (.3 + r() * .7);
      s += `<rect x="${x.toFixed(0)}" y="${(h - bh).toFixed(0)}" width="${w.toFixed(0)}" height="${bh.toFixed(0)}"/>`;
      if (r() < .25) s += `<rect x="${(x + w / 2 - 1).toFixed(0)}" y="${(h - bh - 14 - r() * 26).toFixed(0)}" width="2" height="${bh.toFixed(0)}"/>`;
      x += w + 2 + r() * 10;
    }
    return `<svg class="${cls}" viewBox="0 0 1000 ${h}" preserveAspectRatio="none"><g fill="${tone}">${s}</g></svg>`;
  }
  // 글자 크기를 길이에 맞춰 줄여요 (화면 밖으로 넘치지 않게)
  const fit = (txt, base, room) => `min(${base}vw, ${(room / Math.max(1, [...txt].length) * 1.75).toFixed(2)}vw)`;

  window.EntrySeq = {
    play(o) {
      return new Promise(resolve => {
        const r = rng(o.seed || o.title || 'x');
        const ops = o.ops.slice(-3);
        const slots = [[1080, 1680], [1680, 2080], [2080, 0]].slice(0, ops.length);
        if (ops.length === 1) slots[0] = [1080, 0];
        if (ops.length === 2) slots[1] = [1680, 0];
        const title = (o.title || 'ARCH').toUpperCase();
        const tx = `CONNECTING TO ${o.org} SYSTEM`.toUpperCase();

        const tiles = Array.from({ length: 40 }, (_, k) => {
          const col = k % 8, row = Math.floor(k / 8);
          return `<i class="${k % 2 ? '' : 't'}" style="animation-delay:${900 + (col + row) * 22}ms"></i>`;
        }).join('');
        const ticks = Array.from({ length: 41 }, (_, k) => `<i class="${k % 10 ? '' : 'm'}"></i>`).join('');
        const opHTML = ops.map((p, k) => {
          const [t, e] = slots[k];
          return `<div class="op ${e ? '' : 'last'}" style="--t:${t}ms;--e:${e || 99999}ms">
            <p class="bn" style="font-size:${fit(p.bg, 21.8, 52)}">${E(p.bg)}</p><p class="bn o" style="font-size:${fit(p.bg, 21.8, 52)}">${E(p.bg)}</p>
            <span class="side ${p.han ? 'han' : ''}">${E(p.side)}</span><span class="side g1 ${p.han ? 'han' : ''}">${E(p.side)}</span>
            <span class="vt">${E(o.org)} // PROFILE DOSSIER</span>
            <div class="pl"><span class="f">${E(p.label)}</span><b class="gx" style="font-size:${fit(p.big, 6, 30)}">${E(p.big)}</b>
              <p><em>${E(p.sub1)}</em><span class="c">${E((p.sub2 || '').toUpperCase())}</span></p><i class="br" style="background:${E(o.color || '#c3cce0')}"></i></div>
          </div>`;
        }).join('');

        const es = document.createElement('div');
        es.className = 'es'; es.style.setProperty('--c', o.color || '#c3cce0');
        es.innerHTML = `
          <div class="es-b">
            <div class="es-cty">${city(r, 'far', 560, '#0d0f12')}${city(r, 'near', 360, '#07080a')}<i class="fog"></i></div>
            <i class="es-grd"></i><i class="es-rn"></i>
            <div class="es-hd"><span class="lo">${E(o.logo)}<b>${E(o.logoSub || 'ARCH')}</b></span><i class="hr"></i><span class="st">SYSTEM LINK</span></div>
            <span class="es-pm p1"></span><span class="es-pm p2"></span><span class="es-pm p3"></span><span class="es-pm p4"></span>
            <div class="es-tl"><i class="tf"></i>${[0, 1, 2, 3, 4].map(k => `<b style="left:${k * 25}%;animation-delay:${Math.round(k * 882.5)}ms"></b>`).join('')}</div>
            <div class="es-k1"><p class="la">${E(o.org)} / SECURE LINK</p>
              <p class="tx">${[...tx].map((ch, k) => ch === ' ' ? ' ' : `<i style="animation-delay:${80 + k * 15}ms">${E(ch)}</i>`).join('')}<u></u></p>
              <p class="sb">ESTABLISHING CONNECTION</p></div>
            <div class="es-ru"><i></i><b></b></div>
            <div class="es-wp"><div class="es-wpi">
              ${city(r, 'pcy', 420, 'rgba(10,12,15,.9)')}
              <div class="pf"><span>${E(o.mark || '')}</span></div>
              <div class="ms"><span>${E(o.org)}</span><span>PERSONNEL ARCHIVE</span></div>
              <h1 class="ar" style="font-size:${fit(title, 21.8, 50)}">${[...title].map((ch, k) => `<span><b style="animation-delay:${660 + k * 38}ms, ${980 + k * 18}ms">${E(ch)}</b></span>`).join('')}</h1>
              <p class="sh"><i></i>${E((o.motto || '').toUpperCase())}</p>
              <div class="rl">${ticks}</div>
            </div></div>
            <div class="es-tg">${tiles}</div>
            <div class="es-sc">${opHTML}</div>
            <i class="es-fv"></i>
            <div class="es-fin">
              <div class="ft"><p class="fa">${E(o.fa)}</p><p class="fb"><span style="font-size:${fit(o.fb, 9.27, 80)}">${E(o.fb)}</span></p></div>
              <div class="fl"><span class="k">PROFILE LOGIN</span><i class="tr"><b></b></i><b class="pc">000</b><span class="ag">ACCESS GRANTED</span></div>
              <div class="fo"><p class="ra"><i></i>REGISTRATION APPROVED</p>
                <div class="sg"><span>AUTHORIZED BY</span><b>${E(o.sign)}</b>
                  <svg viewBox="0 0 200 30" preserveAspectRatio="none"><path pathLength="300" d="M4 22 C 40 8, 70 28, 104 16 S 160 6, 196 18"/></svg></div></div>
            </div>
            ${['b0', 'b1', 'b2', 'b3', 'b4'].map(b => `<i class="es-gb ${b}"></i>`).join('')}
          </div>
          <i class="es-wx w1"></i><i class="es-wx w2"></i>`;
        document.body.appendChild(es);

        // 퍼센트 숫자 (2.64초부터 0.45초 동안)
        const pc = es.querySelector('.pc'), t0 = performance.now();
        (function tick(t) {
          const p = Math.max(0, Math.min(1, (t - t0 - 2640) / 450));
          pc.textContent = String(Math.round(p * 100)).padStart(3, '0');
          if (p < 1 && es.isConnected) requestAnimationFrame(tick);
        })(t0);

        const T = [];
        let out = false;
        const goOut = delay => {
          if (out) return; out = true;
          T.forEach(clearTimeout);
          es.style.setProperty('--wd', delay + 'ms');
          es.classList.add('out');
          setTimeout(() => { es.querySelector('.es-b').style.visibility = 'hidden'; es.classList.add('clear'); resolve(); }, delay + 300);
          setTimeout(() => es.remove(), delay + 760);
        };
        T.push(setTimeout(() => goOut(0), 4000));
        es.addEventListener('click', () => goOut(0)); // 누르면 건너뛰기
      });
    }
  };
})();
