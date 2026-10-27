/* ================================================================
   멤버란 접속 화면 (YOUR PROFILE LOGIN) — 캐릭터(멤버) 페이지를 열 때 약 3초
   왼쪽: 접속 문구 · 큰 제목 · 진행 막대 / 오른쪽: NPC 몇 명이 무작위로 나타나 잠깐 소개가 떠요
   끝나면 가로 셔터가 위에서부터 차례로 왼쪽으로 빠지며 열려요. 누르면 바로 건너뛰어요.
   LoginSeq.play({ count }) → 셔터가 열리기 시작할 때 resolve
   ================================================================ */

/* ✏️ 인트로에만 나오는 NPC — 프로필에는 등록되지 않아요. 이미지 주소 · 이름 · 소개만 넣으면 돼요.
   열 때마다 이 중 한 명이 무작위로 나와요. */
window.INTRO_NPCS = [
  { name: '윤옥란', house: '瑞門 · 本家', img: 'https://i.imgur.com/yJv58TZ.png',
    text: '서문 본가의 정점에 서 있는 안주인으로 그녀는 고령의 나이가 믿기지 않을 정도로 늘 우아한 자태를 보인다' },
  { name: '오미령', house: '誓門 · 京派', img: 'https://i.imgur.com/wo1JdXj.png',
    text: '서문 경파의 안주인으로 주식과 투자로 살림을 벌어 분당 일대의 토지를 관리하고 있을 뿐 아니라 신세계백화점의 VIP로 알려져 있다' },
  { name: '김화진', house: '瑞門 · 本家', img: 'https://i.imgur.com/TCnVfbu.png',
    text: '차기 가주, 서문 도현의 아내로 옥란의 가르침을 받아 여러 안살림을 도맡고 있다' },
  { name: '서문 화연', house: '瑞門 · 本家', img: 'assets/img/npc/seomun-hwayeon.webp', full: true,   // full: 배경까지 있는 그림 → 칸을 꽉 채우고 가장자리를 흐리게
    text: '서문 도현과 쌍둥이로 태어난 본가의 장녀로, 본인 집안의 식솔인 한기준과 야밤 도주 후 경기도 수원에서 혼인 신고를 올린 뒤 현재 살아가고 있다. 조부의 유언에 따라 다시 본가로 들어올 자격을 얻었다' },
  { name: '서문 태준', house: '誓門 · 京派', img: 'assets/img/npc/seomun-taejun.webp',
    text: '서문 백의 형으로, 가주 자리에서 밀려나 경파로 오게 되었으나 본가 못지않게 가문의 번영을 일으킨 자' },
  { name: '서문 화진', house: '誓門 · 京派', img: 'assets/img/npc/seomun-hwajin.webp',
    text: '현가 가문 입양아에 불과했던 유성근과 눈이 맞아 자신의 아버지인 서문 태준의 명치를 칼로 찌른 뒤 도주했다고 알려져 있다. 조부의 유언에 따라 다시 본가로 귀성할 자격을 얻었다' },
  { name: '서문 백', house: '瑞門 · 本家', img: 'assets/img/npc/seomun-baek.webp',
    text: '서문 가문에서 초창기 시조인 단과 가장 비슷한 위력을 지녔다고 칭송받던 가주로, 2026년 10월 28일 급성 심장마비로 사망하였다' },
  { name: '염태율', house: '染 · 染家', img: 'https://i.imgur.com/57mn9Qh.png', full: true,   // 배경까지 있는 그림 → 서문 화연처럼 꽉 채워 확대
    text: '염가 가문의 가주로 슬하에 세 명의 아들이 있으며 가문 내 위계에 특히나 민감한 편이다. 외로는 출가한 딸도 있다고 하나, 공석에서나 사석에서나 가족 이야기를 하지 않아 자세한 건 알 수 없다' }
];

