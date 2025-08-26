// DashboardUser.js
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
  memo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  StatusBar,
  Image,
  AppState,
  Alert,
  Modal,
  Platform,
  UIManager,
  LayoutAnimation,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Feather';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import WaveWhiteBackground from '../../../Components/Decor/WaveWhiteBackground';
import Logo from '../../../Assets/Image/Logo.png';
import LiquidBadge from '../../../Components/CircleInfo/LiquidBadge';
import CardWave from '../../../Components/Decor/CardWave';
import {
  getMe,
  listPerangkatByTambak,
  getIotLast,
  apiFetch,
  aiSummary,
  getHistoryTrend,
} from '../../../api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* -------------------- UI Helpers -------------------- */

const Accordion = ({ title, open, onToggle, children }) => (
  <View className="mb-2">
    <TouchableOpacity
      onPress={() => {
        LayoutAnimation.easeInEaseOut();
        onToggle?.();
      }}
      className="bg-slate-200 rounded-xl px-3 py-2 flex-row items-center justify-between"
    >
      <Text className="font-semibold text-slate-800">{title}</Text>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#334155" />
    </TouchableOpacity>

    {open && <View className="mt-2 bg-slate-100 rounded-xl p-3">{children}</View>}
  </View>
);

const Skeleton = ({ width = '100%', height = 14, radius = 8, style }) => {
  const opacity = React.useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: '#E5E7EB', opacity },
        style,
      ]}
    />
  );
};

const SkeletonGaugeCard = () => (
  <View className="w-[220px] max-w-[220px] rounded-2xl overflow-hidden bg-[#cfe8ff]">
    <View className="items-center justify-center py-4">
      <Skeleton width={120} height={120} radius={60} />
    </View>
    <View className="bg-[#67A9F3] items-center py-3">
      <Skeleton width={120} height={14} radius={7} style={{ backgroundColor: 'rgba(255,255,255,0.7)' }} />
    </View>
  </View>
);

/* -------------------- Gauge -------------------- */

