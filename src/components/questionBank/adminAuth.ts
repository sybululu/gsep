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

  // 尝试邮箱登录
  const email = prompt('请输入管理员邮箱登录：');
  if (!email) return false;
  
  const pwd = prompt('请输入密码：');
  if (!pwd) return false;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pwd
  });

  if (error) {
    alert('登录失败: ' + error.message);
    return false;
  }

  if (data.user?.email !== ADMIN_EMAIL) {
    alert(`请使用管理员账号 ${ADMIN_EMAIL} 登录。`);
    await supabase.auth.signOut();
    return false;
  }

  return true;
}