(function () {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  window.LoginSeq = {
    play(o) {
      o = o || {};
      return new Promise(resolve => {
        const pct = n => String(n).padStart(3, '0');
        const ch = String(o.ch || Math.floor(Math.random() * 49) + 1).padStart(2, '0');   // 第 몇 門 — 사십구재의 마흔아홉 문 중 하나
        // 오른쪽 비스듬한 판에 NPC 한 명의 전신이 무작위로 들어가고, 소개가 잠깐 떠요
        const n = shuffle(window.INTRO_NPCS || [])[0];
        const ls = document.createElement('div');
        ls.className = 'ls'; ls.style.setProperty('--c', o.color || '#b8202c');
        ls.innerHTML = `
          <div class="ls-shut">${Array.from({ length: 8 }, (_, k) => `<i style="animation-delay:${2850 + k * 38}ms"></i>`).join('')}</div>
          <div class="ls-c">
            <i class="ls-grid"></i>
            <div class="ls-art${n && n.full ? ' full' : ''}">${n ? `
              <img class="ls-img" src="${E(n.img)}" alt="" referrerpolicy="no-referrer">
              <img class="ls-img g1" src="${E(n.img)}" alt="" referrerpolicy="no-referrer">
              <img class="ls-img g2" src="${E(n.img)}" alt="" referrerpolicy="no-referrer">` : ''}
              <i class="ls-shade"></i>
            </div>
            <svg class="ls-edge"><line x1="51.6%" y1="0" x2="38%" y2="100%" pathLength="2000"/></svg>
            ${n ? `<div class="np-tag"><small>${E(n.house || '')}</small><b>${E(n.name)}</b><p>${E(n.text)}</p></div>` : ''}
            <span class="ls-vcn">SAMSARA</span>
            <div class="ls-top"><span class="logo">三娑罗<i>名簿</i></span><span>門安 · 第${ch}門</span><span class="r">入門 · MEMBERS</span></div>
            <div class="ls-boot">
              <span>› 開門   삼사라 명부를 엽니다</span><span>› 照會   瑞門 · 誓門 · 染家</span>
              <span>› 結界 ........ 安</span><span>› 點燈   四十九燈</span><span class="hl">› 待命   이름을 부르는 중</span></div>
            <div class="ls-tt">
              <span class="k"><i></i>BLOODLINE · 瑞門 · 誓門 · 染家</span>
              <div class="w"><b>YOUR</b></div><div class="w"><b>PROFILE</b></div><div class="w o"><b>LOGIN</b></div>
              <div class="id"><span>名簿 · MEMBERS</span><span>${E(pct(o.count || 0))} 名</span><span>第${ch}門</span></div>
              <div class="prog"><div class="seg"><b></b></div><span class="pct">000</span><em>%</em></div>
              <div class="grant"><b>入門 許可</b><i>WELCOME BACK</i></div>
            </div>
            <div class="ls-ln"><span>照會 · 血脈 確認</span><span>連結 · 三娑罗 名簿</span><span>解封 · 四十九日</span><span class="hl">入門 · 許可</span></div>
            <div class="ls-meta"><span>第${ch}門 · 서울</span><span>LAT 37.56 / LON 126.97</span></div>
            <i class="ls-fl"></i><i class="ls-vg"></i>
            <span class="ls-cr tl"></span><span class="ls-cr tr"></span><span class="ls-cr bl"></span><span class="ls-cr br"></span>
          </div>`;
        document.body.appendChild(ls);
        document.documentElement.classList.remove('booting');

        // 진행률 숫자 (0.5초 뒤부터 1.8초 동안)
        const pe = ls.querySelector('.pct'), t0 = performance.now();
        const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        (function tick(t) {
          const p = Math.max(0, Math.min(1, (t - t0 - 500) / 1800));
          pe.textContent = pct(Math.round(ease(p) * 100));
          if (p < 1 && ls.isConnected) requestAnimationFrame(tick);
        })(t0);

        let done = false;
        const T = [];
        const open = () => { if (!done) { done = true; resolve(); } };
        T.push(setTimeout(open, 2850));
        T.push(setTimeout(() => ls.remove(), 3800));
        // 누르면 바로 건너뛰기
        ls.addEventListener('click', () => {
          if (ls.classList.contains('skip')) return;
          T.forEach(clearTimeout); ls.classList.add('skip'); open();
          setTimeout(() => ls.remove(), 700);
        });
      });
    }
  };
})();
