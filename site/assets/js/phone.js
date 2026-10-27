/* ================================================================
   관계 휴대폰
   · 다른 캐릭터가 "나"를 연관 캐릭터로 등록하며 적은 메시지가
     내 휴대폰 잠금 화면 알림으로 떠요 (아이메시지 / 문자 / 부재중 전화)
   · 잠금 화면만 있어요 (연락처 화면은 없앴어요)
   ================================================================ */
window.Phone = (function () {
  const ICON = {
    imessage: '<svg viewBox="0 0 24 24"><path d="M12 3.5c-5 0-9 3.3-9 7.4 0 2.3 1.3 4.4 3.3 5.8-.2 1.3-.9 2.5-1.9 3.4 2 0 3.7-.8 4.9-1.9.9.2 1.8.3 2.7.3 5 0 9-3.3 9-7.4S17 3.5 12 3.5z" fill="#fff"/></svg>',
    sms: '<svg viewBox="0 0 24 24"><path d="M12 3.5c-5 0-9 3.3-9 7.4 0 2.3 1.3 4.4 3.3 5.8-.2 1.3-.9 2.5-1.9 3.4 2 0 3.7-.8 4.9-1.9.9.2 1.8.3 2.7.3 5 0 9-3.3 9-7.4S17 3.5 12 3.5z" fill="#fff"/><circle cx="8" cy="11" r="1.2" fill="#30d158"/><circle cx="12" cy="11" r="1.2" fill="#30d158"/><circle cx="16" cy="11" r="1.2" fill="#30d158"/></svg>',
    missed: '<svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" fill="#fff"/></svg>'
  };
  const LABEL = { imessage: '아이메시지', sms: '문자 메시지', missed: '전화' };
  const lockSVG = '<svg class="ph-lockic" viewBox="0 0 14 18"><rect x="1" y="7.5" width="12" height="9.5" rx="2" fill="#fff"/><path d="M3.5 7.5V5a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="#fff" stroke-width="1.8"/></svg>';
  const wifi = '<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.6 7a6.3 6.3 0 0 1 8.8 0l-1.3 1.3a4.5 4.5 0 0 0-6.2 0zM1.2 4.6a9.7 9.7 0 0 1 13.6 0l-1.3 1.3a7.9 7.9 0 0 0-11 0z" fill="#fff"/></svg>';

  let ov = null;
  function open(row, all, opt = {}) {
    close(true);
    const d = normChar(row.data);
    const nameOf = c => (c.data && c.data.name) || '?';
    // 나를 연관 캐릭터로 등록한 사람들의 메시지
    const notis = [];
    all.forEach(c => {
      if (c.id === row.id) return;
      ((c.data && c.data.related) || []).forEach(r => {
        if (r.id !== row.id || !r.msgType) return;
        notis.push({ from: c, type: r.msgType, msg: r.msg || '', rel: r.rel || '',
          time: r.time || '', missed: Math.max(1, parseInt(r.missed, 10) || 1) });
      });
    });
    const el = ELEMENTS[d.element];
    const now = new Date();
    const clock = `${now.getHours() % 12 || 12}:${pad2(now.getMinutes())}`;
    const date = `${now.getMonth() + 1}월 ${now.getDate()}일 ${'일월화수목금토'[now.getDay()]}요일`;

    // 키링: 없음 / 영어 스트랩(은색) / 아크릴 (편집 창 '기본' 탭)
    const krOut = window.Keyring ? Keyring.html(d.keyring) : null;
    ov = document.createElement('div');
    ov.className = 'ph-back' + (opt.preview ? ' preview' : ''); ov.style.setProperty('--c', d.color);
    if (opt.preview) ov.style.zIndex = 260;   // 편집 창(200) 위에
    ov.innerHTML = `<button class="ph-x">CLOSE ✕</button>
      <div class="ph-stage"><div class="phone ph-rise">
        <div class="ph-case"><span class="ph-side a"></span><span class="ph-side b"></span><span class="ph-side c"></span><span class="ph-side d"></span><span class="ph-hole"></span>
          <div class="ph-screen off">
            <div class="ph-wall grad" data-han="${esc(el ? el.han : '符')}"></div>
            <div class="ph-island"></div>
            <div class="ph-status"><span>${clock}</span><span class="ph-icons"><span class="ph-sig"><i></i><i></i><i></i><i></i></span>${wifi}<span class="ph-bat"><i></i></span></span></div>
            <section class="ph-lock">
              ${lockSVG}
              <div class="ph-date">${date}</div>
              <div class="ph-clock">${clock}</div>
              <div class="ph-owner">${esc(d.name)}의 휴대폰</div>
              <div class="ph-notis">${notis.length ? notis.map((n, i) => notiHTML(n, i)).join('') : '<p class="ph-none">새로운 알림 없음</p>'}</div>
              <div class="ph-bottom"><button class="ph-round" aria-label="손전등">🔦</button><span class="ph-hint"></span><button class="ph-round" aria-label="카메라">📷</button></div>
            </section>
            <div class="ph-indicator"></div>
          </div>
        </div>
        ${krOut ? `<span class="ph-lug" aria-hidden="true"><svg viewBox="0 0 14 22"><defs><linearGradient id="lugG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".4" stop-color="#8f98a2"/><stop offset=".6" stop-color="#eef1f4"/><stop offset="1" stop-color="#6f7881"/></linearGradient></defs>
          <path d="M0 3.2H5.8A7.8 7.8 0 0 1 5.8 18.8H0" fill="none" stroke="url(#lugG)" stroke-width="3.2"/><path d="M1 4.4H5.6" stroke="#fff" stroke-width=".7" opacity=".8"/></svg></span>
          <div class="kr kr-${esc(d.keyring.type)}" title="키링">${krOut.html}</div>` : ''}
      </div></div>
      <div class="ph-cap">${opt.preview ? 'PREVIEW · 저장 전 미리보기' : 'TAP A NOTIFICATION'}</div>`;
    document.body.appendChild(ov);
    document.body.classList.add('no-scroll');

    // 키링은 폰 오른쪽 위 고리에 걸려 옆으로 늘어지니, 가로 자리를 조금 더 잡아요
    const hang = 0, sideW = krOut ? 380 + 130 : 380;
    const fit = () => {
      const s = Math.min(1, (innerHeight - 70) / (700 + hang), (innerWidth - 30) / sideW), st = $('.ph-stage', ov);
      st.style.setProperty('--s', s.toFixed(3)); st.style.marginTop = (-hang * s) + 'px';
    };
    fit(); addEventListener('resize', fit);
    // 화면이 켜지는 연출
    const scr = $('.ph-screen', ov);
    setTimeout(() => { scr.classList.remove('off'); scr.classList.add('on'); }, 750);

    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.closest('.ph-x')) return close();
      const n = e.target.closest('.noti');
      if (n) {
        if (e.target.closest('.go')) return; // 링크는 그대로 이동
        n.classList.toggle('open'); return;
      }
      const k = e.target.closest('.kr');
      if (k) { k.classList.remove('again'); void k.offsetWidth; k.classList.add('again'); }
    });
    const kr = $('.kr', ov); if (kr) kr.addEventListener('pointerenter', () => { kr.classList.remove('again'); void kr.offsetWidth; kr.classList.add('again'); });
    ov._k = e => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', ov._k);
    ov._fit = fit;
  }

  // iOS 잠금 화면 알림 모양: 왼쪽 연락처 사진 + 오른쪽 아래 작은 앱 아이콘 / 이름 · 시간 / 내용
  // (부재중 전화는 실제 아이폰처럼 전화 앱 아이콘 + "부재중 전화")
  function notiHTML(n, i) {
    const who = esc(nameOf(n.from));
    const av = cssUrl(charImage(n.from.data, n.from.id));
    const t = n.time ? esc(n.time) : (i === 0 ? '지금' : `${(i * 7) + 2}분 전`);
    const missed = n.type === 'missed';
    const lead = missed
      ? `<span class="ic app phone">${ICON.missed}</span>`
      : `<span class="ic"><span class="av" style="background-image:${av}"></span><span class="badge ${n.type}">${ICON.imessage}</span></span>`;
    const body = missed
      ? `<div class="ttl"><b>부재중 전화</b><time>${t}</time></div><div class="msg">${who}${n.missed > 1 ? ` (${n.missed})` : ''}${n.msg ? '\n' + esc(n.msg) : ''}</div>`
      : `<div class="ttl"><b>${who}</b><time>${t}</time></div><div class="msg">${esc(n.msg) || '…'}</div>`;
    // 누르면 잘린 메시지가 펼쳐지기만 해요
    return `<div class="noti ${n.type}" style="--i:${i}" role="button" tabindex="0">${lead}${body}</div>`;
  }
  function nameOf(c) { return (c.data && c.data.name) || '?'; }

  function close(instant) {
    if (!ov) return;
    const o = ov; ov = null;
    removeEventListener('keydown', o._k); removeEventListener('resize', o._fit);
    if (instant) { o.remove(); return; }
    o.classList.add('out');
    setTimeout(() => { o.remove(); if (!$('.ph-back') && !$('.arc-open') && !$('.modal-back')) document.body.classList.remove('no-scroll'); }, 480);
  }
  return { open, close };
})();
