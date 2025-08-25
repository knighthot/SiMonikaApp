// DashboardUser.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, StatusBar, Image, ActivityIndicator, AppState, Alert, Modal, Platform, UIManager, LayoutAnimation
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Feather';
import Svg, { Circle } from 'react-native-svg';
import WaveWhiteBackground from '../../../Components/Decor/WaveWhiteBackground';
import Logo from "../../../Assets/Image/Logo.png";
import LiquidBadge from '../../../Components/CircleInfo/LiquidBadge';
import CardWave from '../../../Components/Decor/CardWave';
import { getMe, listPerangkatByTambak, getIotLast, apiFetch, aiSummary, getHistoryTrend } from '../../../api';
import { useNavigation } from '@react-navigation/native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Accordion = ({ title, open, onToggle, children }) => (
  <View className="mb-2">
    <TouchableOpacity
      onPress={() => { LayoutAnimation.easeInEaseOut(); onToggle?.(); }}
      className="bg-slate-200 rounded-xl px-3 py-2 flex-row items-center justify-between"
    >
      <Text className="font-semibold text-slate-800">{title}</Text>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#334155" />
    </TouchableOpacity>

    {open && (
      <View className="mt-2 bg-slate-100 rounded-xl p-3">
        {children}
      </View>
    )}
  </View>
);

