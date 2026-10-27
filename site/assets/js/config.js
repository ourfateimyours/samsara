/* ================================================================
   사이트 설정 — 이 파일만 고치면 이름/백엔드를 바꿀 수 있어요.
   ================================================================ */
window.SITE_CONFIG = {
  // 로고 한자 (1~2글자 추천) / 한글 읽기 / 영문 문구
  siteName: '三娑罗',
  siteNameKo: '삼사라',
  siteMotto: 'Archive of Crimson Talismans',

  // ── Supabase 연결 (README.md 의 "2. 회원가입 연결하기" 참고) ──
  // 둘 다 비워 두면 "데모 모드": 데이터가 지금 쓰는 브라우저에만 저장됩니다.
  supabaseUrl: '',
  supabaseAnonKey: '',

  // 인물 파일 배경에 이름 적힌 봉인 부적을 겹겹이 붙일지 (true 로 바꾸면 다시 나와요)
  dossierTalismans: true,

  // 아이디 로그인용 내부 주소 (회원에겐 안 보여요. 사이트를 연 뒤엔 바꾸지 마세요 — 바꾸면 기존 회원이 로그인 못 해요)
  idEmailDomain: 'member.hongbu.site'
};
