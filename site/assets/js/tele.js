/* ================================================================
   심박 텔레파시 팝업
   · 모든 멤버(다른 사람의 캐릭터)에게, 한 사람당 하루 1번 무료 (캐릭터가 여러 명이어도)
     그다음부터는 상점에서 산 심박권으로 1장에 1번씩
   · 받는 쪽에는 보낸 이가 익명("???")으로 보여요
   헤더의 ♥ 버튼이나 [data-tele-open] 요소를 누르면 열려요.
   ================================================================ */
(function () {
  if (window.Telepathy) return;
  const LIMIT = Store.DAILY;
  let me = null, teles = [], chars = [], beats = 0;   // beats: 가진 심박권
  let tab = 'inbox';

  const charName = id => { const c = chars.find(x => x.id === id); return c ? (c.data && c.data.name) || '?' : '(지워진 인물)'; };
  // 심박 색 = 그 캐릭터에 정한 테마 컬러 (받은 맥박은 받은 내 캐릭터, 보낸 맥박 · 쓰기는 보내는 캐릭터)
  const colorOf = id => { const c = chars.find(x => x.id === id); const d = c && (c.data || c.draft) || {}; const col = window.normChar ? normChar(d).color : d.color; return /^#[0-9a-f]{6}$/i.test(col || '') ? col : ''; };
  const pulseCSS = id => { const c = colorOf(id); return c ? `--pulse:${c};--red-hi:${c};` : ''; };
  const when = iso => { const d = new Date(iso); return `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const bpmOf = id => 62 + ([...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 64);
  const inbox = () => teles.filter(m => m.to_user === me.id && m.owner_id !== me.id).reverse();
  const sent = () => teles.filter(m => m.owner_id === me.id).reverse();
  const unread = () => inbox().filter(m => !m.read).length;
  const leftFor = () => Math.max(0, LIMIT - teles.filter(m => m.owner_id === me.id && m.created_at >= Store.dayStart()).length);   // 오늘 남은 무료 (한 사람당 하루)
  const myChars = () => chars.filter(c => c.owner_id === me.id);
  // 받을 수 있는 멤버: 다른 사람의 캐릭터 모두 (이름순)
  const others = () => chars.filter(c => c.owner_id !== me.id).sort((a, b) => String(a.data.name || '').localeCompare(String(b.data.name || ''), 'ko'));

  /* 심전도 선 */
  function ecg(bpm, cls) {
    let d = 'M0 30', x = 0;
    while (x < 300) {
      d += ` H${x + 30} l4 -4 l4 4 H${x + 46} l3 5 l5 -24 l5 32 l4 -13 H${x + 72} q7 -9 14 0 H${x + 100}`;
      x += 100;
    }
    return `<svg class="ecg ${cls || ''}" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true" style="--beat:${(60 / bpm).toFixed(2)}s;--dur:${(120 / bpm).toFixed(2)}s">
      <path class="ecg-grid" d="M0 15H300M0 30H300M0 45H300"/>
      <path class="ecg-base" d="${d}"/><path class="ecg-trace" d="${d}" pathLength="1000"/></svg>`;
  }

  async function refresh(full) {
    me = await Store.user(); if (!me) return;
    // 캐릭터 목록은 처음 한 번 (또는 창을 열 때)만, 1분마다는 맥박만 새로 받아요
    try { [teles, chars] = await Promise.all([Store.teles(), chars.length && !full ? chars : Store.charNames()]); }
    catch (e) { console.error(e); }
    if (full) try { beats = ((await Store.wallet()).tickets || {}).k_beat || 0; } catch (e) {}   // 심박권 수 (창을 열 때 · 보낸 뒤)
    const n = unread();
    $$('.mail-badge').forEach(b => { b.textContent = n > 9 ? '9+' : n; b.hidden = !n; });
  }

  function open(t) {
    if (t) tab = t;
    const box = openModal(`<div class="mbx">
      <div class="mbx-head"><div><div class="eyebrow">Heartbeat Telepathy</div><h2>심박 텔레파시</h2></div>
        <div class="mbx-quota"><span>모든 멤버에게 · 하루 <b>${LIMIT}</b>번 무료</span><small>더 보내려면 심박권 · 무료는 매일 자정 초기화</small></div></div>
      <div style="${pulseCSS((myChars()[0] || {}).id)}">${ecg(66, 'head-ecg')}</div>
      <div class="etabs mbx-tabs">
        <button data-tab="inbox"></button><button data-tab="sent">보낸 맥박</button><button data-tab="write">♥ 맥박 보내기</button>
      </div>
      <div class="mbx-body" id="mbx-body"></div></div>`, 'wide mbx-modal');
    box.addEventListener('click', onClick);
    show(tab);
  }

  function show(t) {
    tab = t;
    $$('.mbx-tabs button').forEach(b => {
      b.classList.toggle('on', b.dataset.tab === t);
      if (b.dataset.tab === 'inbox') { const n = unread(); b.innerHTML = '받은 맥박' + (n ? ` <i>${n}</i>` : ''); }
    });
    const body = $('#mbx-body'); if (!body) return;
    if (t === 'inbox') {
      const list = inbox();
      body.innerHTML = `<p class="hint-text">누군가에게서 전해진 맥박. 보낸 이는 알 수 없어요.</p>` + (list.length
        ? `<div class="teles">${list.map(m => teleCard(m)).join('')}</div>`
        : `<div class="mbx-empty">${ecg(60, 'flat')}<p>아직 느껴지는 맥박이 없어요.</p></div>`);
    }
    if (t === 'sent') {
      const list = sent();
      body.innerHTML = list.length ? `<ul class="letters">${list.map(m => `
        <li style="${pulseCSS(m.from_char)}"><div class="letter-row sent"><span class="pulse-ic" aria-hidden="true"></span>
          <span class="lr-t"><b>${esc(charName(m.from_char))} → ${esc(charName(m.to_char))}</b><small>${esc(m.body)}</small></span>
          <time>${when(m.created_at)}${m.to_user !== me.id ? (m.read ? ' · 감응함' : ' · 아직') : ''}</time></div></li>`).join('')}</ul>`
        : `<div class="mbx-empty"><p>보낸 맥박이 없어요.</p></div>`;
    }
    if (t === 'write') writeForm(body);
  }

  function teleCard(m, opened) {
    const bpm = bpmOf(m.id);
    return `<article class="tele ${m.read ? '' : 'new'} ${opened ? 'open' : ''}" data-tele="${esc(m.id)}" tabindex="0" style="${pulseCSS(m.to_char)}--beat:${(60 / bpm).toFixed(2)}s">
      <header><span class="hb">♥</span><span class="tw-who">${esc(charName(m.to_char))}에게 닿은 맥박</span><span class="bpm"><b>${bpm}</b> BPM</span></header>
      ${ecg(bpm)}
      <div class="tele-body">${m.read || opened ? esc(m.body) : '<span class="tap">눌러서 감응하기</span>'}</div>
      <footer><span>FROM · <b>???</b> (누군가)</span><time>${when(m.created_at)}</time></footer></article>`;
  }

  function writeForm(body) {
    const mine = myChars();
    body.innerHTML = `<form id="tw" class="tele-write" novalidate>
      <div class="tw-mon">${ecg(72, 'live')}<span class="bpm"><b id="twbpm">72</b> BPM</span></div>
      ${mine.length ? `
      <div class="row2">
        <label class="field"><span>보내는 캐릭터</span><select name="from">${mine.map(c => `<option value="${esc(c.id)}">${esc(c.data.name)}</option>`).join('')}</select></label>
        <label class="field"><span>받는 멤버</span><select name="to"></select></label>
      </div>
      <label class="field"><span>전할 마음 <small id="tlen">0 / 200</small></span><textarea name="body" rows="4" maxlength="200" placeholder="말이 아닌 맥박으로 전해집니다. 받는 이는 누가 보냈는지 알 수 없어요."></textarea></label>
      <p class="err-text" id="terr"></p>
      <div class="modal-foot"><span class="left-n" id="tleft"></span><button class="btn" id="tsend">맥박 보내기</button></div>`
      : `<p class="hint-text">텔레파시를 보내려면 먼저 캐릭터를 등록해 주세요.</p>`}</form>`;
    if (!mine.length) return;
    const f = $('#tw');
    const fill = () => {
      const kin = others(), l = leftFor(), can = l + beats;
      f.style.cssText = pulseCSS(f.from.value);   // 고른 캐릭터 색으로 심전도 · BPM 이 물들어요
      f.to.innerHTML = kin.length ? kin.map(c => `<option value="${esc(c.id)}">${esc(c.data.name)} (@${esc(c.author)})</option>`).join('') : '<option value="">아직 다른 멤버가 없어요</option>';
      $('#tleft').innerHTML = `오늘 무료 <b>${l}</b> / ${LIMIT}` + ` · 심박권 <b>${beats}</b>장` + (can ? '' : ' <a class="pill" href="shop.html">상점에서 사기 ›</a>');
      $('#tsend').disabled = !kin.length || can <= 0;
      $('#terr').textContent = '';
    };
    fill(); f.from.onchange = fill;
    f.body.oninput = () => { // 쓸수록 심장이 빨리 뛰어요
      const n = f.body.value.length, bpm = Math.min(160, 72 + Math.round(n * .45));
      $('#tlen').textContent = `${n} / 200`; $('#twbpm').textContent = bpm;
      const s = $('.tw-mon .ecg'); s.style.setProperty('--dur', (120 / bpm).toFixed(2) + 's'); s.style.setProperty('--beat', (60 / bpm).toFixed(2) + 's');
    };
    f.onsubmit = async e => {
      e.preventDefault();
      try {
        await Store.sendTele({ from_char: f.from.value, to_char: f.to.value, body: f.body.value });
        $('.tw-mon').classList.add('sent');
        toast(leftFor() > 0 ? '맥박이 전해졌어요 ♥' : '맥박이 전해졌어요 ♥ (심박권 1장 사용)'); await refresh(true);
        setTimeout(() => show('sent'), 900);
      } catch (ex) { $('#terr').textContent = ex.message; }
    };
  }

  function onClick(e) {
    const t = e.target.closest('[data-tab]'); if (t) return show(t.dataset.tab);
    const tl = e.target.closest('[data-tele]');
    if (tl) {
      const m = teles.find(x => x.id === tl.dataset.tele);
      const wasNew = !m.read;
      if (wasNew) { m.read = true; Store.markTeleRead(m.id).then(refresh); }
      tl.outerHTML = teleCard(m, true);
      const card = $(`[data-tele="${CSS.escape(m.id)}"]`);
      if (wasNew && card) { card.classList.add('awake'); typeText($('.tele-body', card), m.body, 40); }
    }
  }

  document.addEventListener('click', e => { if (e.target.closest('[data-tele-open]')) { e.preventDefault(); refresh(true).then(() => open()); } });

  window.Telepathy = { open: t => refresh(true).then(() => open(t)), refresh };
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);   // 다른 탭에 가 있으면 쉬어요
})();
