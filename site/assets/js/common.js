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
  /* ---------- 두상 움짤 가볍게 ----------
     imgur GIF 는 같은 주소의 .mp4 영상이 자동으로 있어요 (보통 10배 이상 가벼움) → 영상으로 틀고, 첫 장면 그림(약 30KB)을 먼저 깔아 둬요.
     영상이 없거나 · 아이폰 저전력 모드처럼 자동 재생이 막히면 원래 GIF 로 돌아가요. 투명 배경 GIF 는 영상에서 배경이 채워질 수 있어요. */
  const IMGUR_GIF = /^https:\/\/i\.imgur\.com\/([A-Za-z0-9]+)\.gif(?:[?#].*)?$/i;
  window.headMp4 = url => { const m = IMGUR_GIF.exec(String(url || '').trim()); return m ? { mp4: `https://i.imgur.com/${m[1]}.mp4`, poster: `https://i.imgur.com/${m[1]}l.jpg` } : null; };
  window.headHTML = (url, cls = '') => { const v = headMp4(url);
    return v ? `<video class="${cls}" src="${esc(v.mp4)}" poster="${esc(v.poster)}" data-gif="${esc(url)}" autoplay muted loop playsinline preload="auto" disablepictureinpicture aria-hidden="true"></video>`
      : `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`; };
  const toGif = v => { if (!v.dataset.gif || !v.isConnected) return; const i = document.createElement('img');
    i.className = v.className; i.alt = ''; i.decoding = 'async'; i.referrerPolicy = 'no-referrer'; i.src = v.dataset.gif; v.replaceWith(i); };
  document.addEventListener('error', e => { const v = e.target; if (v && v.matches && v.matches('video[data-gif]')) toGif(v); }, true);
  document.addEventListener('loadeddata', e => { const v = e.target; if (!(v && v.matches && v.matches('video[data-gif]')) || !v.paused) return;
    const p = v.play(); if (p) p.catch(err => { if (err && err.name === 'NotAllowedError') toGif(v); }); }, true);

  /* ---------- 글 서식 태그 ----------
     <태그>글자</태그> 로 쓰면 캐릭터 색으로 꾸며져요. 칸마다 쓸 수 있는 태그가 달라요 (목록에 없는 태그는 쓴 글 그대로 보여요).
     흰색~회색 계열 캐릭터 색은 pale: 빛은 굵은 흰 글씨, 메일은 회색 화면
     서식 안에 다른 서식은 안 먹혀요 (겹쳐 쓰면 안쪽은 글자 그대로) · 성격은 서식 종류 3개까지 */
  const FMT_LINE = ['c', '강조', '밑줄', '점', '빛글', '검열', '흐림', '메모', '떨림', '지움', '타자', '반짝', '네온', '도장'];
  window.FMT = { persona: [...FMT_LINE, '무물', '무물단색', '문자', '네이버', '송금'], skill: ['c', '강조', '밑줄', '점', '네이버'], item: ['문자', '메일', '받은메일', '후원', '별점', '음악', '트윗', '알티', '네이버', '송금'] };
  window.FMT_MAX = { persona: 3 };   // 칸마다 쓸 수 있는 서식 종류 수 (먼저 쓴 순서대로 · 넘치는 종류는 글자 그대로)
  const FMT_BLOCK = ['무물', '무물단색', '문자', '메일', '받은메일', '후원', '별점', '음악', '트윗', '알티', '네이버', '송금'];
  const FMT_CLS = { c: 'tf-c', 강조: 'tf-hl', 밑줄: 'tf-u', 점: 'tf-dot', 빛글: 'tf-gr', 검열: 'tf-red', 흐림: 'tf-blur', 메모: 'tf-pen', 떨림: 'tf-shake', 지움: 'tf-del', 반짝: 'tf-shine', 네온: 'tf-neon', 도장: 'tf-seal' };
  const fmtTone = color => {
    const c = /^#[0-9a-f]{6}$/i.test(color) ? color : '#c8161d', n = parseInt(c.slice(1), 16);
    const ch = [n >> 16, n >> 8 & 255, n & 255], mx = Math.max(...ch), mn = Math.min(...ch);
    // 흰색 · 회색만 pale (빨강 · 초록 · 파랑 차이가 거의 없는 색) · #ffe4ec 같은 아주 옅은 색도 색이 보이면 캐릭터 색 그대로
    return { c, pale: mx - mn < 10 && (mx + mn) / 2 > 100, ink: (ch[0] * .299 + ch[1] * .587 + ch[2] * .114) > 150 ? '#111' : '#fff' };
  };
  const unent = s => s.replace(/&(lt|gt|amp|quot|#39);/g, m => ({ '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'" })[m]);
  const parts = t => t.split('|').map(x => x.trim());
  const ML_IC = {
    sig: '<svg width="16" height="14" viewBox="0 0 16 14" fill="currentColor"><rect y="10" width="3" height="4"/><rect x="4" y="7" width="3" height="7"/><rect x="8" y="4" width="3" height="10"/><rect x="12" width="3" height="14"/></svg>',
    bat: '<svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor"><rect x="1" y="1" width="18" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="19" y="4" width="3" height="6"/><rect x="4" y="4" width="3" height="6"/><rect x="8" y="4" width="3" height="6"/><rect x="12" y="4" width="3" height="6"/></svg>',
    clk: '<svg width="13" height="13" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="5.5" fill="#fff"/><path d="M6.5 3v4h3" stroke="var(--mb)" stroke-width="1.6" fill="none"/></svg>',
    memo: '<svg width="12" height="13" viewBox="0 0 12 13"><rect x="1" y="1" width="10" height="11" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M3 4h6M3 6.5h6M3 9h6" stroke="#fff" stroke-width="1.2"/></svg>'
  };
  const STAR = 'M50 8 L61.17 32.63 L88.04 35.64 L68.07 53.87 L73.51 80.36 L50 67 L26.49 80.36 L31.93 53.87 L11.96 35.64 L38.83 32.63 Z';
  let fmtSeq = 0;
  const FMT_BUILD = {
    무물단색: (t, o) => FMT_BUILD.무물(t, o, true),   // 머리 띠에 검은 그라데이션 없이 캐릭터 색 한 가지로
    무물: (t, o, flat) => { const [q, ...a] = parts(t), ans = a.join(' | ');
      return `<div class="tf-qa${flat ? ' flat' : ''}"><div class="qh"><small>무엇이든 물어보세요</small>${esc(o.name || '')}에게 질문하기</div><div class="qb"><b>Q.</b>${q}</div>${ans ? `<div class="qa">${ans}</div>` : ''}</div>`; },
    문자: (t, o) => {
      const rows = t.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^([^:：]{1,20})[:：]\s*([\s\S]*)$/); return m ? [m[1].trim(), m[2]] : ['', l]; });
      let out = '', prev = null;
      rows.forEach(([who, say], i) => {
        if (who === '시간') { out += `<div class="ts">${say}</div>`; prev = null; return; }
        if (who === '읽음') { out += `<div class="rd"><b>읽음</b> ${say}</div>`; prev = null; return; }
        const me = who === '나', nx = rows[i + 1], last = !nx || nx[0] !== who;
        if (!me && who && who !== prev) out += `<div class="tnm">${who}</div>`;
        out += `<div class="b ${me ? 'm' : 'o'}${last ? ' t' : ''}">${say}</div>`; prev = who;
      });
      return `<div class="tf-im${o.ka ? ' ka' : ''}">${out}</div>`; },   // ka: 같은 칸에 송금이 있으면 카카오톡 색으로
    메일: (t, o, inbox) => { const [when = '', who = '', sub = '', ...b] = parts(t), body = b.join(' | ');
      const no = String(++o.mail).padStart(3, '0'), hm = (unent(when).match(/\d{1,2}:\d{2}/) || ['--:--'])[0];
      return `<div class="tf-ml${inbox ? ' in' : ''}"><div class="bar">${ML_IC.sig}${ML_IC.bat}<span class="tm">${hm}</span></div>`
        + `<div class="tt">${inbox ? '받은' : '보낸'} 메일${no}<span class="nv"><span>이전</span><span>다음</span></span></div>`
        + `<div class="hd"><div class="ic"><i>${ML_IC.clk}</i><i>${inbox ? 'Fr' : 'To'}</i><i>${ML_IC.memo}</i></div><div class="inf"><div>${when}</div><div>${who}</div><div>${sub}</div></div></div>`
        + `<div class="bd">${body}${inbox ? '' : '<span class="cur"></span>'}</div></div>`; },
    받은메일: (t, o) => FMT_BUILD.메일(t, o, true),
    후원: t => { const [nick = '', cnt = '', ...m] = parts(t), msg = m.join(' | '), n = parseInt(unent(cnt).replace(/[^\d]/g, ''), 10);
      const num = isNaN(n) ? cnt : n.toLocaleString('ko-KR'), id = 'tfst' + (++fmtSeq);
      return `<div class="tf-dn"><span class="sp"></span><span class="sp"></span><span class="sp"></span>`
        + `<svg class="bl" viewBox="0 0 100 124" aria-hidden="true"><defs><radialGradient id="${id}" cx=".38" cy=".3" r=".75"><stop offset="0" style="stop-color:color-mix(in srgb, var(--g) 30%, #fff)"/><stop offset=".5" style="stop-color:var(--g)"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--g) 60%, #000)"/></radialGradient></defs>`
        + `<path d="M50 76 Q44 92 52 104 Q58 113 50 122" stroke="rgba(255,255,255,.55)" stroke-width="1.4" fill="none"/><path d="M46 72 h8 l-2 6 h-4 z" style="fill:color-mix(in srgb, var(--g) 60%, #000)"/>`
        + `<path d="${STAR}" fill="url(#${id})" stroke="url(#${id})" stroke-width="13" stroke-linejoin="round"/>`
        + `<path d="${STAR}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.2" stroke-linejoin="round" transform="translate(50 46) scale(.62) translate(-50 -46)"/>`
        + `<ellipse cx="38" cy="30" rx="7" ry="3.6" transform="rotate(-35 38 30)" fill="#fff" opacity=".8"/><circle cx="31" cy="38" r="1.8" fill="#fff" opacity=".7"/></svg>`
        + `<div class="l1"><span class="nk">${nick}</span>님 별풍선 <span class="ct" data-n="${esc(num)}"><i>${num}</i></span>개</div><div class="l2">감사합니다!</div>${msg ? `<div class="ms">${msg}</div>` : ''}</div>`; },
    별점: (t, o, _, raw) => { const [ti = '', sc = '', ...r] = parts(t), cm = r.join(' | ').trim();
      if (!ti || !cm) return raw;   // 제목 · 코멘트가 없으면 서식이 안 걸리고 쓴 글 그대로
      const n = Math.round(Math.max(0, Math.min(5, parseFloat(unent(sc)) || 0)) * 2) / 2, head = safeUrl(o.head);
      return `<div class="tf-rt"><div class="twho">${head ? `<img src="${esc(head)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<i>${esc((o.name || '?').slice(0, 1))}</i>`}${esc(o.name || '')}<span class="sc"><b>★</b>${n.toFixed(1)}</span></div>`
        + `<div class="ti">${ti}</div><span class="st">★★★★★<span style="width:${n / 5 * 100}%">★★★★★</span></span><div class="cm">${cm}</div></div>`; },
    // 음악 재생 위젯: 제목 | 가수 | 길이(3:24) | 표지 이미지 링크(선택) · ▶ 누르면 실제로 시간이 흘러가요
    // 표지를 안 적으면 내 캐릭터 두상 (다른 캐릭터 정보는 안 불러와요)
    음악: (t, o) => { const [ti = '', ar = '', len = '', cov = ''] = parts(t), m = unent(len).match(/(\d{1,2}):(\d{2})/), dur = m ? +m[1] * 60 + +m[2] : 200, img = safeUrl(unent(cov)) || safeUrl(o.head);
      const I = (d, w = 16) => `<svg width="${w}" height="${w}" viewBox="0 0 16 16" fill="currentColor">${d}</svg>`;
      return `<div class="tf-sp" data-dur="${dur}" data-t="0"><div class="sp-top"><div class="sp-cov"${img ? ` style="background-image:url('${esc(img)}')"` : ''}>${img ? '' : '♪'}</div>`
        + `<div class="sp-tx"><b>${ti}</b><span>${ar}</span></div><span class="sp-hrt">${I('<path d="M8 14s-5.5-3.4-5.5-7.3A3.1 3.1 0 0 1 8 4.6a3.1 3.1 0 0 1 5.5 2.1C13.5 10.6 8 14 8 14z"/>')}</span></div>`
        + `<div class="sp-bar"><i></i></div><div class="sp-tm"><span class="sp-a">0:00</span><span>${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}</span></div>`
        + `<div class="sp-ctl"><span>${I('<path d="M11 2h3v3l-1-1-3 3-1-1 3-3zM2 4h3l7 8h-1l1-1v3h-3l1-1-6.5-8H2zM2 12h3l1.5-1.8.8.9L5.5 13H2z"/>', 15)}</span>`
        + `<span>${I('<path d="M3 3h2v10H3zM13 3v10L6 8z"/>')}</span><button type="button" class="sp-pl" aria-label="재생">${I('<path class="pl" d="M5 3l9 5-9 5z"/><path class="pa" d="M4 3h3v10H4zM9 3h3v10H9z"/>', 18)}</button>`
        + `<span>${I('<path d="M11 3h2v10h-2zM3 3v10l7-5z"/>')}</span><span>${I('<path d="M3 6a3 3 0 0 1 3-3h6V1l3 3-3 3V5H6a1 1 0 0 0-1 1v2H3zM13 10a3 3 0 0 1-3 3H4v2l-3-3 3-3v2h6a1 1 0 0 0 1-1V8h2z"/>', 15)}</span></div></div>`; },
    // 트윗 (내 캐릭터가 쓴 글): @아이디 | 내용 | 시간(선택)
    트윗: (t, o) => { const [id = '', ...r] = parts(t), last = r.length > 1 ? r[r.length - 1] : '', body = (r.length > 1 ? r.slice(0, -1) : r).join(' | ');
      return fmtTweet({ name: esc(o.name || ''), id, body, time: last, head: safeUrl(o.head), initial: esc((o.name || '?').slice(0, 1)) }); },
    // 알티 (내 캐릭터가 남의 글을 재게시): 이름 | @아이디 | 내용 | 시간(선택)
    알티: (t, o) => { const [nm = '', id = '', ...r] = parts(t), last = r.length > 1 ? r[r.length - 1] : '', body = (r.length > 1 ? r.slice(0, -1) : r).join(' | ');
      const hd = o.headOf ? safeUrl(o.headOf(unent(nm))) : '';   // 멤버란에 같은 이름이 있으면 그 캐릭터 두상
      return fmtTweet({ name: nm, id, body, time: last, head: hd, initial: (unent(nm) || '?').slice(0, 1), rtBy: esc(o.name || '') }); },
    // 검색창: 검색 칸에 쓸 글 | 최근 검색어 | 최근 검색어 … (최대 10개)
    네이버: t => { const [q = '', ...r] = parts(t), list = r.filter(Boolean).slice(0, 10);
      return `<div class="tf-nv"><div class="nv-box"><i>N</i><span class="nv-q">${q}</span><svg class="nv-s" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l5 5"/></svg></div>`
        + (list.length ? `<div class="nv-h"><b>최근 검색어</b><span>전체삭제</span></div><ul>${list.map(x => `<li><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="7" cy="7" r="5.6"/><path d="M7 3.8V7l2.2 1.4"/></svg><span>${x}</span><em>×</em></li>`).join('')}</ul>` : '') + `</div>`; },
    // 송금 카드: 금액만 적으면 쉼표를 붙여요 · 숫자가 아니면 서식이 안 걸려요 · 그림은 이 서식을 쓴 화면에서만 받아요
    송금: (t, o, _, raw) => { const n = parseInt(unent(t).replace(/[^\d]/g, ''), 10); if (isNaN(n)) return raw;
      return `${o.ka ? '<div class="tf-kw">' : ''}<div class="tf-kp"><img src="assets/img/fmt/kakao-send.webp" alt="" width="360" height="239" loading="lazy" decoding="async"><div class="kp-b"><div class="kp-am"><b>${n.toLocaleString('ko-KR')}원</b>을 받으세요.</div><button type="button" class="kp-btn">받기</button></div><div class="kp-ft">카카오페이</div></div>${o.ka ? '</div>' : ''}`; }
  };
  const TW_IC = {
    rp: '<path d="M2 7.5A5 5 0 0 1 7 2.5h2a5 5 0 0 1 0 10H8l-3 2.5v-3A5 5 0 0 1 2 7.5z" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    rt: '<path d="M4 2L1 5h2v6a2 2 0 0 0 2 2h5v-1.6H5.2a.6.6 0 0 1-.6-.6V5h2zM12 14l3-3h-2V5a2 2 0 0 0-2-2H6v1.6h4.8c.3 0 .6.3.6.6V11h-2z"/>',
    lk: '<path d="M8 14s-5.5-3.4-5.5-7.3A3.1 3.1 0 0 1 8 4.6a3.1 3.1 0 0 1 5.5 2.1C13.5 10.6 8 14 8 14z" fill="none" stroke="currentColor" stroke-width="1.4"/>',
    sh: '<path d="M8 1.5l3.5 3.5-1 1L8.7 4.2V10H7.3V4.2L5.5 6l-1-1zM2.5 9h1.4v4h8.2V9h1.4v5.4H2.5z"/>'
  };
  const twI = d => `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">${d}</svg>`;
  function fmtTweet(w) {
    const id = w.id ? (w.id.startsWith('@') ? w.id : '@' + w.id) : '';
    return `<div class="tf-tw${w.rtBy ? ' rt' : ''}">${w.rtBy ? `<div class="tw-rt">${twI(TW_IC.rt)}<span>${w.rtBy} 님이 재게시했습니다</span></div>` : ''}`
      + `<div class="tw-row"><div class="tw-av">${w.head ? `<img src="${esc(w.head)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<i>${w.initial}</i>`}</div>`
      + `<div class="tw-b"><div class="tw-h"><b>${w.name}</b><span>${id}${w.time ? ` · ${w.time}` : ''}</span></div><div class="tw-t">${w.body}</div>`
      + `<div class="tw-a"><span>${twI(TW_IC.rp)}</span><span class="${w.rtBy ? 'on' : ''}">${twI(TW_IC.rt)}</span><span>${twI(TW_IC.lk)}</span><span>${twI(TW_IC.sh)}</span></div></div></div></div>`;
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.tf-kp .kp-btn'); if (b) { b.textContent = '받기 완료'; b.disabled = true; } });
  // 음악 위젯: ▶ / ❚❚ · 1초마다 진행 막대가 흘러가요 (끝나면 처음으로)
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.tf-sp .sp-pl'); if (b) b.closest('.tf-sp').classList.toggle('on'); });
  setInterval(() => document.querySelectorAll('.tf-sp.on').forEach(p => {
    const dur = +p.dataset.dur || 200; let t = (+p.dataset.t || 0) + 1; if (t > dur) { t = 0; p.classList.remove('on'); }
    p.dataset.t = t; p.querySelector('.sp-a').textContent = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); p.style.setProperty('--p', (t / dur * 100) + '%');
  }), 1000);
  // s: 쓴 글 · ch: { color, name, head } · allow: FMT.persona 같은 허용 목록 · max: 서식 종류 수 제한
  // 한 번에 훑어서 바꿔요 → 서식 안의 서식은 그대로 글자 (무물 박스 안에 빛 X)
  window.fmtText = (s, ch, allow, max) => {
    const tone = fmtTone(ch && ch.color), o = { name: ch && ch.name, head: ch && ch.head, headOf: ch && ch.headOf, mail: 0 };
    const attr = (cls, more = '') => `class="${cls}${tone.pale ? ' pale' : ''}" style="--g:${tone.c};--gi:${tone.ink}${more}"`;
    let h = esc(s);
    if (!allow || !allow.length) return h;
    o.ka = allow.includes('문자') && allow.includes('송금') && h.includes('&lt;문자&gt;') && h.includes('&lt;송금&gt;');
    const re = () => new RegExp(`&lt;(${allow.join('|')})&gt;(\\n?)([\\s\\S]*?)(\\n?)&lt;\\/\\1&gt;(\\n?)`, 'gi');
    let keep = null;
    if (max) { keep = new Set(); for (const m of h.matchAll(re())) { const t = m[1].toLowerCase(); if (keep.size < max) keep.add(t); } }
    return h.replace(re(), (raw, tg, n1, t, n2, n3) => {
      const tag = tg.toLowerCase();
      if (keep && !keep.has(tag)) return raw;
      if (FMT_BLOCK.includes(tag)) { const out = FMT_BUILD[tag](t, o, false, raw); return out === raw ? raw : out.replace(/^<div class="([^"]+)"/, (_, c) => `<div ${attr(c)}`); }
      const body = n1 + t + n2;
      const span = tag === '타자' ? `<span ${attr('tf-type', `;--n:${Math.min(40, unent(t).length)}`)}>${body}</span>`
        : tag === '검열' || tag === '흐림' ? `<span ${attr(FMT_CLS[tag])} tabindex="0">${body}</span>` : `<span ${attr(FMT_CLS[tag])}>${body}</span>`;
      return span + n3;
    });
  };
  // 서식 태그를 떼고 글만 (작은 미리보기 · 문제 글)
  window.stripFmt = s => String(s || '').replace(/<\/?(c|강조|밑줄|점|빛글|검열|흐림|메모|떨림|지움|타자|반짝|네온|도장|무물단색|무물|문자|메일|받은메일|후원|별점|음악|트윗|알티|네이버|송금)>/gi, ' ').replace(/\s*\|\s*/g, ' · ').replace(/[ \t]{2,}/g, ' ').trim();
  // 검열 · 흐림: 폰에서는 눌러서 보기
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('.tf-red, .tf-blur'); if (t) t.classList.toggle('on'); });
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

  /* 낮 · 밤: 06시~18시는 낮 (주소 끝에 ?day=1 이면 언제든 낮 · ?day=0 이면 언제든 밤 — 미리보기용) */
  window.isDayTime = () => { const q = (location.search.match(/[?&]day=([01])/) || [])[1]; if (q) return q === '1'; const h = new Date().getHours(); return h >= 6 && h < 18; };
  addEventListener('load', () => window.App && App.ready && App.ready.then(u => {
    if (!u) return;
    // 접속 신호: 페이지를 옮기면 한 번 · 같은 페이지면 5분에 한 번만 (다른 탭에 가 있으면 쉬어요)
    const go = () => {
      if (document.hidden) return;
      const page = location.pathname.replace(/^\//, '') + location.search; let last = {};
      try { last = JSON.parse(sessionStorage.getItem('naru:touch')) || {}; } catch (e) {}
      if (last.p === page && Date.now() - last.t < 24e4) return;
      try { sessionStorage.setItem('naru:touch', JSON.stringify({ p: page, t: Date.now() })); } catch (e) {}
      Store.touch(page);
    };
    go(); setInterval(go, 3e5); document.addEventListener('visibilitychange', go);
  }));
  /* 별똥별: box 에 가끔 한두 개씩 (가끔 우르르) 떨어져요 · active() 가 false 면 (예: 낮) 쉬어요 · 움직임 줄이기 설정이면 안 띄워요 */
  window.meteors = (box, active = () => true) => {
    if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    box.classList.add('meteors');
    const ANG = 32 * Math.PI / 180;
    const one = (delay = 0) => setTimeout(() => {
      const m = document.createElement('i'), big = Math.random() < .25, len = (big ? 200 : 80) + Math.random() * 140, dist = 380 + Math.random() * 620;
      m.style.cssText = `left:${20 + Math.random() * 85}%;top:${Math.random() * 40}%;--len:${len.toFixed(0)}px;--dx:${(-Math.cos(ANG) * dist).toFixed(0)}px;--dy:${(Math.sin(ANG) * dist).toFixed(0)}px;--t:${(.7 + Math.random() * .9).toFixed(2)}s${big ? '' : ';height:1.4px'}`;
      m.className = ['', 'lav', 'lav', 'pink', 'pink', 'rose', 'mint'][Math.floor(Math.random() * 7)];   // 파랑 · 연보라 · 연분홍 · 장밋빛 · 민트
      box.appendChild(m); m.addEventListener('animationend', () => m.remove());
    }, delay);
    const shoot = () => {
      if (!document.hidden && active() && box.childElementCount < 14) {   // 혹시 쌓여도 14개까지만
        const n = Math.random() < .15 ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);   // 한 번에 1~2개 · 가끔 3~5개
        for (let k = 0; k < n; k++) one(k * (120 + Math.random() * 380));
      }
      setTimeout(shoot, 500 + Math.random() * 1700);
    };
    setTimeout(shoot, 500);
  };
  /* 벚꽃잎: box 안에 n 장이 바람에 흔들리며 떨어져요
     i = 떨어지는 길 (아래 + 바람 방향) · b = 좌우로 살랑 · u = 꽃잎이 뒤집히며 팔랑 · 가까운 꽃잎 몇 장은 크고 살짝 흐리게 (원근감) */
  window.sakura = (box, n = 28) => {
    if (!box) return;
    const R = (a, b) => (a + Math.random() * (b - a)).toFixed(2);
    box.classList.add('sakura');
    box.innerHTML = Array.from({ length: n }, () => {
      const near = Math.random() < .18, t = near ? R(7, 10) : R(11, 19);
      return `<i style="--x:${R(-12, 100)}%;--y:${R(0, 90)}%;--dx:${R(60, 220)}px;--t:${t}s;--d:-${R(0, t)}s;--w:${R(2.2, 4.2)}s;--sw:${R(14, 40)}px">`
        + `<b><u style="--s:${near ? R(16, 22) : R(7, 13)}px;--o:${near ? .5 : R(.7, .95)};--bl:${near ? 'blur(1.5px)' : 'none'};--sp:${R(3, 7)}s"></u></b></i>`;
    }).join('');
  };



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
        <nav class="nav">${NAV.concat(user && (user.grade === 'admin' || user.grade === 'staff') ? [['admin', 'admin.html', '관리', '管']] : []).map(([k, href, label, han, ext]) =>
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
    try { mine = await Store.myCharacterNews(); } catch (e) { return; }
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
      if (!c.published_at && String(seen[c.id] || '').split('|')[1]) news.unshift({ id: c.id, t: 'ret', text: `🌙 레스트로 "${name}" 이(가) 멤버란에서 내려갔어요 · 수정 기간에 다시 제출해 주세요`, at: new Date().toISOString() });
      // 반려 = 작성 중 + 반려 메모 (메모가 새로 생기거나 바뀌었을 때만 알려요)
      if (c.status !== 'published' && c.review_note && c.review_note !== String(seen[c.id] || '').split('|').slice(2).join('|')) news.unshift({ id: c.id, t: 'ret', text: `↩ "${name}" 이(가) 반려됐어요 · 작성 중으로 돌아갔어요`, at: new Date().toISOString() });
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

  // 페이지를 옮겨도 마지막 활동 시각을 이어받고, 다른 탭의 로그아웃도 반영해요.
  function watchSession() {
    let timer, ending = false;
    const check = () => {
      clearTimeout(timer);
      if (ending) return;
      if (Store.sessionExpired()) {
        ending = true;
        document.documentElement.classList.add('gate');
        Store.signOut().catch(console.error).finally(() => location.replace('login.html?expired=1'));
        return;
      }
      timer = setTimeout(check, Store.SESSION_IDLE_MS - (Date.now() - Store.sessionActivity()));
    };
    const activity = () => {
      if (ending || document.hidden) return;
      if (!Store.sessionExpired()) Store.recordActivity();
      check();
    };
    ['pointerdown', 'keydown'].forEach(type => addEventListener(type, activity, { passive: true }));
    addEventListener('scroll', activity, { passive: true, capture: true });
    document.addEventListener('visibilitychange', check);
    addEventListener('focus', check);
    addEventListener('pageshow', check);
    addEventListener('pagehide', () => clearTimeout(timer));
    addEventListener('storage', e => { if (e.key === Store.ACTIVITY_KEY || e.key === null) check(); });
    check();
  }

  window.App = {
    ready: (async () => {
      if (document.readyState === 'loading') await new Promise(r => document.addEventListener('DOMContentLoaded', r));
      // 데모 모드에서 저장 공간이 비어 있으면 예시 데이터 채우기 (demo-seed.js, 실제 사이트에선 실행 안 됨)
      if (Store.mode === 'demo') {
        let empty = false, noLesson = false; try { empty = !localStorage.getItem('naru:users'); noLesson = localStorage.getItem('naru:lesson_v') !== '4'; } catch (e) {}
        if (empty || noLesson) {
          await new Promise(r => { const s = document.createElement('script'); s.src = 'assets/js/demo-seed.js'; s.onload = s.onerror = r; document.head.appendChild(s); });
          if (empty && window.demoSeed) { try { await window.demoSeed(); } catch (e) { console.error(e); } }
          if (window.demoLessonSeed) { try { window.demoLessonSeed(); } catch (e) { console.error(e); } }
        }
      }
      let user = null;
      try {
        user = await Store.user();
        if (user && Store.sessionExpired()) {
          await Store.signOut(); user = null;
        }
      } catch (e) { console.error(e); user = null; }
      if (user) watchSession();
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

(function () {
  const Q = []; let busy = false;
  const ya = s => { const c = String(s).charCodeAt(String(s).length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이야' : '야'; };
  const ST = { 재력: 'money', 행운: 'luck', 지력: 'int', 이성: 'rea', 근력: 'str', 술력: 'mag', 외모: 'look' };
  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const show = () => {
    if (busy || !Q.length) return; busy = true;
    const p = Q.shift(), el = document.createElement('div'), st = p.stat || '';
    const msg = p.kind === 'luck' ? `나는 역시 <em>행운</em>의 ${esc2(p.name || '나')}${ya(p.name || '나')}`
      : p.kind === 'look' ? `내가 그렇게 <em>${Math.random() < .5 ? '잘생겼나' : '예쁜가'}</em>` : `<em>${esc2(st)}</em> 올리기를 잘했다`;
    el.className = `pastme st-${ST[st] || 'money'}${Math.random() < .5 ? ' lt' : ''}`; el.setAttribute('role', 'status');
    el.innerHTML = `<span class="pm-av"${p.head ? ` style="background-image:url('${esc2(p.head)}')"` : ''}></span><div class="pm-top"><b>과거의 나</b><small>메시지 · 지금</small></div>
      <div class="pm-msg">${msg}</div>${p.tag ? `<span class="pm-tag">${esc2(p.tag)}</span>` : ''}`;
    document.body.appendChild(el); void el.offsetWidth; el.classList.add('go');
    setTimeout(() => { el.remove(); busy = false; setTimeout(show, 250); }, 6200);
  };
  window.pastMe = p => { if (!p) return; (Array.isArray(p) ? p : [p]).forEach(x => x && Q.push(x)); show(); };
})();

/* 천장 연출: 실제로 알림이 있을 때만 파일을 받아요 */
window.luckLoad = () => window.__luck || (window.__luck = new Promise((ok, no) => {
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/css/luck.css'; document.head.appendChild(l);
  const s = document.createElement('script'); s.src = 'assets/js/luck.js'; s.onload = () => ok(window.Luck); s.onerror = no; document.head.appendChild(s);
}));
window.luckShow = n => n ? luckLoad().then(L => L.show(n)).catch(() => {}) : null;

window.playClosed = (el, what) => {
  const n = 1 + Math.floor(Math.random() * 4), nm = what === 'lesson' ? '후계자 수업' : '대국';
  const line = what === 'lesson' ? '지금은 수업에 참여할 수 없다냐앙<br>문이 열리면 다시 와라냥' : '지금은 대국에 참여할 수 없다냐앙<br>판이 열리면 다시 와라냥';
  el.innerHTML = `<div class="play-closed"><div class="pc-bub">${line}</div>
    <img class="pc-cat" src="assets/img/mascot/cat${n}.webp" alt="" draggable="false" onerror="this.remove()">
    <b>현재는 참여할 수 없어요!</b><p>${nm}은 지금 쉬는 중이에요.</p><a class="btn" href="index.html">메인으로</a></div>`;
};

(function () {
  let on = false; try { on = localStorage.getItem('naru:asMember') === '1'; } catch (e) {}
  if (!on || typeof App === 'undefined') return;
  App.ready.then(u => {
    if (!u || u.grade !== 'admin') return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'as-member';
    b.textContent = '👁 회원 화면으로 보는 중 · 끄기';
    b.onclick = () => { try { localStorage.removeItem('naru:asMember'); } catch (e) {} location.reload(); };
    document.body.appendChild(b);
  });
})();

/* ---------- 관리자 '부관리자 화면으로 보기'가 켜져 있으면 화면 위에 알려 줘요 (누르면 꺼요) ---------- */
(function () {
  let on = false; try { on = localStorage.getItem('naru:asStaff') === '1'; } catch (e) {}
  if (!on || typeof App === 'undefined') return;
  App.ready.then(u => {
    if (!u || u.realGrade !== 'admin') return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'as-member';
    b.textContent = '👁 부관리자 화면으로 보는 중 · 끄기';
    b.onclick = () => { try { localStorage.removeItem('naru:asStaff'); } catch (e) {} location.reload(); };
    document.body.appendChild(b);
  });
})();
