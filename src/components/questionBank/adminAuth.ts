import { supabase } from '../../supabase';

const ADMIN_EMAIL = 'candiescot@gmail.com';
const ADMIN_PASSWORD = '5834';

export async function ensureQuestionBankAdmin(password?: string) {
  if (password !== ADMIN_PASSWORD) {
    alert('没有操作权限');
    return false;
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.email === ADMIN_EMAIL) return true;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { queryParams: { prompt: 'select_account' } }
  });

  if (error) {
    console.error(error);
    alert('写入数据库前需要登录管理员 Google 账号。');
    return false;
  }

  const { data: { user: newUser } } = await supabase.auth.getUser();
  
  if (newUser?.email !== ADMIN_EMAIL) {
    alert(`请使用管理员账号 ${ADMIN_EMAIL} 登录。`);
    return false;
  }

  return true;
}
