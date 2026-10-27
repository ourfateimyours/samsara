/* ================================================================
   사이트 BGM — 관리자 페이지에서 정한 곡을 오른쪽 아래 작은 플레이어로 재생
   · 유튜브 링크 또는 mp3 주소
   · 브라우저 정책상 소리는 방문자가 화면을 한 번 누른 뒤부터 나와요
   · 페이지를 옮겨도 이어서 재생돼요 (재생 위치 기억)
   ================================================================ */
(async function () {
  if (window.__bgm) return; window.__bgm = true;
  let s;
  try { s = await Store.settings(); } catch (e) { return; }
  if (!s.bgm_on || !s.bgm_url) return;
  // 캐릭터 파일은 그 캐릭터의 테마곡이 우선
  if (document.body.classList.contains('dossier-page')) return;

  const url = s.bgm_url.trim();
  const ytId = (url.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/) || [])[1];
  const isAudio = /^https?:\/\/.+\.(mp3|ogg|m4a|wav|aac)(\?.*)?$/i.test(url);
  if (!ytId && !isAudio) return;

  const PREF = 'naru:bgm', POS = 'naru:bgm-t';
  const wantOff = () => { try { return localStorage.getItem(PREF) === 'off'; } catch (e) { return false; } };
  const setPref = v => { try { localStorage.setItem(PREF, v); } catch (e) {} };
  const startAt = (() => { try { return +sessionStorage.getItem(POS) || 0; } catch (e) { return 0; } })();

  const dock = document.createElement('div');
  dock.className = 'bgm-dock';
  dock.innerHTML = `<button class="bgm-disc" aria-label="BGM 재생/정지"><span class="bgm-ic">▶</span></button>
    <div class="bgm-info"><small>NOW PLAYING · BGM</small><div class="bgm-title"><span>${esc(s.bgm_title || 'Background Music')}</span></div></div>
    <span class="bgm-eq"><i></i><i></i><i></i></span>`;
  document.body.appendChild(dock);

  let yt = null, ready = false, audio = null, playing = false;
  const ui = p => { playing = p; dock.classList.toggle('on', p); $('.bgm-ic', dock).textContent = p ? '❚❚' : '▶'; };
  const cur = () => yt && ready ? yt.getCurrentTime() : audio ? audio.currentTime : 0;
  const play = () => { if (yt && ready) yt.playVideo(); else if (audio) audio.play().catch(() => {}); };
  const pause = () => { if (yt && ready) yt.pauseVideo(); else if (audio) audio.pause(); };

  if (ytId) {
    const box = document.createElement('div'); box.id = 'bgm-yt';
    box.style.cssText = 'position:fixed;width:2px;height:2px;left:-20px;top:-20px;opacity:0;pointer-events:none';
    document.body.appendChild(box);
    const boot = () => {
      yt = new YT.Player('bgm-yt', {
        videoId: ytId, playerVars: { playsinline: 1, controls: 0, loop: 1, playlist: ytId, start: Math.floor(startAt) },
        events: { onReady: () => { ready = true; if (!wantOff()) armAutoplay(); }, onStateChange: e => ui(e.data === 1) }
      });
    };
    if (window.YT && window.YT.Player) boot();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); boot(); };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc);
      }
    }
  } else {
    audio = new Audio(url); audio.loop = true; audio.preload = 'auto'; audio.volume = .55;
    audio.addEventListener('loadedmetadata', () => { if (startAt && startAt < audio.duration) audio.currentTime = startAt; }, { once: true });
    ['play', 'pause'].forEach(ev => audio.addEventListener(ev, () => ui(!audio.paused)));
    if (!wantOff()) armAutoplay();
  }

  // 자동재생: 먼저 시도하고, 막히면 방문자의 첫 클릭 때 재생
  function armAutoplay() {
    play();
    const once = e => { if (e.target.closest('.bgm-dock')) return; if (!playing && !wantOff()) play(); };
    addEventListener('pointerdown', once, { once: true, capture: true });
  }
  $('.bgm-disc', dock).onclick = () => {
    if (playing) { pause(); setPref('off'); } else { setPref('on'); play(); }
  };
  // 메인 영상 소리를 켜면 BGM 은 잠시 멈춤
  addEventListener('naru:video-sound', e => { if (e.detail) pause(); });
  const save = () => { try { sessionStorage.setItem(POS, String(cur())); } catch (e) {} };
  setInterval(save, 2000); addEventListener('pagehide', save);
})();
