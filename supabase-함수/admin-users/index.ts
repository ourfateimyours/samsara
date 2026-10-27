// ================================================================
//  admin-users — 관리자 전용: 회원 비밀번호 변경 / 탈퇴 처리
//  Supabase 대시보드 → Edge Functions → Deploy a new function → "admin-users" 로 이 코드를 붙여넣기
//  (service_role 키는 Supabase 서버 안에서만 쓰여요. 홈페이지 파일에는 절대 넣지 마세요)
// ================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1) 요청한 사람이 누구인지 확인
  const asCaller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await asCaller.auth.getUser();
  if (!user) return json({ error: '로그인이 필요해요.' }, 401);

  // 2) 관리자인지 확인
  const admin = createClient(url, service);
  const { data: me } = await admin.from('profiles').select('grade, approval').eq('id', user.id).single();
  if (me?.grade !== 'admin' || me?.approval !== 'approved') return json({ error: '관리자만 할 수 있어요.' }, 403);

  const { action, user_id, password } = await req.json().catch(() => ({}));
  if (!user_id) return json({ error: '회원을 골라 주세요.' }, 400);

  if (action === 'set_password') {
    if (!password || String(password).length < 6) return json({ error: '비밀번호는 6자 이상이어야 해요.' }, 400);
    // 다른 관리자의 비밀번호는 바꿀 수 없어요 (관리자 계정 빼앗기 방지)
    const { data: tg } = await admin.from('profiles').select('grade').eq('id', user_id).single();
    if (tg?.grade === 'admin' && user_id !== user.id) return json({ error: '다른 관리자의 비밀번호는 바꿀 수 없어요.' }, 403);
    const { error } = await admin.auth.admin.updateUserById(user_id, { password });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (action === 'delete_user') {
    if (user_id === user.id) return json({ error: '자기 자신은 탈퇴 처리할 수 없어요.' }, 400);
    const { data: target } = await admin.from('profiles').select('grade').eq('id', user_id).single();
    if (target?.grade === 'admin') return json({ error: '관리자는 먼저 일반 회원으로 바꾼 뒤 탈퇴시켜 주세요.' }, 400);
    // 계정을 지우면 명부·캐릭터·쪽지·텔레파시도 함께 지워져요 (on delete cascade)
    const { error } = await admin.auth.admin.deleteUser(user_id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  return json({ error: '알 수 없는 요청이에요.' }, 400);
});
