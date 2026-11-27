/* 메인 팝업 창 (오른쪽 위에 뜨고 제목줄을 끌어서 옮길 수 있어요 · × 로 닫으면 다시 안 떠요)
   1. 복주머니 ×50 당첨 · 폭망: site_settings.jackpot { win, name, head, at } · 1시간
   2. 사리의 소원 24시간 팝업: site_settings.wish_pops [{ id, from, to, msg, at }] · 24시간
   3. 골든벨: site_settings.bells [{ id, name, at }] · 사리가 말해 줘요 (bellLines)
   전부 메인이 원래 받던 사이트 설정 안에 실려 와요 (요청 추가 없음) */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const neon = s => esc(s).replace(/&lt;네온&gt;([\s\S]*?)&lt;\/네온&gt;/g, '<b class="nn">$1</b>').replace(/\n/g, '<br>');

  function css() {
    if (document.getElementById('jp-css')) return;
    const st = document.createElement('style'); st.id = 'jp-css';
    st.textContent = `
.fw-stack { position: fixed; top: 74px; right: 16px; z-index: 8500; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; pointer-events: none; }
.jp { --t: linear-gradient(90deg, #8f86f0, #74bde0 58%, #a8e0d4); --n1: #c8c2ff; --n2: #8f86f0; --n3: #74bde0; pointer-events: auto; width: min(250px, calc(100vw - 32px)); padding: 4px; border-radius: 10px; color: #fff; font-family: 'IBM Plex Sans KR', sans-serif;
  background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.55); backdrop-filter: blur(18px) saturate(1.3); -webkit-backdrop-filter: blur(18px) saturate(1.3);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 14px 40px rgba(10,20,50,.4), 0 0 24px rgba(200,194,255,.25); animation: jp-in .4s cubic-bezier(.2,.8,.2,1) both; }
.jp.free { position: fixed; z-index: 8600; margin: 0; }
.jp.lose { --t: linear-gradient(90deg, #5d6676, #8e98a8 58%, #b9c1cc); --n1: #e4e8ee; --n2: #8e98a8; --n3: #5d6676; }
.jp .tb { display: flex; align-items: center; gap: 6px; height: 22px; margin-bottom: 4px; padding: 0 3px 0 8px; border-radius: 7px 7px 3px 3px; background: var(--t); font: 700 11px 'IBM Plex Sans KR', sans-serif; letter-spacing: .02em; text-shadow: 0 1px 2px rgba(20,40,80,.35); user-select: none; cursor: grab; touch-action: none; }
.jp .tb:active { cursor: grabbing; }
.jp .tb span { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.jp .x { display: grid; place-items: center; width: 16px; height: 16px; padding: 0; border: 1px solid rgba(255,255,255,.75); border-radius: 4px; color: #fff; background: rgba(255,255,255,.22); font: 500 12px/1 'IBM Plex Sans KR', sans-serif; cursor: pointer; }
.jp .x:hover { background: rgba(255,255,255,.38); }
.jp .pic { position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 3px 3px 7px 7px; background: #0b0d14; }
.jp .pic img, .jp .pic video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 20%; pointer-events: none; }
.jp .pic video { opacity: 0; transition: opacity .3s; } .jp .pic video.on { opacity: 1; }
.jp.lose .pic img, .jp.lose .pic video { filter: grayscale(1); }
.jp .pic .ini { position: absolute; inset: 0; display: grid; place-items: center; font-size: 56px; color: rgba(255,255,255,.35); }
.jp .pic::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, transparent 52%, rgba(8,10,24,.55) 78%, rgba(8,10,24,.82)); }
.jp .msg { position: absolute; left: 0; right: 0; bottom: 14px; z-index: 1; text-align: center; word-break: keep-all; }
.jp .msg span { display: block; font: 500 12px/1.4 'IBM Plex Sans KR', sans-serif; text-shadow: 0 1px 3px rgba(0,0,0,.7); }
.jp .msg b, .jp .nn { color: #fff; font-weight: 700; text-shadow: 0 0 2px #fff, 0 0 6px #fff, 0 0 12px var(--n1), 0 0 22px var(--n2), 0 0 38px var(--n3), 0 0 56px var(--n3); animation: jp-neon 2.4s ease-in-out infinite; }
.jp .msg b { display: block; margin-top: 2px; font: 700 21px/1.25 'IBM Plex Sans KR', sans-serif; letter-spacing: -.01em; }
.jp .card { padding: 14px 12px 10px; border-radius: 3px 3px 7px 7px; background: rgba(10,14,30,.35); }
.jp .card p { margin: 0; font: 500 13.5px/1.65 'IBM Plex Sans KR', sans-serif; word-break: keep-all; overflow-wrap: anywhere; text-shadow: 0 1px 3px rgba(0,0,0,.5); }
.jp .card small { display: block; margin-top: 10px; text-align: right; font: 500 10.5px 'IBM Plex Sans KR', sans-serif; letter-spacing: .04em; opacity: .75; }
@keyframes jp-neon { 50% { text-shadow: 0 0 2px #fff, 0 0 4px #fff, 0 0 9px var(--n1), 0 0 16px var(--n2), 0 0 26px var(--n3), 0 0 40px var(--n3); } }
@keyframes jp-in { from { opacity: 0; transform: translateY(-8px) scale(.97); } }
@media (prefers-reduced-motion: reduce) { .jp .msg b, .jp .nn { animation: none; } }
.wa h3 { margin: 6px 0 4px; font: 700 18px 'IBM Plex Sans KR', sans-serif; }
.wa .wa-o { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0; }
.wa .wa-o button { display: flex; flex-direction: column; gap: 6px; padding: 14px 12px; text-align: left; border-radius: 10px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.05); color: inherit; cursor: pointer; font-family: 'IBM Plex Sans KR', sans-serif; }
.wa .wa-o button b { font-size: 14px; } .wa .wa-o button small { font-size: 11.5px; line-height: 1.5; opacity: .75; }
.wa .wa-o button.on { border-color: #c8c2ff; background: rgba(200,194,255,.14); box-shadow: 0 0 0 1px #c8c2ff inset; }
.wa textarea { resize: vertical; }
@media (max-width: 480px) { .wa .wa-o { grid-template-columns: 1fr; } }`;
    document.head.appendChild(st);
  }
  function stack() { let s = document.querySelector('.fw-stack'); if (!s) { s = document.createElement('div'); s.className = 'fw-stack'; document.body.appendChild(s); } return s; }
  /* 제목줄을 끌면 그 자리로 옮겨져요 (화면 밖으로는 안 나가요) */
  function drag(win) {
    const tb = win.querySelector('.tb');
    tb.addEventListener('pointerdown', e => {
      if (e.target.closest('.x')) return;
      const r = win.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      if (!win.classList.contains('free')) { win.classList.add('free'); win.style.left = r.left + 'px'; win.style.top = r.top + 'px'; document.body.appendChild(win); }
      tb.setPointerCapture(e.pointerId);
      const mv = ev => {
        const w = win.offsetWidth, h = win.offsetHeight;
        win.style.left = Math.max(0, Math.min(innerWidth - w, ev.clientX - dx)) + 'px';
        win.style.top = Math.max(0, Math.min(innerHeight - h, ev.clientY - dy)) + 'px';
      };
      const up = () => { tb.removeEventListener('pointermove', mv); tb.removeEventListener('pointerup', up); tb.removeEventListener('pointercancel', up); };
      tb.addEventListener('pointermove', mv); tb.addEventListener('pointerup', up); tb.addEventListener('pointercancel', up);
    });
  }
  function open(html, cls, onClose) {
    css();
    const win = document.createElement('div'); win.className = 'jp ' + (cls || ''); win.setAttribute('role', 'dialog'); win.innerHTML = html;
    win.querySelector('.x').onclick = () => { onClose && onClose(); win.remove(); };
    drag(win); stack().appendChild(win); return win;
  }

  /* 1. 복주머니 ×50 (1시간) */
  window.jackpotPopup = function (s) {
    const j = s && s.jackpot, KEY = 'naru:jackpot:seen'; if (!j || !j.at) return;
    if (!(Date.now() - Date.parse(j.at) < 3600e3)) return;
    try { if (localStorage.getItem(KEY) === String(j.at)) return; } catch (e) {}
    const v = window.headMp4 && j.head ? window.headMp4(j.head) : null;
    const win = open(`<div class="tb"><span>${j.win ? '복권 당첨.exe' : '복권 폭망.exe'}</span><button type="button" class="x" aria-label="닫기">×</button></div>
      <div class="pic">${j.head ? `<img src="${esc(v ? v.poster : j.head)}" alt="" referrerpolicy="no-referrer">` : `<span class="ini">${esc(String(j.name || '?').slice(0, 1))}</span>`}
        <div class="msg"><span>${esc(j.name)} 님 오늘 복권</span><b>×50 ${j.win ? '당첨!' : '폭망!'}</b></div></div>`, j.win ? 'win' : 'lose', () => { try { localStorage.setItem(KEY, String(j.at)); } catch (e) {} });
    if (v) {   // imgur GIF 는 가벼운 mp4 로 움직여요 (안 되면 GIF 그대로)
      const img = win.querySelector('.pic img'), vd = document.createElement('video');
      vd.muted = vd.loop = vd.playsInline = vd.autoplay = true; vd.src = v.mp4;
      vd.addEventListener('playing', () => vd.classList.add('on'), { once: true });
      vd.addEventListener('error', () => { vd.remove(); img.src = j.head; }, { once: true });
      img.after(vd);
    }
  };

  /* 2. 사리의 소원 · 24시간 팝업 */
  window.wishPops = function (s) {
    const KEY = 'naru:wishpop:seen', seen = lsGet(KEY, []);
    const list = ((s && s.wish_pops) || []).filter(p => p && p.id && Date.now() - Date.parse(p.at) < 864e5 && !seen.includes(p.id));
    list.forEach(p => {
      if (document.querySelector(`.jp[data-id="${p.id}"]`)) return;
      const win = open(`<div class="tb"><span>To. ${esc(p.to)}</span><button type="button" class="x" aria-label="닫기">×</button></div>
        <div class="card"><p>${neon(p.msg)}</p><small>from. ${esc(p.from)}</small></div>`, 'wish', () => lsSet(KEY, lsGet(KEY, []).concat(p.id).slice(-50)));
      win.dataset.id = p.id;
    });
  };

  /* 3. 골든벨: 아직 못 들은 것만 사리가 말해 줘요 (최근 7일 · 최대 3개) */
  window.bellLines = function (s, meName) {
    const KEY = 'naru:bells:seen', seen = lsGet(KEY, []);
    const list = ((s && s.bells) || []).filter(b => b && b.id && Date.now() - Date.parse(b.at) < 7 * 864e5 && !seen.includes(b.id)).slice(-3);
    if (list.length) lsSet(KEY, seen.concat(list.map(b => b.id)).slice(-50));
    return list.map(b => `${b.name} 님이 골든벨을 울렸다냥! 모두에게 300 영전이다냥`);
  };
  window.bellSeen = function (bells) { const KEY = 'naru:bells:seen'; lsSet(KEY, lsGet(KEY, []).concat((bells || []).map(b => b.id)).slice(-50)); };

  /* 사리의 소원 고르기 창 · o = { chars: [{ id, name }], speak(line), onDone(r) } */
  window.wishAsk = function (o) {
    css();
    const m = openModal(`<div class="wa"><div class="eyebrow">Sari's Wish</div><h3>플레이어들한테 뭐 해 주고 싶냐앙?</h3>
      <div class="wa-o"><button type="button" data-k="bell"><b>골든벨 울리기</b><small>모든 플레이어에게 내 이름으로 300 영전을 넣어 줘요</small></button>
        <button type="button" data-k="pop"><b>24시간 팝업</b><small>모두의 메인 오른쪽 위에 하루 동안 떠요</small></button></div>
      <div class="wa-p" hidden>
        <label class="field"><span>받는 캐릭터</span><select class="input" id="wa-to">${(o.chars || []).map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>
        <label class="field"><span>하고 싶은 말 <small>120자 · 강조할 곳은 &lt;네온&gt;이렇게&lt;/네온&gt; 감싸요</small></span><textarea class="input" id="wa-msg" rows="3" maxlength="120"></textarea></label></div>
      <div class="acts"><button class="btn ghost" data-later>나중에 고를래</button><button class="btn" data-ok disabled>고르기</button></div></div>`);
    let k = '';
    m.querySelectorAll('.wa-o button').forEach(b => b.onclick = () => {
      k = b.dataset.k; m.querySelectorAll('.wa-o button').forEach(x => x.classList.toggle('on', x === b));
      m.querySelector('.wa-p').hidden = k !== 'pop'; m.querySelector('[data-ok]').disabled = false;
    });
    m.querySelector('[data-later]').onclick = () => { closeModal(); o.speak && o.speak('천천히 골라라냥 기다리겠다냥'); };
    m.querySelector('[data-ok]').onclick = async () => {
      const to = m.querySelector('#wa-to').value, msg = m.querySelector('#wa-msg').value.trim();
      if (k === 'pop' && !to) return toast('받는 캐릭터를 골라 주세요.', 'err');
      if (k === 'pop' && !msg) return toast('하고 싶은 말을 적어 주세요.', 'err');
      try {
        const r = await Store.catWish(k, to, msg); closeModal();
        if (k === 'bell') { window.bellSeen(r.bells); o.speak && o.speak('골든벨이 울렸다냥! 모두에게 300 영전이다냥'); }
        else { window.wishPops({ wish_pops: r.wish_pops }); o.speak && o.speak('하루 동안 모두가 보게 붙여 두었다냥'); }
        o.onDone && o.onDone(r);
      } catch (e) { toast(e.message, 'err'); }
    };
  };
})();
