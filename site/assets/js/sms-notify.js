/* ================================================================
   비밀 문자 알림 · 유리 문자 창
   · 비밀 문자가 열려 있을 때만 움직여요 (관리자 '놀이' 탭 스위치)
   · 새 문자가 오면 화면 위에서 아이폰 알림처럼 내려와요 (누르면 문자 창)
   · 안 읽은 수는 4분 동안 다시 묻지 않고 · 5분마다 한 번 · 다른 탭에 가 있으면 쉬어요
   · 메인의 '문자' 버튼이나 알림을 누르면 지금 페이지 위에 반투명 유리 창으로 열려요
   ================================================================ */
(function () {
  if (window.SmsWin || window !== window.top) return;
  if (document.body.dataset.page === 'sms') return;
  const KEY = 'naru:sms-noti';
  const st = document.createElement('style');
  st.textContent = `
  .smsov { position: fixed; inset: 0; z-index: 9500; background: rgba(4,5,12,.22); -webkit-backdrop-filter: blur(14px) saturate(1.35); backdrop-filter: blur(14px) saturate(1.35); animation: smsovIn .35s ease both; }   /* 뒤 메인이 뿌옇게 비치는 유리 */
  .smsov.day { background: rgba(255,255,255,.22); } .smsov.day iframe { color-scheme: light; }   /* 안쪽 페이지와 색 체계가 같아야 투명하게 비쳐요 */
  .smsov iframe { width: 100%; height: 100%; border: 0; background: transparent; color-scheme: dark; }
  @keyframes smsovIn { from { opacity: 0; } }
  .smsnt { position: fixed; z-index: 9400; left: 50%; top: 14px; width: min(400px, calc(100vw - 24px)); translate: -50% 0; display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; box-sizing: border-box; cursor: pointer; text-align: left; border: 0; color: #fff;
    border-radius: 20px; background: rgba(28,28,38,.55); -webkit-backdrop-filter: blur(24px) saturate(1.6); backdrop-filter: blur(24px) saturate(1.6);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.16), inset 0 1px 0 rgba(255,255,255,.18), 0 18px 40px rgba(0,0,0,.45); font-family: -apple-system, 'IBM Plex Sans KR', sans-serif;
    animation: smsntIn .55s cubic-bezier(.2,1.25,.35,1) both; }
  .smsnt.out { animation: smsntOut .35s ease forwards; }
  @keyframes smsntIn { from { opacity: 0; transform: translateY(-70px) scale(.96); } }
  @keyframes smsntOut { to { opacity: 0; transform: translateY(-60px) scale(.97); } }
  .smsnt i { flex: none; width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-style: normal; font-size: 20px; background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(220,226,255,.75)); color: #1c1f3a; box-shadow: 0 0 14px rgba(190,205,255,.5); }
  .smsnt div { flex: 1; min-width: 0; }
  .smsnt small { display: flex; justify-content: space-between; font-size: 11.5px; color: rgba(255,255,255,.6); letter-spacing: .02em; }
  .smsnt b { display: block; margin-top: 1px; font-size: 14.5px; font-weight: 600; }
  .smsnt p { margin: 1px 0 0; font-size: 13.5px; line-height: 1.35; color: rgba(255,255,255,.88); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .smsnt em { font-style: normal; color: rgba(255,255,255,.55); font-size: 12px; }`;
  document.head.appendChild(st);

  const badge = n => { const b = document.getElementById('n-sms'); if (b) b.textContent = n ? (n > 99 ? '99+' : String(n)) : ''; };
  const OVERLAY = document.body.dataset.page === 'home';   // 겹친 유리 창은 메인에서만 (다른 페이지는 문자 화면으로 이동)
  function open() {
    if (!OVERLAY) { location.href = 'sms.html'; return; }
    if (document.querySelector('.smsov')) return;
    const day = !!document.querySelector('.lobby.is-day'), ov = document.createElement('div'); ov.className = 'smsov' + (day ? ' day' : '');   // 낮이면 하얀 문자 창
    ov.innerHTML = `<iframe src="sms.html?embed=1&day=${day ? 1 : 0}" title="비밀 문자"></iframe>`;
    document.body.appendChild(ov); document.body.classList.add('no-scroll');
    const nt = document.querySelector('.smsnt'); if (nt) nt.remove();
  }
  function close() { const ov = document.querySelector('.smsov'); if (ov) ov.remove(); if (!document.querySelector('.modal-back')) document.body.classList.remove('no-scroll'); check(true); }
  addEventListener('message', e => { if (e.origin === location.origin && e.data === 'sms-close') close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.smsov')) close(); });
  // 메인의 '문자' 버튼 (그리고 sms.html 로 가는 링크 전부) → 페이지를 옮기지 않고 유리 창으로
  document.addEventListener('click', e => { const a = e.target.closest('a[href="sms.html"]'); if (a && OVERLAY) { e.preventDefault(); open(); } });

  function banner(last, n) {
    const old = document.querySelector('.smsnt'); if (old) old.remove();
    const b = document.createElement('button'); b.type = 'button'; b.className = 'smsnt';
    b.innerHTML = `<i>✉</i><div><small><span>비밀 문자</span><span>지금</span></small><b>${esc(last.name || '알 수 없음')}</b><p>${esc(last.body || '')}</p>${n > 1 ? `<em>안 읽은 문자 ${n}통</em>` : ''}</div>`;
    b.onclick = () => { b.remove(); open(); };
    document.body.appendChild(b);
    setTimeout(() => { if (b.isConnected) { b.classList.add('out'); setTimeout(() => b.remove(), 400); } }, 7000);
  }
  async function check(fresh) {
    let s; try { s = await Store.settings(); } catch (e) { return; }
    if (!s.sms_on) return badge(0);
    let r; try { r = await Store.smsPeek(fresh); } catch (e) { return; }
    badge(r.n || 0);
    const last = r.last; if (!last || document.querySelector('.smsov')) return;
    let seen = ''; try { seen = localStorage.getItem(KEY) || ''; } catch (e) {}
    if (seen === last.id) return;
    try { localStorage.setItem(KEY, last.id); } catch (e) {}
    banner(last, r.n);
  }
  window.SmsWin = { open, close, check };
  check();
  setInterval(() => { if (!document.hidden) check(); }, 3e5);
})();
