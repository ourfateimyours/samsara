/* ================================================================
   공통: 헤더/푸터, 불씨 배경, 부적·팔괘 그림, 토스트, 모달, 유틸
   ================================================================ */
(function () {
  const C = window.SITE_CONFIG || {};
  document.documentElement.classList.add('gate'); // 입장 확인 전엔 화면을 잠깐 숨김

  window.$ = (s, r) => (r || document).querySelector(s);
  window.$$ = (s, r) => [...(r || document).querySelectorAll(s)];
  window.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  window.safeUrl = u => {
    u = String(u || '').trim();
    return /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);)/i.test(u) ? u : '';
  };
  // 작은따옴표를 써서 style="…" 속성 안에 넣어도 깨지지 않게
  window.cssUrl = u => { u = safeUrl(u); return u ? `url('${u.replace(/["'\\\n<>]/g, c => encodeURIComponent(c))}')` : 'none'; };
  window.fmtDate = iso => {
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  };
  window.qs = k => new URLSearchParams(location.search).get(k);
  window.pad2 = n => String(n).padStart(2, '0');
  window.REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 오행(五行) — 캐릭터 속성 */
  window.ELEMENTS = {
    wood:  { han: '木', ko: '목', word: '나무', en: 'WOOD' },
    fire:  { han: '火', ko: '화', word: '불', en: 'FIRE' },
    earth: { han: '土', ko: '토', word: '흙', en: 'EARTH' },
    metal: { han: '金', ko: '금', word: '쇠', en: 'METAL' },
    water: { han: '水', ko: '수', word: '물', en: 'AQUA' },
    yin:   { han: '陰', ko: '음', word: '음', en: 'YIN' },
    yang:  { han: '陽', ko: '양', word: '양', en: 'YANG' }
  };
  /* 속성 문장(紋章) 아이콘 — 24×24 */
  const EMB = {
    wood: 'M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l8-8',
    fire: 'M12 2c2 5 6 7 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 3 2 4 3 4-1-3-1-6 0-9z',
    earth: 'M2 20l7-12 4 6 3-4 6 10z',
    metal: 'M12 2l6 10-6 10-6-10z',
    water: 'M12 2s-7 8-7 12.5a7 7 0 0 0 14 0C19 10 12 2 12 2zM9 15a3 3 0 0 0 3 3',
    yin: 'M15 3a9 9 0 1 0 6 12 7 7 0 1 1-6-12z',
    yang: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    none: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z'
  };
  window.emblemPath = key => EMB[key] || EMB.none;
  window.emblemSVG = (key, cls) => `<svg class="emb ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${EMB[key] || EMB.none}" fill="currentColor" stroke="currentColor" stroke-width=".6" stroke-linejoin="round"/></svg>`;

  /* ---------- 토스트 ---------- */
  window.toast = (msg, kind) => {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  };

  /* ---------- 모달 ---------- */
  // 스크롤하는 동안에만 스크롤 막대 보이기 (멈추면 0.9초 뒤 사라짐)
  addEventListener('scroll', e => {
    const el = e.target === document ? document.documentElement : e.target;
    if (!el || !el.classList) return;
    el.classList.add('is-scrolling'); clearTimeout(el._sbT);
    el._sbT = setTimeout(() => el.classList.remove('is-scrolling'), 900);
  }, true);

  window.openModal = (html, cls) => {
    closeModal();
    const m = document.createElement('div');
    m.className = 'modal-back';
    m.innerHTML = `<div class="modal ${cls || ''}" role="dialog" aria-modal="true">
      <span class="mc tl"></span><span class="mc tr"></span><span class="mc bl"></span><span class="mc br"></span>
      <button class="modal-x" aria-label="닫기">×</button><div class="modal-in">${html}</div></div>`;
    m.addEventListener('pointerdown', e => { if (e.target === m) closeModal(); });
    m.querySelector('.modal-x').onclick = closeModal;
    document.body.appendChild(m);
    document.body.classList.add('no-scroll');
    const first = m.querySelector('input:not([type=file]):not([type=checkbox]),textarea,select');
    if (first && matchMedia('(pointer:fine)').matches) setTimeout(() => first.focus(), 30);
    return m.querySelector('.modal');
  };
  window.closeModal = () => {
    $$('.modal-back').forEach(m => m.remove());
    if (!$('.arc-open') && !$('.drawer')) document.body.classList.remove('no-scroll');
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.modal-back')) closeModal(); });
  /* 확인 · 입력 창: 브라우저 기본 confirm · prompt 대신 사이트 창으로
     (앱 안 브라우저 · 일부 모바일 브라우저는 기본 창을 막아서 바로 '취소'가 돼요)
     askConfirm(문구) → true / false · askPrompt(문구, 기본값) → 적은 글 / null */
  // 이미 열린 창(캐릭터 편집 등)은 그대로 두고 그 위에 따로 띄워요
  const ask = (msg, input, def) => new Promise(done => {
    const back = document.createElement('div');
    back.className = 'modal-back ask-back'; back.style.zIndex = 9000;
    back.innerHTML = `<div class="modal" role="alertdialog" aria-modal="true" style="max-width:380px">
      <span class="mc tl"></span><span class="mc tr"></span><span class="mc bl"></span><span class="mc br"></span>
      <div class="modal-in"><div class="buy-ask"><h3 style="font-size:16px;line-height:1.6;white-space:pre-line"></h3>
      ${input ? `<label class="field"><input data-ask maxlength="200"></label>` : ''}
      <div class="acts"><button class="btn ghost" data-no>취소</button><button class="btn" data-yes>확인</button></div></div></div></div>`;
    back.querySelector('h3').textContent = msg;
    const inp = back.querySelector('[data-ask]'); if (inp) inp.value = def || '';
    const fin = v => { back.remove(); removeEventListener('keydown', key, true); done(v); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); fin(input ? null : false); } else if (e.key === 'Enter') { e.preventDefault(); fin(input ? inp.value : true); } };
    addEventListener('keydown', key, true);
    back.addEventListener('pointerdown', e => { if (e.target === back) fin(input ? null : false); });
    back.querySelector('[data-no]').onclick = () => fin(input ? null : false);
    back.querySelector('[data-yes]').onclick = () => fin(input ? inp.value : true);
    document.body.appendChild(back);
    (inp || back.querySelector('[data-yes]')).focus();
  });
  window.askConfirm = msg => ask(msg, false);
  window.askPrompt = (msg, def) => ask(msg, true, def);



  /* ---------- 부적(符) 그림 ---------- */
  /* 부적 머리 문양: 용마루 장식 + 겹지붕 + 지붕 아래 글자 + 양옆 구름무늬 (1200×1200 그림 좌표, 가운데 x=610) */
  const FU_HALF = `
      <path d="M610 300 C560 335 480 400 420 445 C340 500 262 520 196 536 L190 545 C262 550 334 540 402 512 C482 478 560 412 610 364 Z"/>
      <path d="M610 386 C542 434 452 502 360 556 L370 567 C462 514 550 448 610 406 Z"/>
      <path d="M568 262 C544 270 536 296 553 308 C566 316 580 303 571 293 C566 288 559 292 562 298 C552 291 556 275 574 270 Z"/>
      <path d="M78 637 C150 633 220 628 262 623 L296 628 L262 642 C210 641 150 639 78 637 Z"/>
      <path transform="translate(316 640) scale(1.35) translate(-316 -640)" d="M292 630 C292 610 314 604 328 613 C342 622 339 640 327 645 C341 650 347 667 334 673 C319 680 304 667 313 655 C319 660 328 660 330 654 C333 646 322 642 316 648 C300 650 292 642 292 630 Z M314 622 C306 624 306 636 314 638 C322 640 326 628 320 623 Z" fill-rule="evenodd"/>`;
  const FU_CROWN = `<g class="fu-crown" fill="currentColor" transform="translate(60 66) scale(.097) translate(-610 -588)">
      ${FU_HALF}<g transform="translate(1220 0) scale(-1 1)">${FU_HALF}</g>
      <path d="M566 240 L604 207 L648 236 L646 262 C638 262 632 266 628 272 C622 254 588 254 582 272 C578 266 572 262 564 262 Z"/>
      <path d="M580 292 C596 276 614 276 630 292 L624 306 C612 298 598 298 586 306 Z"/>
      <circle cx="605" cy="281" r="7"/>
      <path d="M582 472 C596 452 612 450 622 460 L644 482 C630 492 610 494 590 488 L574 500 C572 488 576 480 582 472 Z"/>
      <path d="M494 532 C510 514 532 512 552 518 L560 508 L574 520 L690 524 C694 530 690 536 684 538 L500 541 Z"/>
      <path d="M640 528 L690 521 L689 650 L669 655 L667 566 L660 566 L660 648 L642 651 Z"/>
      <path d="M508 600 L550 590 L553 610 L541 832 L505 839 L507 762 L488 724 Z"/>
      <path d="M470 728 C462 760 440 790 392 800 L387 809 C440 813 471 801 495 771 L497 730 Z"/>
      <path d="M410 716 L722 703 L723 714 L414 726 Z"/>
      <path d="M576 742 L613 737 L615 960 L591 973 L578 966 Z"/>
      <path d="M706 668 L742 639 L787 690 L780 700 L777 832 L744 836 L742 712 L726 712 L724 802 L708 806 Z"/>
      <path d="M600 790 L712 785 L712 797 L600 801 Z"/>
    </g>`;
  window.fuSVG = (o = {}) => {
    const body = [...(o.body || '急急如律令')].slice(0, 7);
    const seal = o.seal || '印';
    const step = Math.min(30, 150 / Math.max(body.length, 1));
    let i = 0;
    const t = (ch, x, y, s, cls) => `<text class="fu-c ${cls || ''}" style="--i:${i++}" x="${x}" y="${y}" font-size="${s}" text-anchor="middle">${esc(ch)}</text>`;
    return `<svg class="fu ${o.cls || ''}" viewBox="0 0 120 380" aria-hidden="true">
      ${o.paper ? `<rect x="0" y="0" width="120" height="380" fill="${o.paper}"/>` : ''}
      <rect class="fu-b" x="4" y="4" width="112" height="372" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <rect class="fu-b" x="10" y="10" width="100" height="360" fill="none" stroke="currentColor" stroke-width=".6"/>
      ${FU_CROWN}
      <path class="fu-s" d="M30 122 H90" fill="none" stroke="currentColor" stroke-width=".8"/>
      ${body.map((c, k) => t(c, 60, 166 + k * step, Math.min(26, step - 2))).join('')}
      <path class="fu-s" d="M60 ${170 + body.length * step} c-26 6 26 14 0 20 c-26 6 26 14 0 20 c-20 4 20 10 0 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path class="fu-s" d="M22 120 V300 M98 120 V300 M22 150 l-6 6 l6 6 M98 210 l6 6 l-6 6 M22 250 l-6 6 l6 6" fill="none" stroke="currentColor" stroke-width=".8"/>
      <g transform="translate(60 344)"><g class="fu-seal"><rect x="-18" y="-18" width="36" height="36" fill="currentColor"/>
        <rect x="-15" y="-15" width="30" height="30" fill="none" stroke="var(--bg, #000)" stroke-width=".8"/>
        <text x="0" y="8" font-size="22" text-anchor="middle" fill="var(--bg, #000)">${esc(seal)}</text></g></g>
    </svg>`;
  };
  /* ---------- 팔괘(八卦) 고리 ---------- */
  window.baguaSVG = (cls, opt = {}) => {
    const pats = ['111', '110', '101', '100', '011', '010', '001', '000'];
    const R = opt.r || 150;
    const g = pats.map((p, k) => {
      const bars = [...p].map((b, i) => {
        const y = -i * 9;
        return b === '1' ? `<rect x="-17" y="${y}" width="34" height="5"/>`
          : `<rect x="-17" y="${y}" width="14" height="5"/><rect x="3" y="${y}" width="14" height="5"/>`;
      }).join('');
      return `<g transform="rotate(${k * 45} 200 200) translate(200 ${200 - R})">${bars}</g>`;
    }).join('');
    return `<svg class="bagua ${cls || ''}" viewBox="0 0 400 400" aria-hidden="true">
      <g class="bg-ring"><circle cx="200" cy="200" r="194" fill="none" stroke="currentColor" stroke-width=".6" opacity=".5"/>
      <circle cx="200" cy="200" r="186" fill="none" stroke="currentColor" stroke-width="6" stroke-dasharray="1 7" opacity=".45"/></g>
      <g class="bg-tri" fill="currentColor">${g}</g>
      <circle cx="200" cy="200" r="${R - 26}" fill="none" stroke="currentColor" stroke-width=".7" stroke-dasharray="3 5" opacity=".6"/>
      ${opt.taiji === false ? '' : `<g transform="translate(200 200)"><g class="bg-taiji">
        <circle r="${R - 50}" fill="none" stroke="currentColor" stroke-width="1"/>
        <path d="M0 ${-(R - 50)} A${R - 50} ${R - 50} 0 0 1 0 ${R - 50} A${(R - 50) / 2} ${(R - 50) / 2} 0 0 1 0 0 A${(R - 50) / 2} ${(R - 50) / 2} 0 0 0 0 ${-(R - 50)}Z" fill="currentColor"/>
        <circle cy="${-(R - 50) / 2}" r="${(R - 50) / 7}" fill="currentColor"/>
        <circle cy="${(R - 50) / 2}" r="${(R - 50) / 7}" fill="var(--bg,#000)" stroke="currentColor"/></g></g>`}
    </svg>`;
  };

  /* ---------- 로고 ---------- */
  window.SITE_MARK = `<span class="mark" aria-hidden="true">${esc([...(C.siteName || '符')][0])}</span>`;

  /* ---------- 메인 왼쪽 아래 배너 (관리자 페이지 '메인 배너' 에서 만들어요) ----------
     b = { tag, title, text, link, c1, c2, angle, ghost } · 바탕이 밝으면 글자를 어둡게 바꿔요 */
  window.lobbyBanner = (b, preview) => {
    const hex = v => /^#[0-9a-f]{6}$/i.test(v || '') ? v : null;
    const c1 = hex(b.c1) || '#2a1f5c', c2 = hex(b.c2) || '#c4b6ff', ang = Math.max(0, Math.min(360, parseInt(b.angle, 10) || 120));
    const lum = h => { const n = parseInt(h.slice(1), 16), f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(n >> 16) + .7152 * f(n >> 8 & 255) + .0722 * f(n & 255); };
    const light = (lum(c1) + lum(c2)) / 2 > .42;
    const link = String(b.link || '').trim(), href = /^(https?:\/\/|[\w-]+\.html)/i.test(link) ? link : '';
    const ext = /^https?:/i.test(href);
    const tagName = preview || !href ? 'div' : 'a';
    return `<${tagName} class="slide cus${light ? ' lt' : ''}"${tagName === 'a' ? ` href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}` : ''}
      style="--g1:${c1};--g2:${c2};--ga:${ang}deg">${b.tag ? `<span class="tag">${esc(b.tag)}</span>` : ''}<b>${esc(b.title || '')}</b>${b.text ? `<p>${esc(b.text)}</p>` : ''}</${tagName}>`;
  };

  /* ---------- 그림이 없을 때: 아무것도 안 보이는 투명한 1px 그림 (예전 검은 실루엣 그림은 없앴어요) ---------- */
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  window.dummyChar = () => BLANK;
  /* "실루엣으로 표시"를 켠 캐릭터 그림은 검은 실루엣 + 붉은 테두리로 */
  window.silClass = data => (data && data.silhouette) ? 'sil' : '';
  /* 캐릭터 대표 그림: 등록한 그림이 없으면 더미 */
  window.charImage = (data, seed) => {
    const d = data || {};
    return safeUrl((d.images && d.images[0] && d.images[0].url) || d.image) || dummyChar(d.name || seed);
  };

  /* ---------- 스크롤 등장 효과: [data-reveal] ---------- */
  window.reveal = (root) => {
    const els = $$('[data-reveal]:not(.in)', root);
    if (!('IntersectionObserver' in window) || REDUCED) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(e => io.observe(e));
  };
  /* 숫자 올라가는 효과 */
  window.countUp = (el, to, ms = 1200) => {
    if (REDUCED) { el.textContent = to; return; }
    const t0 = performance.now();
    const f = t => { const p = Math.min(1, (t - t0) / ms); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  };
  /* 타자 효과 */
  window.typeText = (el, text, speed = 28) => {
    if (REDUCED) { el.textContent = text; return; }
    el.textContent = ''; let i = 0; el.classList.add('typing');
    const tick = () => { el.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(tick, speed); else el.classList.remove('typing'); };
    tick();
  };

  /* ---------- 헤더 / 푸터 ---------- */
  const NAV = [
    ['home', 'index.html', '소개', '序'],
    ['world', 'https://samsaraworld.vercel.app/world.html', '세계관', '界', true],   // 세계관은 선공개 사이트로 (새 탭)
    ['characters', 'characters.html', '캐릭터', '人'],
    ['board', 'board.html', '사건 보드', '案'],
    ['attend', 'attendance.html', '출석', '印'],
    ['shop', 'shop.html', '상점', '市']
  ];
  function renderChrome(user) {
    const page = document.body.dataset.page;
    if (document.body.dataset.noheader === undefined) {
      const h = document.createElement('header');
      h.className = 'site-header';
      h.innerHTML = `
        <a class="brand" href="index.html">${SITE_MARK}<span class="bn">${esc(C.siteName || '')}<small>${esc(C.siteNameKo || '')}</small></span></a>
        <nav class="nav">${NAV.concat(user && user.grade === 'admin' ? [['admin', 'admin.html', '관리', '管']] : []).map(([k, href, label, han, ext]) =>
          `<a href="${href}" class="${k === page ? 'on' : ''}"${ext ? ' target="_blank" rel="noopener"' : ''}><i>${han}</i>${label}</a>`).join('')}</nav>
        <div class="auth">${user
          ? `<button class="mail-btn tele-btn" data-tele-open aria-label="심박 텔레파시" title="심박 텔레파시">♥<b class="mail-badge" hidden></b></button><a class="who" href="mypage.html" title="마이 페이지">${esc(user.nickname)}</a><button class="btn ghost sm" data-logout>로그아웃</button>`
          : `<a class="btn sm" href="login.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}">입장</a>`}</div>
        <button class="menu-btn" aria-label="메뉴">${'<i></i>'.repeat(3)}</button>`;
      document.body.prepend(h);
      h.querySelector('.menu-btn').onclick = () => h.classList.toggle('open');
      const lo = h.querySelector('[data-logout]');
      if (lo) lo.onclick = async () => { await Store.signOut(); location.href = 'login.html'; };
      addEventListener('scroll', () => h.classList.toggle('scrolled', scrollY > 10), { passive: true });
    }
    if (document.body.dataset.nofooter === undefined) {
      const f = document.createElement('footer');
      f.className = 'site-footer';
      f.innerHTML = `<div class="meander"></div><div class="f-name">${esc(C.siteName || '')}</div>
        <p>${esc(C.siteMotto || '')}</p><small>© 2026 ${esc(C.siteNameKo || '')}</small>`;
      document.body.appendChild(f);
    }
    if (user) { // 텔레파시 팝업 불러오기
      const s = document.createElement('script'); s.src = 'assets/js/tele.js'; document.body.appendChild(s);
    }
    if (user) checkNews(user);
    // 사이트 BGM (관리자 페이지에서 설정)
    const bg = document.createElement('script'); bg.src = 'assets/js/bgm.js'; document.body.appendChild(bg);
    // 등록·수정 기간 안내 띠
    if (user && document.body.dataset.noheader === undefined) Store.settings().then(s => {
      const e = Store.windowState(s, 'edit'), c = Store.windowState(s, 'create');
      const parts = [];
      if (e.open) parts.push(`✎ 수정 기간${e.until ? ' · ' + dday(e.until) : ''}`);
      if (c.open && c.mode === 'scheduled') parts.push(`✦ 등록 기간${c.until ? ' · ' + dday(c.until) : ''}`);
      if (!parts.length) return;
      const b = document.createElement('div'); b.className = 'period-bar';
      b.innerHTML = parts.map(p => `<span>${esc(p)}</span>`).join('');
      document.body.appendChild(b);
    }).catch(() => {});
    if (Store.mode === 'demo') {
      const b = document.createElement('div');
      b.className = 'demo-badge';
      b.innerHTML = '<b>DEMO</b> 데이터가 이 브라우저에만 저장돼요';
      b.title = 'config.js 에 Supabase 주소를 넣으면 실제 회원가입/공유 저장이 켜집니다.';
      document.body.appendChild(b);
    }
  }

  /* 내 캐릭터가 게시·반려되면 알림 (마지막으로 본 상태와 비교) */
  async function checkNews(user) {
    let mine = [];
    try { mine = await Store.myCharacters(); } catch (e) { return; }
    const KEY = 'naru:seen:' + user.id, NEWS = 'naru:news:' + user.id;
    let seen = null, news = [];
    try { seen = JSON.parse(localStorage.getItem(KEY)); news = JSON.parse(localStorage.getItem(NEWS) || '[]'); } catch (e) {}
    const mark = c => `${c.status}|${c.published_at || ''}|${c.review_note || ''}`;
    const next = {};
    mine.forEach(c => {
      next[c.id] = mark(c);
      if (!seen || seen[c.id] === next[c.id]) return; // 처음 방문이면 기록만
      const name = ((c.draft || c.data) || {}).name || '?';
      if (c.status === 'published') news.unshift({ id: c.id, t: 'pub', text: `✦ "${name}" 이(가) 게시됐어요!`, at: c.published_at || new Date().toISOString() });
      if (c.status === 'returned') news.unshift({ id: c.id, t: 'ret', text: `↩ "${name}" 이(가) 반려됐어요${c.review_note ? ' — ' + c.review_note : ''}`, at: new Date().toISOString() });
    });
    if (seen) news.filter(n => !n.shown).forEach((n, i) => { n.shown = true; setTimeout(() => toast(n.text, n.t === 'ret' ? 'err' : ''), 600 + i * 900); });
    try { localStorage.setItem(KEY, JSON.stringify(next)); localStorage.setItem(NEWS, JSON.stringify(news.slice(0, 30))); } catch (e) {}
  }
  window.myNews = uid => { try { return JSON.parse(localStorage.getItem('naru:news:' + uid) || '[]'); } catch (e) { return []; } };

  function dday(iso) {
    const ms = Date.parse(iso) - Date.now(); if (isNaN(ms)) return '';
    const d = Math.floor(ms / 864e5);
    if (d >= 1) return `D-${d}`;
    const h = Math.max(0, Math.floor(ms / 36e5));
    return h >= 1 ? `${h}시간 남음` : '곧 마감';
  }
  window.dday = dday;

  /* ---------- 불씨/재 배경 ---------- */
  function embers() {
    const c = document.createElement('canvas');
    c.className = 'embers'; document.body.prepend(c);
    const x = c.getContext('2d');
    let W, H, list = [];
    const spawn = (y) => ({
      x: Math.random() * W, y: y == null ? H + 10 : y,
      vy: -(.15 + Math.random() * .6), vx: (Math.random() - .5) * .2,
      r: .5 + Math.random() * 1.8, p: Math.random() * 6.28,
      ash: Math.random() < .25, life: 0
    });
    function size() {
      const d = 1;   // 작은 빛 가루라 고해상도로 그릴 필요가 없어요 (가볍게)
      W = innerWidth; H = innerHeight; c.width = W * d; c.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
      list = Array.from({ length: Math.min(60, Math.round(W * H / 24000)) }, () => spawn(Math.random() * H));
    }
    let lastT = 0;
    function draw(t) {
      // 초당 30번만 그리고, 탭이 안 보일 땐 쉬어요
      if (document.hidden || t - lastT < 32) { if (!REDUCED) requestAnimationFrame(draw); return; }
      lastT = t;
      x.clearRect(0, 0, W, H);
      x.globalCompositeOperation = 'lighter';
      for (const s of list) {
        if (!REDUCED) { s.y += s.vy * 2; s.x += s.vx * 2 + Math.sin(t / 1400 + s.p) * .5; }
        if (s.y < -10) Object.assign(s, spawn());
        const fl = .55 + .45 * Math.sin(t / 260 + s.p * 3);
        const a = Math.min(1, (H - s.y) / 200) * Math.min(1, s.y / 160) * fl;
        // 은은한 별빛 가루 (곤색 · 흰색 테마)
        if (s.ash) { x.fillStyle = `rgba(170,180,205,${a * .3})`; x.beginPath(); x.arc(s.x, s.y, s.r * .7, 0, 6.28); x.fill(); continue; }
        x.fillStyle = `rgba(150,175,230,${a * .1})`; x.beginPath(); x.arc(s.x, s.y, s.r * 4, 0, 6.28); x.fill();
        x.fillStyle = `rgba(${225 + (s.p * 5 | 0)},235,255,${a * .8})`; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.28); x.fill();
      }
      x.globalCompositeOperation = 'source-over';
      if (!REDUCED) requestAnimationFrame(draw);
    }
    size(); addEventListener('resize', size); requestAnimationFrame(draw);
  }

  window.App = {
    ready: (async () => {
      if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r));
      let user = null;
      try { user = await Store.user(); } catch (e) { console.error(e); }
      // 입장 문: 로그인(승인된 회원)하지 않으면 입장 화면으로 (관리자가 "비회원 둘러보기"를 켜면 예외)
      if (!user && document.body.dataset.page !== 'login') {
        let open = false; try { open = (await Store.settings()).public_view; } catch (e) {}
        if (!open) {
          location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
          return new Promise(() => {}); // 페이지 스크립트는 더 진행하지 않음
        }
      }
      document.documentElement.classList.remove('gate');
      if (document.body.dataset.embers !== undefined) embers();
      // 배경 영상 자동재생 보장 (브라우저가 건너뛴 경우 다시 재생)
      const kick = () => $$('video[autoplay]').forEach(v => { if (v.paused && !REDUCED) { v.muted = v.muted !== false ? v.muted : true; v.play().catch(() => {}); } });
      kick();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
      addEventListener('pointerdown', kick, { once: true });
      renderChrome(user);
      reveal();
      return user;
    })()
  };
})();
