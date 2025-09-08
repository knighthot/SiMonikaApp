// src/notifications/push.js
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

const CHANNEL_ID = 'default';




// --- 1) init: minta izin + bikin channel Android ---
export async function initPush() {
    // iOS & Android 13 runtime permission
    try { await messaging().requestPermission(); } catch { }
    await ensureChannel();
    // register background handler (Android headless)
    // -> handler utama ada di index.js (lihat langkah #4)
}

// Pastikan channel ada (Android)
async function ensureChannel() {
    await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'General',
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: 'default',
    });
}

// --- 2) subscribe / unsubscribe topic per user ---
export async function subscribeUserTopics(userId, lokasiIds = []) {
    if (!userId) return;
    await messaging().getToken(); // memastikan device terdaftar di FCM
    await messaging().subscribeToTopic(`user_${userId}`);
    const topic = `user_${userId}`;
    await messaging().requestPermission().catch(() => { });
    const token = await messaging().getToken();
    console.log('[FCM] token =', token);
    await messaging().subscribeToTopic(topic);
    console.log('[FCM] subscribed to', topic);
}

export async function unsubscribeUserTopics(userId, lokasiIds = []) {
    if (!userId) return;
    await messaging().unsubscribeFromTopic(`user_${userId}`);
    // opsional:
    // await messaging().unsubscribeFromTopic(`user_${userId}_alert`);
    // for (const loc of lokasiIds) await messaging().unsubscribeFromTopic(`user_${userId}_lok_${loc}`);
}

// --- 3) listener foreground & tap handling ---
let unsubscribeOnMessage = null;
let unsubscribeOnForegroundEvent = null;

export function attachForegroundHandlers({ onNavigate } = {}) {
    // Tampil notif saat app foreground (FCM 'notification' defaultnya tidak tampil di foreground)
    unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
        await showNotificationFromRemote(remoteMessage);
    });

    // Tapping notif saat app foreground
    unsubscribeOnForegroundEvent = notifee.onForegroundEvent(async ({ type, detail }) => {
        if (type === EventType.PRESS) {
            handleNotificationPress(detail.notification, { onNavigate });
        }
    });
}

export function detachForegroundHandlers() {
    unsubscribeOnMessage?.(); unsubscribeOnMessage = null;
    unsubscribeOnForegroundEvent?.(); unsubscribeOnForegroundEvent = null;
}

// --- 4) builder tampilan notif dari payload remote ---
export async function showNotificationFromRemote(remoteMessage) {
    await ensureChannel();

    const n = remoteMessage?.notification || {};
    const d = remoteMessage?.data || {};

    // fallback judul/body kalau server kirim data-only
    const title = n.title || d.title || labelByType(d.type) || 'Pemberitahuan';
    const body =
        n.body ||
        d.body ||
        buildBodyFromData(d) ||
        'Anda menerima pembaruan.';

    await notifee.displayNotification({
        title,
        body,
        android: {
            channelId: CHANNEL_ID,
            smallIcon: 'ic_stat_name', // pastikan icon ada (mipmap/ic_launcher bisa dipakai)
            pressAction: { id: 'default' },
        },
        data: { ...d }, // taruh data untuk navigasi saat ditekan
    });
}

function labelByType(type) {
    switch (type) {
        case 'FORECAST_ALERT': return 'Peramalan Waspada/Buruk';
        case 'FORECAST_INFO': return 'Peramalan Dibuat';
        case 'SENSOR_ISSUE': return 'Sensor Bermasalah';
        default: return null;
    }
}

function buildBodyFromData(d) {
    // contoh format body konsisten dengan backend yang kamu kirim
    if (d.type === 'FORECAST_ALERT' || d.type === 'FORECAST_INFO') {
        const nama = d.lokasiNama || 'Lokasi';
        const range = d.range ? ` (${d.range})` : '';
        const wqi = d.wqi ? ` WQI ${d.wqi}` : '';
        const status = d.status ? `: ${d.status}` : '';
        return `${nama}${range}${status}${wqi}`;
    }
    if (d.type === 'SENSOR_ISSUE') {
        const dev = d.perangkatNama || 'Perangkat';
        const kat = d.kategori || 'ISSUE';
        const det = d.detail ? ` - ${d.detail}` : '';
        return `${dev}: ${kat}${det}`;
    }
    return null;
}

// --- 5) handle navigasi saat notif ditekan ---
export function handleNotificationPress(notification, { onNavigate } = {}) {
    const data = notification?.data || {};
    // contoh: arahkan ke screen berdasarkan type
    if (onNavigate) {
        if (data.type === 'SENSOR_ISSUE') {
            onNavigate('SensorDetail', { perangkatNama: data.perangkatNama });
            return;
        }
        if (data.type?.startsWith('FORECAST_')) {
            onNavigate('ForecastDetail', { lokasiNama: data.lokasiNama });
            return;
        }
        // default
        onNavigate('Notifications');
    }
}