const RingGauge = memo(function RingGauge({
  valueText,
  progress = 0.35,
  color = '#22c55e',
  size = 120,
}) {
  const STROKE = 10;
  const R = (size - STROKE * 2) / 2;
  const C = 2 * Math.PI * R;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = C * (1 - clamped);
  return (
    <View className="items-center justify-center">
      <View
        className="rounded-full items-center justify-center shadow relative"
        style={{ width: size, height: size, backgroundColor: '#e6f1ff' }}
      >
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={R} stroke="white" strokeWidth={STROKE} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={R}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform={`rotate(-110 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-[18px] font-extrabold" style={{ color }}>
            {valueText}
          </Text>
        </View>
      </View>
    </View>
  );
}, (a, b) => a.valueText === b.valueText && a.progress === b.progress && a.color === b.color && a.size === b.size);

const GaugeCard = memo(function GaugeCard({ label, color, valueText, progress }) {
  return (
    <View className="w-[220px] max-w-[220px] rounded-2xl overflow-hidden bg-[#cfe8ff]">
      <View className="items-center justify-center py-4">
        <RingGauge valueText={valueText} progress={progress} color={color} />
      </View>
      <View className="bg-[#67A9F3] items-center py-3">
        <Text className="text-white font-extrabold text-[14px]">{label}</Text>
      </View>
    </View>
  );
}, (a, b) => a.label === b.label && a.color === b.color && a.valueText === b.valueText && a.progress === b.progress);

/* -------------------- Business Logic -------------------- */

// status sederhana
const getStatus = ({ Suhu, PH, Salinitas, Kekeruhan }) => {
  const bad = Suhu < 26 || Suhu > 34 || PH < 7 || PH > 9 || Salinitas < 10 || Salinitas > 30 || Kekeruhan > 200;
  const warn =
    (Suhu >= 26 && Suhu < 28) ||
    (Suhu > 32 && Suhu <= 34) ||
    (PH >= 7 && PH < 7.5) ||
    (PH > 8.5 && PH <= 9) ||
    (Salinitas >= 10 && Salinitas < 15) ||
    (Salinitas > 25 && Salinitas <= 30) ||
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

/* -------------------- Component -------------------- */

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
    for (const k of ['WQI', 'wqi', 'Wqi', 'wqi_value', 'WQI_value']) {
      const v = Number(src?.[k]);
      if (Number.isFinite(v)) return v;
    }
    const idx = src?.Index ?? src?.index;
    if (Number.isFinite(Number(idx?.WQI ?? idx?.wqi))) {
      return Number(idx.WQI ?? idx.wqi);
    }
    return deepFindWqi(p);
  };

  const wqiToStatusText = (wqi) => (wqi >= WQI_THRESH.good ? 'Baik' : wqi >= WQI_THRESH.fair ? 'Waspada' : 'Buruk');

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
  const [forecastMeta, setForecastMeta] = useState(null); // {start,end,days}
  const [forecastSummary, setForecastSummary] = useState(null);

  // ===== MODAL TANYA AI =====
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

  const [openKey, setOpenKey] = useState(null);
  const toggle = (k) => {
    LayoutAnimation.easeInEaseOut();
    setOpenKey((prev) => (prev === k ? null : k));
  };
  const [question, setQuestion] = useState('');

  // ===== Tren riwayat =====
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
    return () => {
      on = false;
    };
  }, [dataSel, me?.ID_Tambak, trendDays]);

  // ===== Data utama =====
  const [me, setMe] = useState(null);
  const [perangkat, setPerangkat] = useState(null);
  const [sensor, setSensor] = useState({ Suhu: NaN, PH: NaN, Salinitas: NaN, Kekeruhan: NaN });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Polling aman
  const pollRef = useRef(null);
  const fetchingRef = useRef(false);
  const abortRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const [statusFromForecast, setStatusFromForecast] = useState(null);

  // Normalize sensor
  const normalizeSensor = (raw) => {
    const P = raw?.Parameter ?? raw ?? {};
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };
    const pH = P?.pH ?? P?.PH ?? P?.ph;
    return {
      Suhu: num(P?.Suhu ?? P?.suhu),
      PH: num(pH),
      Salinitas: num(P?.Salinitas ?? P?.salinitas),
      Kekeruhan: num(P?.Kekeruhan ?? P?.kekeruhan),
    };
  };

  // data basi?
  const FIELD_STALE_MS = 2000;
  const lastSeenRef = useRef({ Suhu: NaN, PH: NaN, Salinitas: NaN, Kekeruhan: NaN });

  // parse ts
  const parseTs = (t) => {
    if (!t) return NaN;
    if (typeof t === 'number') {
      if (t > 1e12) return t;
      if (t > 1e9) return t * 1000;
      return NaN;
    }
    const ms = +new Date(t);
    return Number.isFinite(ms) ? ms : NaN;
  };
  const tsOf = (raw, key) => {
    const P = raw?.Parameter ?? raw ?? {};
    const keyAlt = key === 'PH' ? ['PH', 'pH', 'ph'] : [key, key.toLowerCase()];
    const candidates = [
      ...keyAlt.map((k) => P?.[`${k}_ts`]),
      ...keyAlt.map((k) => P?.[`${k}_time`]),
      ...keyAlt.map((k) => P?.[`${k}Time`]),
      ...keyAlt.map((k) => P?.[`${k}UpdatedAt`]),
      ...keyAlt.map((k) => P?.[`${k}_updated_at`]),
      raw?.Timestamp,
      raw?.timestamp,
      raw?.time,
      raw?.waktu,
      raw?.createdAt,
      raw?.created_at,
      P?.Timestamp,
      P?.timestamp,
    ];
    for (const c of candidates) {
      const ms = parseTs(c);
      if (Number.isFinite(ms)) return ms;
    }
    return NaN;
  };

  // equality guard untuk sensor
  const equalNums = (a, b) =>
    Object.is(a.Suhu, b.Suhu) &&
    Object.is(a.PH, b.PH) &&
    Object.is(a.Salinitas, b.Salinitas) &&
    Object.is(a.Kekeruhan, b.Kekeruhan);

  // ambil data terakhir IoT
  const fetchLastReading = useCallback(
    async (iotId) => {
      if (!iotId || fetchingRef.current) return;
      fetchingRef.current = true;
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const last = await getIotLast(iotId, { signal: controller.signal });
        if (last) {
          const norm = normalizeSensor(last);
          ['Suhu', 'PH', 'Salinitas', 'Kekeruhan'].forEach((k) => {
            if (Number.isFinite(norm[k])) {
              const t = tsOf(last, k);
              lastSeenRef.current[k] = Number.isFinite(t) ? t : Date.now();
            } else {
              lastSeenRef.current[k] = NaN;
            }
          });
          setSensor((prev) => (equalNums(prev, norm) ? prev : norm));
        }
      } catch (_) {
      } finally {
        fetchingRef.current = false;
      }
    },
    [], // stable
  );

  // ticker stale → pause saat background
  useEffect(() => {
    const id = setInterval(() => {
      if (appStateRef.current !== 'active') return;
      const now = Date.now();
      setSensor((prev) => {
        let changed = false;
        const next = { ...prev };
        ['Suhu', 'PH', 'Salinitas', 'Kekeruhan'].forEach((k) => {
          const seen = lastSeenRef.current[k];
          const stale = !Number.isFinite(seen) || now - seen > FIELD_STALE_MS;
          if (stale && Number.isFinite(next[k])) {
            next[k] = NaN;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // helper statistik
  function stat(series, key) {
    if (!Array.isArray(series) || !series.length) return null;
    const vals = series.map((x) => Number(x?.[key])).filter(Number.isFinite);
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return { min: Math.min(...vals), max: Math.max(...vals), avg: +(sum / vals.length).toFixed(2), n: vals.length };
  }

  // privacy
  const privacyList = [
    { key: 'none', label: 'Kirim angka persis' },
    { key: 'bucket', label: 'Hanya kategori (rendah/optimal/tinggi)' },
    { key: 'status', label: 'Hanya status (Baik/Waspada/Buruk)' },
    { key: 'nodata', label: 'Jangan kirim data' },
  ];
  const [privacy, setPrivacy] = useState('nodata');

  const bucketOf = {
    Suhu: (v) => (v < 28 ? 'rendah' : v <= 32 ? 'optimal' : 'tinggi'),
    PH: (v) => (v < 7.5 ? 'rendah' : v <= 8.5 ? 'optimal' : 'tinggi'),
    Salinitas: (v) => (v < 15 ? 'rendah' : v <= 25 ? 'optimal' : 'tinggi'),
    Kekeruhan: (v) => (v <= 100 ? 'optimal' : v <= 200 ? 'sedang' : 'tinggi'),
  };

  function sensorLineForPrompt(s, mode) {
    if (!s) return 'Data saat ini: (tidak ada).';
    if (mode === 'nodata') return 'Data saat ini: (tidak dibagikan).';
    if (mode === 'status') {
      const st = getStatus(s);
      return `Status kualitas (dari data internal): ${st.text}. Angka tidak dibagikan.`;
    }
    if (mode === 'bucket') {
      return `Data saat ini (kategori): Suhu=${bucketOf.Suhu(s.Suhu)}, pH=${bucketOf.PH(s.PH)}, Salinitas=${bucketOf.Salinitas(
        s.Salinitas,
      )}, Kekeruhan=${bucketOf.Kekeruhan(s.Kekeruhan)}.`;
    }
    return `Data saat ini → Suhu=${(s.Suhu ?? 0).toFixed(1)}°C, pH=${(s.PH ?? 0).toFixed(2)}, Salinitas=${(
      s.Salinitas ?? 0
    ).toFixed(1)} ppt, Kekeruhan=${(s.Kekeruhan ?? 0).toFixed(0)} NTU.`;
  }

  function buildPromptFromSelections(qText = '') {
    const s = sensor || {};
    const sLine = sensorLineForPrompt(s, privacy);
    const yearNow = new Date().getFullYear();
    const yearMin = yearNow - 5;
    const labelOf = (arr, k) => arr.find((x) => x.key === k)?.label || k;
    const lines = [
      `Persona: ${labelOf(personaList, persona)}.`,
      `Konteks: ${labelOf(konteksList, konteks)}.`,
      `Data yang digunakan: ${labelOf(dataList, dataSel)}.`,
      sLine,
      qText?.trim() ? `Pertanyaan pengguna: "${qText.trim()}"` : `Perintah: ${labelOf(perintahList, perintah)}.`,
      `Format Jawaban: ${labelOf(formatList, format)}.`,
      `Sertakan referensi ≤ ${yearMin}-${yearNow} bila relevan. Jelaskan ketidakpastian bila data kurang.`,
    ];
    return lines.join('\n');
  }

  const previewPrompt = useMemo(() => {
    const base = buildPromptFromSelections(question);
    if (dataSel !== 'riwayat' || !histSeries?.length || privacy !== 'none') return base + '\n';

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
    ]
      .filter(Boolean)
      .join('\n');

    return `${base}\n${ringkas}`;
  }, [persona, konteks, dataSel, perintah, format, sensor, question, histSeries, trendDays, privacy]);

  /* -------------------- Forecast API helpers -------------------- */

  const CARD_W = 200;
  const GAP = 12;

  async function callForecast(days, { idTambak, idIot } = {}) {
    const horizon = days * 24;
    const body = {
  
      id_tambak: idTambak ?? me?.ID_Tambak,
   id_perangkat_iot: idIot ?? perangkat?.ID_PerangkatIot,
      horizon,
      frequency: 'hourly',
      history_range: null,
    };
    const res = await apiFetch('/api/peramalan/forecast', { method: 'POST', body });
    return res;
  }

  const [badgeVersion, setBadgeVersion] = useState(0);

  async function saveForecastToHistory(payload, { start, end, days, idTambak, idIot }) {
  const t = idTambak ?? me?.ID_Tambak;
  const p = idIot ?? perangkat?.ID_PerangkatIot;
  if (!t || !p) return;
    try {
      await apiFetch('/api/history-peramalan', {
        method: 'POST',
        body: {
         ID_Tambak: t,
    ID_PerangkatIot: p,
          Tanggal_Awal: start.toISOString().slice(0, 10),
          Tanggal_Akhir: end.toISOString().slice(0, 10),
          Jumlah_Hari: days,
          Payload: payload,
          IssuedAt: payload?.meta?.issued_at,
          Horizon: payload?.meta?.horizon,
          Frequency: payload?.meta?.frequency,
          WindowStart: start.toISOString(),
          WindowEnd: end.toISOString(),
        },
      });
    } catch (e) {
      console.log('saveForecastToHistory fail:', e?.message);
    }
  }

  async function startAutoHourly({ start, end, days, idTambak, idIot }) {
    const t = idTambak ?? me?.ID_Tambak;
  const p = idIot ?? perangkat?.ID_PerangkatIot;
  if (!t || !p) return;
    
    try {
      const resp = await apiFetch('/api/peramalan/auto/start', {
        method: 'POST',
        body: {
             id_tambak: t,
             id_perangkat_iot: p,
          window_start: start.toISOString(),
          window_end: end.toISOString(),
          frequency: 'hourly',
          horizon: days * 24,
        },
      });
      if (resp?.skipped) {
        Alert.alert('Auto-forecast', resp?.message || 'Auto sudah aktif (cooldown 5 menit).');
      }
    } catch (e) {
      console.log('startAutoHourly fail:', e?.message);
    }
  }

  const lastSummaryRef = useRef(0);
  async function refreshAutoSummary(idTambak = me?.ID_Tambak, force = false) {
    try {
      if (!idTambak) return false;
      const now = Date.now();
      if (!force && now - lastSummaryRef.current < 5 * 60 * 1000) return true; // throttle 5 menit
     // A. di refreshAutoSummary
const sum = await aiSummary({ ID_Tambak: idTambak }).catch(() => null);
    const txt = sum?.condition_text ?? sum?.data?.condition_text ?? '';
    if (txt) setForecastSummary(clampWords(txt, 40));
    const st = sum?.status ?? sum?.data?.status;
if (st) {
  setStatusFromForecast(st);
  setBadgeVersion(v => v + 1);
}

      lastSummaryRef.current = Date.now();
      return Boolean(txt || sum?.status);
    } catch {
      return false;
    }
  }

function pickForecastArray(fc) {
  return (
    (Array.isArray(fc?.forecast) && fc.forecast) ||
    (Array.isArray(fc?.data?.forecast) && fc.data.forecast) ||
    (Array.isArray(fc?.result?.forecast) && fc.result.forecast) ||
    (Array.isArray(fc?.payload?.forecast) && fc.payload.forecast) ||
    (Array.isArray(fc?.data?.data?.forecast) && fc.data.data.forecast) ||
    (Array.isArray(fc) && fc) ||
    []
  );
}


const worstOf = (a, b) => ({Baik:0, Waspada:1, Buruk:2})[a] >= ({Baik:0, Waspada:1, Buruk:2})[b] ? a : b;

function deriveStatusFromForecast(arr = []) {
  if (!arr.length) return null;
  let status = 'Baik';
  for (const r of arr) {
    const P = r?.Parameter ?? r ?? {};
    const num = (x) => Number.isFinite(+x) ? +x : Number.isFinite(+x?.p50) ? +x.p50 : NaN;
    const suhu = num(P.Suhu ?? P.suhu);
    const ph = num(P.PH ?? P.pH ?? P.ph);
    const sal = num(P.Salinitas ?? P.salinitas);
    const turb = num(P.Kekeruhan ?? P.kekeruhan);

    let cur = 'Baik';
    const bad = suhu < 26 || suhu > 34 || ph < 7 || ph > 9 || sal < 10 || sal > 30 || turb > 200;
    const warn =
      (suhu >= 26 && suhu < 28) || (suhu > 32 && suhu <= 34) ||
      (ph >= 7 && ph < 7.5) || (ph > 8.5 && ph <= 9) ||
      (sal >= 10 && sal < 15) || (sal > 25 && sal <= 30) ||
      (turb > 100 && turb <= 200);
    if (bad) cur = 'Buruk';
    else if (warn) cur = 'Waspada';

    status = worstOf(status, cur);
    if (status === 'Buruk') break;
  }
  return status;
}


  const pick = (obj, ...paths) => {
  for (const p of paths) {
    const v = p.split('.').reduce((a, k) => (a ? a[k] : undefined), obj);
    if (v !== undefined) return v;
  }
  return undefined;
};

const clampDays = (d) => Math.max(1, Math.min(30, Number.isFinite(+d) ? +d : 7));

async function runForecastAndSummarize(
  days = 7,
  { silent = false, idTambak = me?.ID_Tambak, idIot = perangkat?.ID_PerangkatIot, nama = me?.TB_Tambak?.Nama } = {}
) {
  if (!idTambak || !idIot) throw new Error('Missing idTambak/idIot');

  const requestedDays = Number(days) || 7;
  const cappedDays = clampDays(requestedDays);        // ← FIX: definisikan cappedDays (1..30)
  const start = resetYmd(new Date());
  const end   = addDays(start, cappedDays);

  // 1) minta forecast ke backend (dummy-forecast)
  const fc = await apiFetch('/api/peramalan/forecast', {
    method: 'POST',
    body: {
      id_tambak: idTambak,
      id_perangkat_iot: idIot,
       horizon: Math.min(cappedDays * 24, 720),
      frequency: 'hourly',
      history_range: null
    }
  });

  // 2) (opsional) simpan manual / start auto
  saveForecastToHistory(fc, { start, end, days: cappedDays, idTambak, idIot });
  startAutoHourly({ start, end, days: cappedDays });

  // 3) tampilkan window
  setForecastMeta({ start, end, days: cappedDays });

  // 4) PENTING: panggil aiSummary → GPT hanya merangkum
  const fcArr = pickForecastArray(fc);

if (!fcArr.length) {
  // jangan panggil aiSummary kalau tidak ada data
  setStatusFromForecast(null);
  setForecastSummary(null);
  Alert.alert('Ramalan', 'Tidak ada data peramalan yang diterima.');
  return;
}

const sum = await aiSummary({
  // WAJIB: pakai hasil peramalan saja (jangan kirim sensor kalau mau forecast-only)
  forecast: fcArr,
  range_days: cappedDays,          // 1..30
  debug: true,                     // kalau mau lihat field debug

  // opsional: boleh ikut kirim ID_Tambak (tak dipakai kalau forecast sudah ada)
  ID_Tambak: idTambak,

  // META: konteks untuk penelusuran/log
  meta: {
    id_tambak: idTambak,
    id_perangkat_iot: idIot,
    nama_tambak: nama ?? me?.TB_Tambak?.Nama ?? null,

    range: {
      start_iso: start.toISOString(),
      end_iso: end.toISOString(),
      days: cappedDays
    },

    forecast_info: {
      frequency: 'hourly',
      horizon_hours: Math.min(cappedDays * 24, 720),
      count: fcArr.length
    },

    // opsional banget:
    // requested_by: 'dashboard-user',
    // client_version: 'app 1.2.3',
    // note: 'permintaan ramal dari modal'
  }
}).catch(() => null);

// B. di runForecastAndSummarize (setelah await aiSummary(...))
const apiText = pick(sum, 'condition_text', 'data.condition_text') || '';
if (apiText) setForecastSummary(clampWords(apiText, 40));

const st = pick(sum, 'status', 'data.status');
if (st) {
  setStatusFromForecast(st);
  setBadgeVersion(v => v + 1);
} else {
  // fallback bila service tidak mengembalikan status
  const fcArrForStatus = pickForecastArray(fc);
  const fallback = deriveStatusFromForecast(fcArrForStatus);
  setStatusFromForecast(fallback);
  setBadgeVersion(v => v + 1);
}

 if (!silent) {
    const note = requestedDays > cappedDays ? ' (dibatasi 30 hari)' : '';
    Alert.alert('Ramalan dibuat', `Rentang ${tglIndo(start)} s.d. ${tglIndo(end)} (${cappedDays} hari${note}).`);
  
 }
}
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const meSrv = await getMe();
        if (cancelled) return;
        setMe(meSrv);
        if (!meSrv?.ID_Tambak) throw new Error('User belum terhubung dengan tambak. Hubungi admin.');

        // ambil summary awal; kalau belum ada, nanti kita buat ramalan default
        const gotSummary = await refreshAutoSummary(meSrv.ID_Tambak);

        const list = await listPerangkatByTambak(meSrv.ID_Tambak, { page: 1, limit: 10 });
        if (cancelled) return;
        const rows = list?.rows || list?.data || list || [];
        if (!rows.length) throw new Error('Belum ada perangkat untuk tambak ini.');
        const aktif = rows.find((r) => r.Status === 'Aktif') || rows[0];
        setPerangkat(aktif);

        if (!gotSummary && aktif?.ID_PerangkatIot) {
          // bikin ramalan default 7 hari secara silent
          await runForecastAndSummarize(7, { silent: true, idTambak: meSrv.ID_Tambak, idIot: aktif.ID_PerangkatIot, nama: meSrv?.TB_Tambak?.Nama });
        }

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
      if (next === 'active') {
        refreshAutoSummary(undefined, true); // force refresh saat balik
      } else if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
    });

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
      sub?.remove?.();
    };
  }, [fetchLastReading]);

  // refresh saat halaman fokus
  useFocusEffect(
    useCallback(() => {
      refreshAutoSummary(undefined, true);
    }, []),
  );

  // sinkron endDate saat start/total berubah
  useEffect(() => {
    const n = Number(totalDaysInput);
    if (n > 0) setEndDate(addDays(startDate, n));
  }, [startDate, totalDaysInput]);

  const uiStatusText = statusFromForecast;
  const uiStatusKey = uiStatusText ? toKey(uiStatusText) : null;

  const now = new Date();
  const defaultEnd = addDays(now, 7);
  const displayStart = forecastMeta?.start || now;
  const displayEnd = forecastMeta?.end || defaultEnd;

  const GRAY = '#9CA3AF';
  const isNum = (v) => Number.isFinite(v);

  // memo gauges
  const gauges = useMemo(() => {
    const suhuDead = !isNum(sensor.Suhu);
    const phDead = !isNum(sensor.PH);
    const saDead = !isNum(sensor.Salinitas);
    const turDead = !isNum(sensor.Kekeruhan);
    return [
      {
        label: 'SUHU',
        color: suhuDead ? GRAY : '#22c55e',
        valueText: suhuDead ? '-' : `${sensor.Suhu.toFixed(1)}°C`,
        progress: suhuDead ? 1 : Math.min(1, Math.max(0, (sensor.Suhu - 20) / 20)),
      },
      {
        label: 'PH',
        color: phDead ? GRAY : '#ef4444',
        valueText: phDead ? '-' : `${sensor.PH.toFixed(2)} pH`,
        progress: phDead ? 1 : Math.min(1, Math.max(0, sensor.PH / 14)),
      },
      {
        label: 'SALINITAS',
        color: saDead ? GRAY : '#a3be00',
        valueText: saDead ? '-' : `${sensor.Salinitas.toFixed(1)} ppt`,
        progress: saDead ? 1 : Math.min(1, Math.max(0, sensor.Salinitas / 40)),
      },
      {
        label: 'KEKERUHAN',
        color: turDead ? GRAY : '#0ea5e9',
        valueText: turDead ? '-' : `${sensor.Kekeruhan.toFixed(0)} NTU`,
        progress: turDead ? 1 : Math.min(1, Math.max(0, sensor.Kekeruhan / 300)),
      },
    ];
  }, [sensor]);

  const onSubmitRamal = useCallback(async () => {
    try {
      const days = Number(totalDaysInput) > 0 ? Number(totalDaysInput) : diffDays(startDate, endDate);
      setRamalOpen(false);
      await runForecastAndSummarize(days, { silent: false });
    } catch (e) {
      Alert.alert('Gagal', e?.message || 'Gagal membuat ramalan');
    }
  }, [totalDaysInput, startDate, endDate]);

  // DateTimePicker handlers
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

  /* -------------------- Render -------------------- */

  if (loading) {
    const now2 = new Date();
    return (
      <View className="flex-1 bg-white">
        <StatusBar translucent backgroundColor="transparent" />
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Greeting Card skeleton */}
          <View style={styles.cardShadow} className="mx-4 mt-14">
            <View className="rounded-3xl bg-white overflow-hidden p-5">
              <Skeleton width={120} height={36} radius={8} />
              <Skeleton width={80} height={16} radius={8} style={{ marginTop: 8 }} />
              <Skeleton width={160} height={20} radius={8} style={{ marginTop: 24 }} />
              <Skeleton width={220} height={18} radius={8} style={{ marginTop: 8 }} />
              <View className="absolute right-4 top-12">
                <Skeleton width={96} height={96} radius={48} />
              </View>
            </View>
          </View>

          {/* Status + actions skeleton */}
          <View className="mt-6 px-4">
            <View className="flex-row items-center">
              <Skeleton width={120} height={120} radius={60} />
              <View className="flex-1 ml-4">
                <Skeleton width={'95%'} height={14} />
                <Skeleton width={'90%'} height={14} style={{ marginTop: 6 }} />
                <Skeleton width={'85%'} height={14} style={{ marginTop: 6 }} />
                <View className="flex-row mt-12">
                  <Skeleton width={90} height={36} radius={12} />
                  <Skeleton width={100} height={36} radius={12} style={{ marginLeft: 12 }} />
                </View>
              </View>
            </View>
          </View>

          {/* Gauges row skeleton */}
          <View className="mt-3 mb-48">
            <FlatList
              data={[1, 2, 3, 4]}
              keyExtractor={(i) => String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={() => <SkeletonGaugeCard />}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white ">
      <StatusBar translucent={true} backgroundColor={'transparent'} />
      <ScrollView showsVerticalScrollIndicator={false}>
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
              <Text className="text-[18px] -mt-1 font-extrabold text-[#ffffff]">
                Di {me?.TB_Tambak?.Nama || me?.Tambak || 'Tambak'}
              </Text>
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
              <LiquidBadge key={`${uiStatusKey}-${badgeVersion}`} status={uiStatusKey} label={uiStatusText} />
            ) : (
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: '#EEF2F7',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#6B7280', fontWeight: '700' }}>Belum ada{'\n'}ramalan </Text>
              </View>
            )}

            <View className="flex-1 ml-4">
              <Text className="text-[13px] leading-5 text-slate-700 text-justify">
                Kondisi air laut di tambak pada tanggal <Text className="font-bold">{tglIndo(displayStart)}</Text> sampai{' '}
                <Text className="font-bold">{tglIndo(displayEnd)}</Text>{' '}
                {forecastSummary ? (
                  <Text>
                    diperkirakan <Text className="font-bold">{forecastSummary}</Text>.
                  </Text>
                ) : uiStatusText ? (
                  <>
                    berada dalam kategori{' '}
                    <Text style={{ color: colorOfStatus(uiStatusText) }} className="font-bold text-justify">
                      {uiStatusText.toLowerCase()}
                    </Text>
                    . {' '}
                    Parameter utama seperti suhu, pH, salinitas, dan tingkat kekeruhan{' '}
                    {uiStatusText === 'Baik' ? 'masih stabil dan sesuai' : 'perlu perhatian'} untuk budidaya ikan kerapu.
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
            onPress={() => navigation.navigate('DashboardUser', { screen: 'MonitoringIot' })}
          >
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
            initialNumToRender={2}
            windowSize={3}
            removeClippedSubviews
            getItemLayout={(_, i) => ({ length: 212, offset: 212 * i, index: i })}
            renderItem={({ item }) => (
              <GaugeCard label={item.label} color={item.color} valueText={item.valueText} progress={item.progress} />
            )}
          />
        </View>

        {/* ===== Modal Ramal ===== */}
        <Modal visible={ramalOpen} transparent animationType="fade" onRequestClose={() => setRamalOpen(false)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-6">
            <View className="w-full rounded-2xl bg-white p-4">
              <Text className="text-lg font-bold mb-2">Ramal sampai kapan?</Text>
              <Text className="text-slate-600 mb-3">
                Pilih rentang tanggal dan/atau isi total hari. Data perangkat: {perangkat?.ID_PerangkatIot || '-'}
              </Text>

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

              {showStartPicker && (
                <DateTimePicker value={startDate} mode="date" display="default" onChange={onChangeStart} />
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

        {/* ===== Modal Tanya AI ===== */}
        <Modal visible={askOpen} transparent animationType="fade" onRequestClose={() => setAskOpen(false)}>
          <View className="flex-1 bg-black/40 items-center justify-center px-6">
            <View className="w-full rounded-2xl bg-white p-4">
              <Text className="text-lg font-bold mb-1">Tanya AI</Text>
              <Text className="text-slate-600 mb-3">Klik tiap baris untuk membuka opsi. Terlihat preview sebelum dikirim.</Text>

              {/* Persona */}
              <Accordion title="Pilih persona" open={openKey === 'persona'} onToggle={() => toggle('persona')}>
                <View className="flex-row flex-wrap">
                  {personaList.map((it) => (
                    <TouchableOpacity
                      key={it.key}
                      onPress={() => setPersona(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${persona === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}
                    >
                      <Text className={`${persona === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>
                        {it.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Accordion>

              {/* Konteks */}
              <Accordion title="Konteks" open={openKey === 'konteks'} onToggle={() => toggle('konteks')}>
                <View className="flex-row flex-wrap">
                  {konteksList.map((it) => (
                    <TouchableOpacity
                      key={it.key}
                      onPress={() => setKonteks(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${konteks === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}
                    >
                      <Text className={`${konteks === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>
                        {it.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Accordion>

              {/* Privasi */}
              <Accordion title="Privasi data yang dikirim" open={openKey === 'priv'} onToggle={() => toggle('priv')}>
                <View className="flex-row flex-wrap">
                  {privacyList.map((it) => (
                    <TouchableOpacity
                      key={it.key}
                      onPress={() => setPrivacy(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${privacy === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}
                    >
                      <Text className={`${privacy === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>
                        {it.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-[12px] text-slate-500 mt-1">
                  Mode ini menentukan apa yang dimasukkan ke prompt: angka lengkap, kategori, status saja, atau tidak ada data.
                </Text>
              </Accordion>

              {/* Data */}
              <Accordion title="Data" open={openKey === 'data'} onToggle={() => toggle('data')}>
                <View className="flex-row flex-wrap items-center">
                  {dataList.map((it) => (
                    <TouchableOpacity
                      key={it.key}
                      onPress={() => setDataSel(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${dataSel === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}
                    >
                      <Text className={`${dataSel === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>
                        {it.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {dataSel === 'riwayat' && (
                  <View className="mt-2 flex-row items-center">
                    {DAYS_PRESETS.map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => setTrendDays(d)}
                        className={`px-3 py-1 rounded-xl mr-2 ${trendDays === d ? 'bg-[#67A9F3]' : 'bg-slate-200'}`}
                      >
                        <Text className={trendDays === d ? 'text-white' : 'text-slate-800'}>{d} hari</Text>
                      </TouchableOpacity>
                    ))}

                    {histLoading ? (
                      <View className="ml-2 flex-row items-center">
                        <Skeleton width={90} height={16} radius={6} />
                        <Skeleton width={60} height={16} radius={6} style={{ marginLeft: 8 }} />
                      </View>
                    ) : (
                      <Text className="ml-2 text-[12px] text-slate-600">
                        {histSeries?.length ? `${histSeries.length} titik/jam` : '—'}
                      </Text>
                    )}
                  </View>
                )}
              </Accordion>

              {/* Pertanyaan */}
              <Accordion title="Pertanyaan" open={openKey === 'tanya'} onToggle={() => toggle('tanya')}>
                <Text className="text-slate-600 mb-2 text-[12px]">
                  Boleh tulis pertanyaan bebas; kalau kosong, sistem pakai opsi “Perintah” di bawah.
                </Text>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="contoh: apa risiko 3 hari ke depan dan tindakan cepatnya?"
                  multiline
                  style={{
                    minHeight: 80,
                    textAlignVertical: 'top',
                    borderWidth: 1,
                    borderColor: '#D8DEE9',
                    borderRadius: 10,
                    padding: 10,
                  }}
                />
              </Accordion>

              {/* Format + Perintah */}
              <Accordion title="Format jawaban" open={openKey === 'format'} onToggle={() => toggle('format')}>
                <Text className="text-slate-600 mb-1 text-[12px]">Format:</Text>
                <View className="flex-row flex-wrap mb-2">
                  {formatList.map((it) => (
                    <TouchableOpacity
                      key={it.key}
                      onPress={() => setFormat(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${format === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}
                    >
                      <Text className={`${format === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>
                        {it.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-slate-600 mb-1 text-[12px]">Perintah (dipakai bila kolom “Pertanyaan” kosong):</Text>
                <View className="flex-row flex-wrap">
                  {perintahList.map((it) => (
                    <TouchableOpacity
                      key={it.key}
                      onPress={() => setPerintah(it.key)}
                      className={`px-3 py-2 rounded-xl mr-2 mb-2 ${perintah === it.key ? 'bg-[#67A9F3]' : 'bg-slate-300'}`}
                    >
                      <Text className={`${perintah === it.key ? 'text-white' : 'text-slate-800'} font-semibold`}>
                        {it.label}
                      </Text>
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
                <TouchableOpacity
                  onPress={() => {
                    try {
                      setAskOpen(false);
                      const prompt = previewPrompt;
                      navigation.navigate('ChatAi', {
                        initialPrompt: prompt,
                        autoSend: true,
                        preferNewSession: true,
                      });
                    } catch (e) {
                      Alert.alert('Gagal', e?.message || 'Gagal menyiapkan pertanyaan');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[#67A9F3]"
                >
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    width: '48%',
  },
  inputBtnText: { color: '#1B3551', fontWeight: '700', marginLeft: 8 },
  textField: {
    borderWidth: 1,
    borderColor: '#D8DEE9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#1B3551',
    backgroundColor: '#fff',
  },
  groupTitle: { fontWeight: '700', color: '#1B3551', marginBottom: 6, marginTop: 10 },
});

export default DashboardUser;
