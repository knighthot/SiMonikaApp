import { Platform } from 'react-native';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import jwtDecode from 'jwt-decode';
import { resetToLogin } from './Navigations/navigationService';

const BASE_URL = (Config.API_BASE_URL|| 'http://192.168.100.29:3006')
    

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

export async function apiFetch(
  path,
{ method='GET', headers={}, body, ignore401=false, signal } = {}
) {
const token = await AsyncStorage.getItem('auth_token');
  const h = { Accept: 'application/json', 'Content-Type': 'application/json', ...headers };
  if (token) h.Authorization = `Bearer ${token}`;

  
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch {}

  if (res.status === 401 || res.status === 403) {
    // ⬇️ jangan auto-logout jika diminta diamkan 401
    if (!ignore401) {
      // ← log out seperti sebelumnya (hapus token + reset ke login kalau kamu lakukan di sini)
      await AsyncStorage.multiRemove(['auth_token', 'auth_user']);
      // kalau kamu punya resetToLogin di sini, boleh panggil
      // resetToLogin();
    }
    const err = new Error(data?.message || 'Unauthorized');
    err.status = res.status;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
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

//chat ai
export async function listChatSessions() {
  return apiFetch('/api/chat/sessions', { ignore401: true });
}

export async function createChatSession(title = 'Percakapan Baru') {
  return apiFetch('/api/chat/sessions', { method: 'POST', body: { title } });
}

export async function sendChatMessage(sessionId, prompt, model = 'gpt-3.5-turbo-0125', opts = {}) {
  return apiFetch(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: { prompt, model },
    signal: opts.signal
  });
}

export async function deleteChatSession(sessionId) {
  return apiFetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
}


export async function getChatMessages(sessionId, { limit = 50, before, order = 'ASC' } = {}) {
  const q = new URLSearchParams();
  if (limit) q.set('limit', String(limit));
  if (before) q.set('before', before);
  if (order) q.set('order', order);
  const qs = q.toString() ? `?${q.toString()}` : '';
  return apiFetch(`/api/chat/sessions/${sessionId}/messages${qs}`);
}


//perangkat
export async function createPerangkat({ ID_PerangkatIot, Nama_LokasiPerangkat }) {
const token = await AsyncStorage.getItem('auth_token');
  const res = await fetch(`${BASE_URL}/api/perangkat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ID_PerangkatIot, Nama_LokasiPerangkat }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || 'Gagal membuat perangkat';
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  // backend mengembalikan { id: <uuid> }
  return data; 
}

export async function listPerangkat({ page = 1, limit = 20 } = {}) {
  const token = await AsyncStorage.getItem('auth_token');
    console.log(token);
  return apiFetch(`/api/perangkat?page=${page}&limit=${limit}`);
  
}

export async function getPerangkat(id) {
  return apiFetch(`/api/perangkat/${id}`);
}



export async function updatePerangkat(id, payload) {
  return apiFetch(`/api/perangkat/${id}`, { method: 'PUT', body: payload });
}

export async function deletePerangkat(id) {
  return apiFetch(`/api/perangkat/${id}`, { method: 'DELETE' });
}


export const getPerangkatById = (id) => apiFetch(`/api/perangkat/${id}`);
export const getIotLast = (iotId) => apiFetch(`/api/iot/sim/${encodeURIComponent(iotId)}/last`);
export const startIotSim = (iotId) => apiFetch(`/api/iot/ingest/${encodeURIComponent(iotId)}`, { method: 'POST' }); // opsional

/* ===== Tambak (dengan fallback untuk non-admin) ===== */
export const tambakApi = {
  list: async (q = {}) => {
    const qs = new URLSearchParams(q).toString();
    const base = `/api/tambak${qs ? `?${qs}` : ''}`;
    try {
      return await apiFetch(base);
    } catch (e) {
      if (e.status === 403) {
   throw new Error('Hanya ADMIN yang boleh melihat daftar user');
      }
      throw e;
    }
  },
  create: (payload) => apiFetch('/api/tambak', { method: 'POST', body: payload }),
  update: (id, payload) => apiFetch(`/api/tambak/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => apiFetch(`/api/tambak/${id}`, { method: 'DELETE' }),
  getById: (id) => apiFetch(`/api/tambak/${id}`),
};

/* ===== Users (admin-only; kasih pesan jelas kalau 403) ===== */
export const userApi = {
  list: async (q = {}) => {
    const qs = new URLSearchParams(q).toString();
    try {
      return await apiFetch(`/api/users${qs ? `?${qs}` : ''}`);
    } catch (e) {
      if (e.status === 403) throw new Error('Hanya ADMIN yang boleh melihat daftar user');
      throw e;
    }
  },
  create: (payload) => apiFetch('/api/users', { method: 'POST', body: payload }),
  update: (id, payload) => apiFetch(`/api/users/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => apiFetch(`/api/users/${id}`, { method: 'DELETE' }),
  getById: (id) => apiFetch(`/api/users/${id}`),
};