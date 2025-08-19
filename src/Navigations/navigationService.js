import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { InteractionManager } from 'react-native';

export const navRef = createNavigationContainerRef();

function doReset(name) {
  if (!navRef.isReady()) return;
  navRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name }],
    })
  );
}

export const resetToLogin = () => doReset('Login');
export const resetToAdmin = () => doReset('Admin');
export const resetToUser  = () => doReset('User');
export const resetToRole  = (role) => doReset(role === 'ADMIN' ? 'Admin' : 'User');

// Kalau mau ditunda 1 frame/after interactions (menghindari warning):
export function resetToRoleDeferred(role) {
  InteractionManager.runAfterInteractions(() => {
    resetToRole(role);
  });
}