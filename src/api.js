import { Platform } from 'react-native';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from 'jwt-decode';
import { resetToLogin } from './Navigations/navigationService';

const BASE_URL = (Config.API_BASE_URL|| 'http://192.168.1.8:3006')
    

function nowSec() { return Math.floor(Date.now() / 1000); }

async function ensureTokenValidOrLogout() {
  const token = await AsyncStorage.getItem('auth_token');
  if (!token) return null;
  try {
    const { exp } = jwtDecode(token) || {};
    if (exp && exp <= nowSec()) {
      // expired → bersihkan & balik ke login
      await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
      resetToLogin();
      return null;
    }
    return token;
  } catch {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    resetToLogin();
    return null;
  }
}

export async function apiFetch(path, { method='GET', headers={}, body } = {}) {
  // cek kadaluarsa sebelum request
  const token = await ensureTokenValidOrLogout();
  const h = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...headers
  };
  if (token) h.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method, headers: h, body: body ? JSON.stringify(body) : undefined
  });

  // kalau 401 → auto logout & lempar error
  if (res.status === 401 || res.status === 403) {
    await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
    resetToLogin();
    throw new Error('Sesi berakhir. Silakan masuk lagi.');
  }

  // parse json (atau kosong)
  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const msg = (data && data.message) ? data.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// khusus login (tanpa Bearer)
export async function apiLogin(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Nama_tambak: username, Password: password })
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Username/Password salah');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  if (!data?.token) throw new Error('Token tidak diterima dari server');
  // simpan token+user
  await AsyncStorage.setItem('auth_token', data.token);
  if (data.user) await AsyncStorage.setItem('auth_user', JSON.stringify(data.user));
  return data;
}

export async function logout() {
  await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
  resetToLogin();
}
