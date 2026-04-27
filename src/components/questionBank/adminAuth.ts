import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const ADMIN_EMAIL = 'candiescot@gmail.com';
const ADMIN_PASSWORD = '5834';

export async function ensureQuestionBankAdmin(password?: string) {
  if (password !== ADMIN_PASSWORD) {
    alert('没有操作权限');
    return false;
  }

  if (auth.currentUser?.email === ADMIN_EMAIL) return true;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    if (auth.currentUser && auth.currentUser.email !== ADMIN_EMAIL) {
      await signOut(auth);
    }

    await signInWithPopup(auth, provider);

    if (auth.currentUser?.email !== ADMIN_EMAIL) {
      alert(`请使用管理员账号 ${ADMIN_EMAIL} 登录。`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(error);
    alert('写入数据库前需要登录管理员 Google 账号。');
    return false;
  }
}
