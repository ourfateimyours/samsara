/* ================================================================
   로비 버튼 아이콘 — 원 없이 아이콘만, 화려하게 (viewBox 0 0 64 64)
   흰색→연보라 그라데이션 몸체 + 흰 테두리 + 뒤의 별 모양 장식(.orn) + 반짝이
   window.EMBLEM.roster / board / world / heart / record / attend / music / admin / shop / new
   ================================================================ */
(function () {
  const INK = '#15122e';
  let n = 0;
  const grad = () => { const id = 'eg' + (++n); return [id, `<defs><linearGradient id="${id}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <radialGradient id="${id}h" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c4b6ff" stop-opacity=".5"/><stop offset="1" stop-color="#c4b6ff" stop-opacity="0"/></radialGradient></defs>`]; };
  const spark = (x, y, s, o = 1) => `<path d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="#fff" opacity="${o}"/>`;
  const dia = (x, y, s, c = '#efeaff') => `<path d="M${x} ${y - s}L${x + s} ${y}L${x} ${y + s}L${x - s} ${y}Z" fill="${c}"/>`;
  // 뒤 장식: 빛무리 + 가는 팔방 별 + 점선 마름모 + 네 귀퉁이 작은 마름모
  const orn = () => '';   // 뒤 장식 없음 (흰 아이콘만)
  const svg = (body, sparks) => { const [id, defs] = grad(); return `<svg class="emb" viewBox="0 0 64 64" aria-hidden="true">${defs}<g class="ic">${body(id)}</g></svg>`; };   // 반짝이 · 뒤 장식 없이 흰 아이콘만
  const F = () => `fill="#fff"`;

  window.EMBLEM = {
    /* 멤버란: 겹쳐 선 두 사람 */
    roster: svg(id => `<circle cx="40" cy="22" r="6" ${F(id)} opacity=".55"/><path d="M29 47C29 36.5 34 31.5 40 31.5S51 36.5 51 47Z" ${F(id)} opacity=".55"/>
      <circle cx="25.5" cy="24" r="7.6" ${F(id)}/><path d="M11.5 52C11.5 39.5 18 34 25.5 34S39.5 39.5 39.5 52Z" ${F(id)}/>`),
    /* 사건 보드: 핀 꽂힌 쪽지 */
    board: svg(id => `<g transform="rotate(-7 31 32)"><path d="M15 15H47V42L39 50H15Z" ${F(id)}/><path d="M39 50V42H47Z" fill="#fff" opacity=".55"/>
      <path d="M21 25H41M21 31.5H37M21 38H31" stroke="${INK}" stroke-width="2" stroke-linecap="round"/></g>
      <circle cx="30" cy="13" r="4" ${F(id)}/><circle cx="30" cy="13" r="1.4" fill="${INK}"/>`),
    /* 세계관: 초승달 아래의 문(門) */
    world: svg(id => `<path d="M45 6A8 8 0 1 0 53 17A6.4 6.4 0 1 1 45 6Z" ${F(id)}/>
      <path d="M7 24Q32 16 57 24L55 29Q32 22.5 9 29Z" ${F(id)}/>
      <rect x="13" y="32" width="38" height="3.8" rx="1" ${F(id)}/><rect x="16.5" y="26.5" width="5" height="27" rx="1" ${F(id)}/><rect x="42.5" y="26.5" width="5" height="27" rx="1" ${F(id)}/>
      <rect x="28" y="24" width="8" height="8.6" rx="1" fill="${INK}" stroke="#fff" stroke-width=".9"/><text x="32" y="30.6" font-size="5.6" text-anchor="middle" fill="#fff" font-family="serif">門</text>`),
    /* 심박: 하트를 가로지르는 심전도 */
    heart: svg(id => `<path d="M32 54C19 45 12.5 38.5 12.5 30C12.5 23.5 17.4 18.5 23.6 18.5C27.4 18.5 30.2 20.4 32 23.4C33.8 20.4 36.6 18.5 40.4 18.5C46.6 18.5 51.5 23.5 51.5 30C51.5 38.5 45 45 32 54Z" ${F(id)}/>
      <path d="M3 34H15" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M49 34H61" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M15 34H22.5L26 26.5L31 42L35.5 30L38.5 34H49" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`),
    /* 내 기록: 天師監 기록부 — 표지에 記錄 · 도장 · 책갈피 끈이 달린 책 */
    record: svg(id => `<g transform="rotate(-8 32 33)">
      <path d="M22.4 10.6H48.9A2 2 0 0 1 50.9 12.6V54.6A2 2 0 0 1 48.9 56.6H22.4Z" fill="#fff" opacity=".5"/>
      <path d="M20 9H45.5A2 2 0 0 1 47.5 11V53A2 2 0 0 1 45.5 55H20Z" ${F(id)}/>
      <rect x="15.5" y="9" width="5.6" height="46" rx="1.4" ${F(id)}/><path d="M21.1 9.6V54.4" stroke="${INK}" stroke-width=".9"/>
      <rect x="24.5" y="13.5" width="18.5" height="37" fill="none" stroke="${INK}" stroke-width=".9"/>
      <text x="33.8" y="24.2" font-size="7.6" text-anchor="middle" fill="${INK}" font-family="serif">記</text><text x="33.8" y="33" font-size="7.6" text-anchor="middle" fill="${INK}" font-family="serif">錄</text>
      <rect x="29.3" y="37.6" width="9" height="9" rx=".8" fill="${INK}"/><text x="33.8" y="44.5" font-size="6.6" text-anchor="middle" fill="#fff" font-family="serif">印</text>
      <path d="M40 54V61.5L42.2 59.3L44.4 61.5V54" ${F(id)}/></g>`),
    /* 출석: 달력 + 도장 */
    attend: svg(id => `<rect x="11" y="16" width="34" height="31" rx="3" ${F(id)}/><path d="M11 24H45" stroke="${INK}" stroke-width="1.8"/>
      <path d="M19 11.5V19M37 11.5V19" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>
      <g fill="${INK}"><rect x="16" y="28" width="4.6" height="4" rx=".8"/><rect x="23.6" y="28" width="4.6" height="4" rx=".8"/><rect x="31.2" y="28" width="4.6" height="4" rx=".8"/><rect x="16" y="35" width="4.6" height="4" rx=".8"/></g>
      <circle cx="44" cy="44" r="10" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
      <path d="M39.4 44.2L42.7 47.5L48.8 41" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`),
    /* 음악: 음표 */
    music: svg(id => `<path d="M24 43V17L48 12V38" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/><path d="M24 21.5L48 16.5" stroke="#fff" stroke-width="5.4"/>
      <ellipse cx="19" cy="44" rx="6.6" ry="5.3" ${F(id)} transform="rotate(-18 19 44)"/><ellipse cx="43" cy="39" rx="6.6" ry="5.3" ${F(id)} transform="rotate(-18 43 39)"/>`),
    /* 관리: 문장 방패 */
    admin: svg(id => `<path d="M32 9L50 15.5V29C50 41.5 42 49 32 53C22 49 14 41.5 14 29V15.5Z" ${F(id)}/>
      <path d="M32 14.5L45 19.2V29.5C45 38.6 39.5 44.6 32 47.6C24.5 44.6 19 38.6 19 29.5V19.2Z" fill="none" stroke="${INK}" stroke-width=".9"/>
      <path d="M32 22Q32 30 39 31Q32 32 32 40Q32 32 25 31Q32 30 32 22Z" fill="${INK}"/>`,
      spark(52, 10, 3) + spark(11, 48, 2, .8)),
    /* (지금은 메인에 없지만 남겨 둬요) 상점 · 새 인물 */
    shop: svg(id => `<path d="M12 18H52L55 28H9Z" ${F(id)}/><path d="M12 28V50H52V28" ${F(id)}/><rect x="18" y="34" width="10" height="16" rx="1" fill="${INK}"/><rect x="33" y="34" width="13" height="9" rx="1" fill="${INK}"/>`, spark(52, 10, 3)),
    new: svg(id => `<path d="M16 9H36L46 19V54H16Z" ${F(id)}/><path d="M22 28H40M22 35H36M22 42H31" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`, spark(50, 12, 3))
  };
})();
