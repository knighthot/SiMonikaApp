// Navigations/navigationService.js
import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navRef = createNavigationContainerRef();

function reset(name) {
  if (!navRef.isReady()) {
    // kalau belum siap, tunda 1 frame biar aman
    requestAnimationFrame(() => reset(name));
    return;
  }
  navRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name }],
    })
  );
}

export const resetToLogin = () => reset('Login');         // ⬅️ ganti dari 'AuthStack' ke 'Login'
export const resetToAdmin = () => reset('Admin');
export const resetToUser  = () => reset('User');
export const resetToRole  = (role) => reset(role === 'ADMIN' ? 'Admin' : 'User');