// === gauge ring ===
const RingGauge = ({ valueText, progress = 0.35, color = '#22c55e', size = 120 }) => {
  const STROKE = 10;
  const R = (size - STROKE * 2) / 2;
  const C = 2 * Math.PI * R;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = C * (1 - clamped);
  return (
    <View className="items-center justify-center">
      <View className="rounded-full items-center justify-center shadow relative"
        style={{ width: size, height: size, backgroundColor: '#e6f1ff' }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={R} stroke="white" strokeWidth={STROKE} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={R} stroke={color} strokeWidth={STROKE}
            strokeLinecap="round" fill="none" strokeDasharray={C} strokeDashoffset={offset}
            transform={`rotate(-110 ${size / 2} ${size / 2})`} />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-[18px] font-extrabold" style={{ color }}>{valueText}</Text>
        </View>
      </View>
    </View>
  );
};

const GaugeCard = ({ label, color, valueText, progress }) => (
  <View className="w-[220px] max-w-[220px] rounded-2xl overflow-hidden bg-[#cfe8ff]">
    <View className="items-center justify-center py-4">
      <RingGauge valueText={valueText} progress={progress} color={color} />
    </View>
    <View className="bg-[#67A9F3] items-center py-3">
      <Text className="text-white font-extrabold text-[14px]">{label}</Text>
    </View>
  </View>
);

// status sederhana
const getStatus = ({ Suhu, PH, Salinitas, Kekeruhan }) => {
  const bad =
    (Suhu < 26 || Suhu > 34) ||
    (PH < 7 || PH > 9) ||
    (Salinitas < 10 || Salinitas > 30) ||
    (Kekeruhan > 200);
  const warn =
    (Suhu >= 26 && Suhu < 28) || (Suhu > 32 && Suhu <= 34) ||
    (PH >= 7 && PH < 7.5) || (PH > 8.5 && PH <= 9) ||
    (Salinitas >= 10 && Salinitas < 15) || (Salinitas > 25 && Salinitas <= 30) ||
    (Kekeruhan > 100 && Kekeruhan <= 200);
  if (bad) return { text: 'Buruk', color: '#ef4444' };
  if (warn) return { text: 'Waspada', color: '#f59e0b' };
  return { text: 'Baik', color: '#22c55e' };
};

// util tanggal
const indoDay = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const tglIndo = (d) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const resetYmd = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const diffDays = (a, b) => Math.max(1, Math.ceil((resetYmd(b) - resetYmd(a)) / 86400000));

const DashboardUser = ({ route }) => {
  const navigation = useNavigation();

  // Ambang WQI
  const WQI_THRESH = { good: 80, fair: 60 };

  // Ekstrak WQI nested
  const deepFindWqi = (obj) => {
    if (!obj || typeof obj !== 'object') return NaN;
    for (const [k, v] of Object.entries(obj)) {
      if (/^wqi$/i.test(k)) {
        const n = Number(v);
        if (Number.isFinite(n)) return n;
      }
      const n = deepFindWqi(v);
      if (Number.isFinite(n)) return n;
    }
    return NaN;
  };

  const extractWqiAny = (p) => {
    const src = p?.Parameter ?? p ?? {};
    for (const k of ['WQI','wqi','Wqi','wqi_value','WQI_value']) {
      const v = Number(src?.[k]);
      if (Number.isFinite(v)) return v;
    }
    const idx = src?.Index ?? src?.index;
    if (Number.isFinite(Number(idx?.WQI ?? idx?.wqi))) {
      return Number(idx.WQI ?? idx.wqi);
    }
    return deepFindWqi(p);
  };

  const wqiToStatusText = (wqi) =>
    wqi >= WQI_THRESH.good ? 'Baik' : wqi >= WQI_THRESH.fair ? 'Waspada' : 'Buruk';

  const toKey = (txt) => (txt === 'Baik' ? 'baik' : txt === 'Buruk' ? 'buruk' : 'sedang');
  const colorOfStatus = (txt) => (txt === 'Baik' ? '#22c55e' : txt === 'Buruk' ? '#ef4444' : '#f59e0b');
  const clampWords = (text = '', max = 40) => {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    return words.length <= max ? String(text).trim() : words.slice(0, max).join(' ') + '…';
  };

  // ===== MODAL RAMAL =====
  const [ramalOpen, setRamalOpen] = useState(false);
  const [startDate, setStartDate] = useState(resetYmd(new Date()));
  const [endDate, setEndDate] = useState(addDays(resetYmd(new Date()), 7));
  const [totalDaysInput, setTotalDaysInput] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [forecastMeta, setForecastMeta] = useState(null);  // {start,end,days}
  const [forecastSummary, setForecastSummary] = useState(null);

  // ===== MODAL TANYA AI (dropdown/accordion) =====
  const [askOpen, setAskOpen] = useState(false);
  const personaList = [
    { key: 'ahli', label: 'Ahli Kualitas Air Tambak' },
    { key: 'penyuluh', label: 'Penyuluh Perikanan' },
    { key: 'operator', label: 'Operator Tambak (praktis)' },
  ];
  const konteksList = [
    { key: 'kerapu', label: 'Budidaya Kerapu Cantang di air laut' },
    { key: 'umum', label: 'Budidaya ikan laut umum' },
  ];
  const dataList = [
    { key: '-', label: '-' },
    { key: 'terbaru', label: 'Gunakan data sensor terbaru (yang ditampilkan)' },
    { key: 'riwayat', label: 'Gunakan data tren (2/3/5/7 hari) jika ada' },
  ];
  const perintahList = [
    { key: 'analisis', label: 'Analisis kondisi & risiko' },
    { key: 'rekom', label: 'Berikan rekomendasi langkah' },
    { key: 'analisis_rekom', label: 'Analisis + Rekomendasi' },
  ];
  const formatList = [
    { key: 'ringkas', label: 'Paragraf ringkas + 2 poin tindakan' },
    { key: 'langkah', label: 'Langkah-langkah bernomor' },
    { key: 'table', label: 'Ringkasan tabel + bullet' },
  ];
  const [persona, setPersona] = useState(personaList[0].key);
  const [konteks, setKonteks] = useState(konteksList[0].key);
  const [dataSel, setDataSel] = useState(dataList[0].key);
  const [perintah, setPerintah] = useState(perintahList[0].key);
  const [format, setFormat] = useState(formatList[0].key);

  const [openSec, setOpenSec] = useState({ persona: false, konteks: false, data: false, tanya: false, format: false });
  const [question, setQuestion] = useState('');
  const toggle = (k) => setOpenSec(s => ({ ...s, [k]: !s[k] }));

  // ===== Tren riwayat (2/3/5/7 hari, per jam) =====
  const DAYS_PRESETS = [2, 3, 5, 7];
  const [trendDays, setTrendDays] = useState(7);
  const [histSeries, setHistSeries] = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (dataSel !== 'riwayat' || !me?.ID_Tambak) return;
    let on = true;
    (async () => {
      try {
        setHistLoading(true);
        const resp = await getHistoryTrend(me.ID_Tambak, { days: trendDays });
        if (!on) return;
        setHistSeries(resp?.series || []);
      } catch (e) {
        if (!on) return;
        setHistSeries(null);
        Alert.alert('Riwayat', e?.message || 'Gagal mengambil tren');
      } finally {
        if (on) setHistLoading(false);
      }
    })();
    return () => { on = false; };
  }, [dataSel, me?.ID_Tambak, trendDays]);

  // data utama
  const [me, setMe] = useState(null);
  const [perangkat, setPerangkat] = useState(null);
  const [sensor, setSensor] = useState({ Suhu: 0, PH: 0, Salinitas: 0, Kekeruhan: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // polling aman
  const pollRef = useRef(null);
  const fetchingRef = useRef(false);
  const abortRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const [statusFromForecast, setStatusFromForecast] = useState(null);

  const normalizeSensor = (raw) => {
    const P = raw?.Parameter ?? raw ?? {};
    const pH = (P?.pH ?? P?.PH ?? P?.ph ?? 0);
    return {
      Suhu: Number(P?.Suhu ?? P?.suhu ?? 0),
      PH: Number(pH),
      Salinitas: Number(P?.Salinitas ?? P?.salinitas ?? 0),
      Kekeruhan: Number(P?.Kekeruhan ?? P?.kekeruhan ?? 0),
    };
  };

  const fetchLastReading = async (iotId) => {
    if (!iotId) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (abortRef.current) { try { abortRef.current.abort(); } catch { } }
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const last = await getIotLast(iotId, { signal: controller.signal });
      if (last) setSensor(normalizeSensor(last));
    } catch (_) {
    } finally {
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const meSrv = await getMe();
        if (cancelled) return;
        setMe(meSrv);
        if (!meSrv?.ID_Tambak) throw new Error('User belum terhubung dengan tambak. Hubungi admin.');

        const list = await listPerangkatByTambak(meSrv.ID_Tambak, { page: 1, limit: 10 });
        if (cancelled) return;

        const rows = list?.rows || list?.data || list || [];
        if (!rows.length) throw new Error('Belum ada perangkat untuk tambak ini.');
        const aktif = rows.find(r => r.Status === 'Aktif') || rows[0];
        setPerangkat(aktif);

        await fetchLastReading(aktif?.ID_PerangkatIot);

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
          if (appStateRef.current === 'active') {
            fetchLastReading(aktif?.ID_PerangkatIot);
          }
        }, 2000);
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Gagal memuat dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const sub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
      if (next !== 'active') {
        if (abortRef.current) { try { abortRef.current.abort(); } catch { } }
      }
    });

    return () => {
      cancelled = true;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (abortRef.current) { try { abortRef.current.abort(); } catch { } }
      sub?.remove?.();
    };
  }, []);

  // sinkron endDate saat start/total berubah
  useEffect(() => {
    const n = Number(totalDaysInput);
    if (n > 0) setEndDate(addDays(startDate, n));
  }, [startDate, totalDaysInput]);

  const uiStatusText = statusFromForecast; // null sebelum user meramal
  const uiStatusKey = uiStatusText ? toKey(uiStatusText) : null;

  const now = new Date();
  const defaultEnd = addDays(now, 7);

  const displayStart = forecastMeta?.start || now;
  const displayEnd = forecastMeta?.end || defaultEnd;

  const gauges = [
    { label: 'SUHU', color: '#22c55e', valueText: `${sensor.Suhu.toFixed(1)}°C`, progress: Math.min(1, Math.max(0, (sensor.Suhu - 20) / 20)) },
    { label: 'PH', color: '#ef4444', valueText: `${sensor.PH.toFixed(2)} pH`, progress: Math.min(1, Math.max(0, sensor.PH / 14)) },
    { label: 'SALINITAS', color: '#a3be00', valueText: `${sensor.Salinitas.toFixed(1)} ppt`, progress: Math.min(1, Math.max(0, sensor.Salinitas / 40)) },
    { label: 'KEKERUHAN', color: '#0ea5e9', valueText: `${sensor.Kekeruhan.toFixed(0)} NTU`, progress: Math.min(1, Math.max(0, sensor.Kekeruhan / 300)) },
  ];
  const CARD_W = 200, GAP = 12;

  // api forecast
  async function callForecast(days) {
    const horizon = days * 24;
    const body = {
      id_tambak: me?.ID_Tambak,
      id_perangkat_iot: perangkat?.ID_PerangkatIot,
      horizon,
      frequency: 'hourly',
      history_range: null
    };
    const res = await apiFetch('/api/peramalan/forecast', { method: 'POST', body });
    return res;
  }

  // versi counter untuk key
  const [badgeVersion, setBadgeVersion] = useState(0);

  async function onSubmitRamal() {
    try {
      const days = Number(totalDaysInput) > 0 ? Number(totalDaysInput) : diffDays(startDate, endDate);
      setRamalOpen(false);

      const fc = await callForecast(days);
      setForecastMeta({ start: startDate, end: endDate, days });

      const fcArr =
        (Array.isArray(fc?.forecast) && fc.forecast) ||
        (Array.isArray(fc?.data?.forecast) && fc.data.forecast) ||
        (Array.isArray(fc?.result?.forecast) && fc.result.forecast) ||
        (Array.isArray(fc) && fc) || [];

      // 1) WQI prioritas
      const wqis = fcArr.map(extractWqiAny).filter(Number.isFinite);
      let nextStatus = null;
      if (wqis.length) {
        const minWqi = Math.min(...wqis);
        nextStatus = wqiToStatusText(minWqi);
      }

      // 2) Ringkasan AI (fallback status jika WQI kosong)
      const sum = await aiSummary({
        sensor,
        forecast: fcArr,
        debug: true,
        meta: { id_tambak: me?.ID_Tambak, id_perangkat_iot: perangkat?.ID_PerangkatIot, nama_tambak: me?.TB_Tambak?.Nama, range: { start: startDate, end: endDate, days } }
      }).catch(() => null);

      const apiText = sum?.condition_text ?? sum?.data?.condition_text ?? '';
      setForecastSummary(clampWords(apiText, 40));

      if (!nextStatus && sum?.status) {
        nextStatus = sum.status;
      }

      if (nextStatus) {
        setStatusFromForecast(nextStatus);
        setBadgeVersion((v) => v + 1);
      } else {
        setStatusFromForecast(null);
      }

      Alert.alert('Ramalan dibuat', `Rentang ${tglIndo(startDate)} s.d. ${tglIndo(endDate)} (${days} hari).`);
    } catch (e) {
      Alert.alert('Gagal', e?.message || 'Gagal membuat ramalan');
    }
  }

  function stat(series, key) {
    if (!Array.isArray(series) || !series.length) return null;
    const vals = series.map(x => Number(x?.[key])).filter(Number.isFinite);
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return { min: Math.min(...vals), max: Math.max(...vals), avg: +(sum / vals.length).toFixed(2), n: vals.length };
  }

  function buildPromptFromSelections(qText = '') {
    const s = sensor || {};
    const sensorLine = `Data saat ini → Suhu=${(s.Suhu ?? 0).toFixed(1)}°C, pH=${(s.PH ?? 0).toFixed(2)}, Salinitas=${(s.Salinitas ?? 0).toFixed(1)} ppt, Kekeruhan=${(s.Kekeruhan ?? 0).toFixed(0)} NTU.`;
    const yearNow = new Date().getFullYear();
    const yearMin = yearNow - 5;
    const labelOf = (arr, k) => arr.find(x => x.key === k)?.label || k;

    return [
      `Persona: ${labelOf(personaList, persona)}.`,
      `Konteks: ${labelOf(konteksList, konteks)}.`,
      `Data yang digunakan: ${labelOf(dataList, dataSel)}.`,
      sensorLine,
      qText?.trim()
        ? `Pertanyaan pengguna: "${qText.trim()}"`
        : `Perintah: ${labelOf(perintahList, perintah)}.`,
      `Format Jawaban: ${labelOf(formatList, format)}.`,
      `Sertakan referensi ≤ ${yearMin}-${yearNow} bila relevan. Jelaskan ketidakpastian bila data kurang.`,
    ].join('\n');
  }

  const previewPrompt = useMemo(() => {
    const base = buildPromptFromSelections(question);
    if (dataSel !== 'riwayat' || !histSeries?.length) {
      return base + '\nCatatan: Tren tidak tersedia atau belum dimuat.';
    }
    const stS = stat(histSeries, 'Suhu');
    const stP = stat(histSeries, 'PH');
    const stSa = stat(histSeries, 'Salinitas');
    const stT = stat(histSeries, 'Kekeruhan');
    const stW = stat(histSeries, 'WQI');

    const ringkas = [
      `Tren ${trendDays} hari (per jam, ${histSeries.length} titik):`,
      stS && `• Suhu avg ${stS.avg}°C (min ${stS.min} – max ${stS.max})`,
      stP && `• pH avg ${stP.avg} (min ${stP.min} – max ${stP.max})`,
      stSa && `• Salinitas avg ${stSa.avg} ppt (min ${stSa.min} – max ${stSa.max})`,
      stT && `• Kekeruhan avg ${stT.avg} NTU (min ${stT.min} – max ${stT.max})`,
      stW && `• WQI avg ${stW.avg} (min ${stW.min} – max ${stW.max})`,
    ].filter(Boolean).join('\n');

    return `${base}\n${ringkas}`;
  }, [persona, konteks, dataSel, perintah, format, sensor, question, histSeries, trendDays]);

  async function onSubmitAskAI() {
    try {
      setAskOpen(false);
    navigation.navigate('ChatAi', {
  initialPrompt: previewPrompt,
  autoSend: true,
  preferNewSession: true, // <-- ini
});

    } catch (e) {
      Alert.alert('Gagal', e?.message || 'Gagal menyiapkan pertanyaan');
    }
  }

  // handler DateTimePicker
  const onChangeStart = (event, selected) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (selected) {
      const d = resetYmd(selected);
      setStartDate(d);
      const n = Number(totalDaysInput);
      if (n > 0) setEndDate(addDays(d, n));
    }
  };
  const onChangeEnd = (event, selected) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (selected) {
      const d = resetYmd(selected);
      setEndDate(d);
      if (!totalDaysInput) setTotalDaysInput(String(diffDays(startDate, d)));
    }
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
        <Text className="mt-3">Memuat dashboard…</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-white">
        <Text className="text-red-600 font-bold mb-2">Gagal Memuat</Text>
        <Text className="text-center mb-4">{err}</Text>
        <TouchableOpacity
          onPress={() => { navigation?.replace?.('DashboardUser', route?.params || {}); }}
          className="bg-[#67A9F3] px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-extrabold">Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white ">
      <StatusBar translucent={true} backgroundColor={'transparent'} />
      <ScrollView showsVerticalScrollIndicator={false} >

        {/* Greeting */}
        <View style={styles.cardShadow} className="mx-4 mt-14">
          <View className="rounded-3xl bg-white overflow-hidden">
            <View className="absolute left-0 right-0 bottom-0">
              <CardWave height={100} />
            </View>

            <View className="p-5">
              <Text className="text-[36px] font-extrabold">
                {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text className="text-[16px] mt-1 font-semibold">{indoDay[now.getDay()]}</Text>
              <Text className="text-[20px] mt-8 font-extrabold text-[#ffffff]">Selamat Datang</Text>
              <Text className="text-[18px] -mt-1 font-extrabold text-[#ffffff]">Di {me?.TB_Tambak?.Nama || me?.Tambak || 'Tambak'}</Text>
            </View>

            <View className="absolute right-4 top-12">
              <View className="w-[96px] h-[96px] bg-[#cfe8ff] rounded-full items-center justify-center">
                <Image source={Logo} className="w-[60px] h-[65px]" />
              </View>
            </View>
          </View>
        </View>

        <View className="h-[70px] mt-4" pointerEvents="none">
          <View className="absolute left-0 right-0 top-[-40px]">
            <WaveWhiteBackground height={150} />
          </View>
        </View>

        {/* Status + actions */}
        <View className="mt-4 px-4 flex-1">
          <View className="flex-row items-center">
            {uiStatusKey ? (
              <LiquidBadge
                key={`${uiStatusKey}-${badgeVersion}`}
                status={uiStatusKey}
                label={uiStatusText}
              />
            ) : (
              <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#6B7280', fontWeight: '700' }}>Belum ada{'\n'}ramalan </Text>
              </View>
            )}

            <View className="flex-1 ml-4">
              <Text className="text-[13px] leading-5 text-slate-700 text-justify">
                Kondisi air laut di tambak pada tanggal <Text className="font-bold">{tglIndo(displayStart)}</Text> sampai <Text className="font-bold">{tglIndo(displayEnd)}</Text>{' '}
                {forecastSummary ? (
                  <Text>diperkirakan <Text className="font-bold">{forecastSummary}</Text>.</Text>
                ) : uiStatusText ? (
                  <>
                    berada dalam kategori{' '}
                    <Text style={{ color: colorOfStatus(uiStatusText) }} className="font-bold text-justify">
                      {uiStatusText.toLowerCase()}
                    </Text>.
                    {' '}Parameter utama seperti suhu, pH, salinitas, dan tingkat kekeruhan {uiStatusText === 'Baik' ? 'masih stabil dan sesuai' : 'perlu perhatian'} untuk budidaya ikan kerapu.
                  </>
                ) : (
                  <>— buat ramalan untuk melihat status berdasarkan WQI.</>
                )}
              </Text>

              <View className="flex-row mt-3">
                <TouchableOpacity className="bg-[#67A9F3] px-4 py-2 rounded-xl mr-3" onPress={() => setRamalOpen(true)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text className="text-white font-extrabold ml-2">Ramal</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity className="bg-[#67A9F3] px-4 py-2 rounded-xl" onPress={() => setAskOpen(true)}>
                  <Text className="text-white font-extrabold">Tanya AI</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

        </View>

        {/* Header + Cek Alat */}
        <View className="mt-6 px-4 flex-row items-center justify-between">
          <Text className="text-[18px] font-bold text-slate-800">Parameter</Text>
          <TouchableOpacity
            className="bg-[#67A9F3] px-4 py-2 rounded-xl"
            onPress={() => navigation.navigate('DashboardUser', { screen: 'MonitoringIot' })}>
            <Text className="text-white font-extrabold">Cek Alat</Text>
          </TouchableOpacity>
        </View>

        {/* Gauges */}
        <View className="mt-3 mb-48">
          <FlatList
            data={gauges}
            keyExtractor={(it) => it.label}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
            snapToInterval={CARD_W + GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            renderItem={({ item }) => (
              <GaugeCard
                label={item.label}
                color={item.color}
                valueText={item.valueText}
                progress={item.progress}
              />
            )}
          />
        </View>

        {/* ===== Modal Ramal (DateTimePicker) ===== */}
        <Modal visible={ramalOpen} transparent animationType="fade" onRequestClose={() => setRamalOpen(false)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-6">
            <View className="w-full rounded-2xl bg-white p-4">
              <Text className="text-lg font-bold mb-2">Ramal sampai kapan?</Text>
              <Text className="text-slate-600 mb-3">Pilih rentang tanggal dan/atau isi total hari. Data perangkat: {perangkat?.ID_PerangkatIot || '-'}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.inputBtn}>
                  <Icon name="calendar" size={16} color="#1B3551" />
                  <Text style={styles.inputBtnText}>Pilih tanggal awal</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.inputBtn}>
                  <Icon name="calendar" size={16} color="#1B3551" />
                  <Text style={styles.inputBtnText}>Pilih tanggal akhir</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: '#6B7280', marginTop: 8 }}>
                Dipilih: {tglIndo(startDate)} → {tglIndo(endDate)}
              </Text>

              {/* Date pickers */}
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={onChangeStart}
                />
              )}
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  minimumDate={startDate}
                  onChange={onChangeEnd}
                />
              )}

              {/* input total hari */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: '600', color: '#1B3551', marginBottom: 6 }}>Total hari (opsional)</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={totalDaysInput}
                  onChangeText={setTotalDaysInput}
                  placeholder={String(diffDays(startDate, endDate))}
                  style={styles.textField}
                />
              </View>

              <View className="flex-row justify-end mt-4">
                <TouchableOpacity onPress={() => setRamalOpen(false)} className="px-4 py-2 rounded-xl mr-2 bg-slate-200">
                  <Text className="font-semibold">Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onSubmitRamal} className="px-4 py-2 rounded-xl bg-[#67A9F3]">
                  <Text className="text-white font-extrabold">Kirim</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ===== Modal Tanya AI (dropdown/accordion) ===== */}
        <Modal visible={askOpen} transparent animationType="fade" onRequestClose={() => setAskOpen(false)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-6">
            <View className="w-full rounded-2xl bg-white p-4">
              <Text className="text-lg font-bold mb-1">Tanya AI</Text>
              <Text className="text-slate-600 mb-3">Klik tiap baris untuk membuka opsi. Terlihat preview sebelum dikirim.</Text>

              {/* Persona */}
              <Accordion title="Pilih persona" open={openSec.persona} onToggle={() => toggle('persona')}>
                <View className="flex-row flex-wrap">
                  {personaList.map(it => (
                    <TouchableOpacity key={it.key}
                      onPress={() => setPersona(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${persona === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}>
                      <Text className={`${persona === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>{it.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Accordion>

              {/* Konteks */}
              <Accordion title="Konteks" open={openSec.konteks} onToggle={() => toggle('konteks')}>
                <View className="flex-row flex-wrap">
                  {konteksList.map(it => (
                    <TouchableOpacity key={it.key}
                      onPress={() => setKonteks(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${konteks === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}>
                      <Text className={`${konteks === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>{it.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Accordion>

              {/* Data */}
              <Accordion title="Data" open={openSec.data} onToggle={() => toggle('data')}>
                <View className="flex-row flex-wrap items-center">
                  {dataList.map(it => (
                    <TouchableOpacity key={it.key}
                      onPress={() => setDataSel(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${dataSel === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}>
                      <Text className={`${dataSel === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>{it.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {dataSel === 'riwayat' && (
                  <View className="mt-2 flex-row items-center">
                    {DAYS_PRESETS.map(d => (
                      <TouchableOpacity key={d} onPress={() => setTrendDays(d)}
                        className={`px-3 py-1 rounded-xl mr-2 ${trendDays === d ? 'bg-[#67A9F3]' : 'bg-slate-200'}`}>
                        <Text className={trendDays === d ? 'text-white' : 'text-slate-800'}>{d} hari</Text>
                      </TouchableOpacity>
                    ))}
                    <Text className="text-[12px] text-slate-500">maks 7 hari</Text>
                    <Text className="ml-2 text-[12px] text-slate-600">
                      {histLoading ? 'Mengambil…' : histSeries?.length ? `${histSeries.length} titik/jam` : '—'}
                    </Text>
                  </View>
                )}
              </Accordion>

              {/* Pertanyaan bebas */}
              <Accordion title="Pertanyaan" open={openSec.tanya} onToggle={() => toggle('tanya')}>
                <Text className="text-slate-600 mb-2 text-[12px]">
                  Boleh tulis pertanyaan bebas; kalau kosong, sistem pakai opsi “Perintah” di bawah.
                </Text>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="contoh: apa risiko 3 hari ke depan dan tindakan cepatnya?"
                  multiline
                  style={{
                    minHeight: 80, textAlignVertical: 'top',
                    borderWidth: 1, borderColor: '#D8DEE9', borderRadius: 10, padding: 10
                  }}
                />
              </Accordion>

              {/* Format jawaban + perintah */}
              <Accordion title="Format jawaban" open={openSec.format} onToggle={() => toggle('format')}>
                <Text className="text-slate-600 mb-1 text-[12px]">Format:</Text>
                <View className="flex-row flex-wrap mb-2">
                  {formatList.map(it => (
                    <TouchableOpacity key={it.key}
                      onPress={() => setFormat(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${format === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}>
                      <Text className={`${format === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>{it.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-slate-600 mb-1 text-[12px]">Perintah (dipakai bila kolom “Pertanyaan” kosong):</Text>
                <View className="flex-row flex-wrap">
                  {perintahList.map(it => (
                    <TouchableOpacity key={it.key}
                      onPress={() => setPerintah(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${perintah === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}>
                      <Text className={`${perintah === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>{it.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Accordion>

              {/* Preview */}
              <View className="mt-2 mb-3 rounded-xl bg-slate-200" style={{ padding: 12 }}>
                <Text className="text-slate-600 text-[12px] mb-1">Preview sebelum dikirim</Text>
                <ScrollView style={{ maxHeight: 180 }}>
                  <Text className="text-slate-800">{previewPrompt}</Text>
                </ScrollView>
              </View>

              {/* Actions */}
              <View className="flex-row justify-end">
                <TouchableOpacity onPress={() => setAskOpen(false)} className="px-4 py-2 rounded-xl mr-2 bg-slate-200">
                  <Text className="font-semibold">Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onSubmitAskAI} className="px-4 py-2 rounded-xl bg-[#67A9F3]">
                  <Text className="text-white font-extrabold">Kirim</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShadow: {
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  inputBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2F7',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, width: '48%',
  },
  inputBtnText: { color: '#1B3551', fontWeight: '700', marginLeft: 8 },
  textField: {
    borderWidth: 1, borderColor: '#D8DEE9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#1B3551', backgroundColor: '#fff',
  },
  groupTitle: { fontWeight: '700', color: '#1B3551', marginBottom: 6, marginTop: 10 },
});

export default DashboardUser;
