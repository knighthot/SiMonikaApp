// screens/HistoryPeramalan.js
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, FlatList,
    RefreshControl, Modal, useWindowDimensions
} from 'react-native';
import {
    OrientationLocker,
    PORTRAIT,
    LANDSCAPE_LEFT,
    lockToPortrait,
    lockToLandscape,
} from 'react-native-orientation-locker';

import { LineChart } from 'react-native-chart-kit';
import { getMe, apiFetch, getHistoryTrend } from '../../../api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StatusBar, BackHandler } from 'react-native';

const H_PAD = 20;

// ===== Fixed labels 1..31 =====
const FIXED_COUNT = 31;
const FIXED_LABELS = Array.from({ length: FIXED_COUNT }, (_, i) => String(i + 1));
const make31 = () => Array(FIXED_COUNT).fill(null);
const toNum = (v, dec) => (v == null ? null : Number(Number(v).toFixed(dec)));

/** ====== Kolom tabel ====== */
const COLS = [
    { key: '#', flex: 0.4, align: 'center' },
    { key: 'TANGGAL', flex: 1.5, align: 'left' },
    { key: 'PH', flex: 0.6, align: 'center' },
    { key: 'SUHU', flex: 0.9, align: 'center' },
    { key: 'KEKERUHAN', flex: 1.1, align: 'center' },
    { key: 'SALINITAS', flex: 1.0, align: 'center' },
    { key: 'RESIKO', flex: 1.1, align: 'center' },
];

/** ---------- util format angka ---------- */
const nf = (dec = 1) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
const fmt = (v, dec = 1) => (v == null ? null : nf(dec).format(v));
const display = {
    ph: (v) => fmt(v, 2),
    suhu: (v) => fmt(v, 1),
    salinitas: (v) => fmt(v, 1),
    kekeruhan: (v) => fmt(v, 0),
    wqi: (v) => fmt(v, 1),
};

/** ------------- Modal filter tanggal cepat ------------- */
const QuickDateModal = ({ visible, onClose, onPick }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
            <View className="w-full rounded-2xl bg-white p-4">
                <Text className="text-lg font-extrabold text-slate-900 mb-2">Filter Tanggal</Text>
                <TouchableOpacity onPress={() => onPick('7d')} className="px-4 py-3 bg-slate-100 rounded-xl mb-2">
                    <Text className="font-extrabold text-slate-900">7 Hari Terakhir</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onPick('thisMonth')} className="px-4 py-3 bg-slate-100 rounded-xl mb-2">
                    <Text className="font-extrabold text-slate-900">Bulan Ini</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onPick('prevMonth')} className="px-4 py-3 bg-slate-100 rounded-xl">
                    <Text className="font-extrabold text-slate-900">Bulan Lalu</Text>
                </TouchableOpacity>

                <View className="flex-row justify-end mt-3">
                    <TouchableOpacity onPress={onClose} className="px-4 py-2 rounded-xl bg-slate-200">
                        <Text className="font-semibold">Tutup</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

/** ----------------- Util kecil ----------------- */
const monthLabel = (d) => d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
const riskText = (row) => {
    const bad =
        (row.ph != null && (row.ph < 6.5 || row.ph > 8.5)) ||
        (row.salinitas != null && (row.salinitas < 15 || row.salinitas > 35)) ||
        (row.suhu != null && (row.suhu < 25 || row.suhu > 34)) ||
        (row.kekeruhan != null && row.kekeruhan > 70);
    return bad ? 'Tinggi' : 'Normal';
};

const colorLegend = {
    pH: '#1d4ed8',
    salinitas: '#16a34a',
    suhu: '#f59e0b',
    kekeruhan: '#7e22ce'
};

/** ---------------- Skeleton sederhana ---------------- */
const Skeleton = ({ h = 16, w = '100%', br = 12, style }) => (
    <View style={[{ height: h, width: w, borderRadius: br, backgroundColor: '#e5e7eb' }, style]} />
);
const SkeletonRow = () => (
    <View style={{ paddingHorizontal: H_PAD, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {COLS.map((c, i) => (
                <View key={i} style={{ flex: c.flex, paddingVertical: 2, paddingHorizontal: 6 }}>
                    <Skeleton h={12} />
                </View>
            ))}
        </View>
    </View>
);

const HistoryPeramalan = () => {
    const { width: winW, height: winH } = useWindowDimensions();
    const [me, setMe] = useState(null);
    const [perangkat, setPerangkat] = useState(null);
    const navigation = useNavigation();

    // back: keluar fullscreen dulu
    useEffect(() => {
        const onBack = () => {
            if (isLandscape) { setIsLandscape(false); return true; }
            return false;
        };
        const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
        return () => sub.remove();
    }, [isLandscape]);

    useFocusEffect(
        React.useCallback(() => {
            const onBeforeRemove = () => {
                setIsLandscape(false);
                try { lockToPortrait(); } catch { }
            };
            const unsubBefore = navigation.addListener('beforeRemove', onBeforeRemove);
            const unsubBlur = navigation.addListener('blur', onBeforeRemove);
            return () => { unsubBefore(); unsubBlur(); try { lockToPortrait(); } catch { }; setIsLandscape(false); };
        }, [navigation])
    );

    // hide/show TabBar + StatusBar saat toggle
    useEffect(() => {
        const parent = navigation.getParent();
        if (isLandscape) {
            try { lockToLandscape(); } catch { }
            parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
            StatusBar.setHidden(true, 'fade');
        } else {
            try { lockToPortrait(); } catch { }
            parent?.setOptions?.({ tabBarStyle: undefined });
            StatusBar.setHidden(false, 'fade');
        }
        return () => {
            parent?.setOptions?.({ tabBarStyle: undefined });
            StatusBar.setHidden(false, 'fade');
        };
    }, [isLandscape, navigation]);

    // rentang tanggal
    const [range, setRange] = useState(() => {
        const to = new Date();
        const from = new Date(to.getTime() - 29 * 86400 * 1000);
        return { from, to, days: 30, label: monthLabel(to) };
    });

    // data
    const [trend, setTrend] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // UI
    const [filter, setFilter] = useState('SEMUA');
    const [openFilterDate, setOpenFilterDate] = useState(false);

    // Toggle orientasi
    const [isLandscape, setIsLandscape] = useState(false);
    const toggleOrientation = () => setIsLandscape(v => !v);

    useFocusEffect(
        React.useCallback(() => {
            const onBack = () => {
                if (isLandscape) { setIsLandscape(false); try { lockToPortrait(); } catch { }; return true; }
                return false;
            };
            const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
            return () => sub.remove();
        }, [isLandscape])
    );

    // ---- loader utama ----
    const loadAll = useCallback(async () => {
        try {
            setLoading(true);
            const m = me || (await getMe());
            if (!me) setMe(m);
            const idTambak = m?.ID_Tambak || m?.TB_Tambak?.ID_Tambak;
            const idIot = perangkat?.ID_PerangkatIot || m?.ID_PerangkatIot || m?.TB_PerangkatIot?.ID_PerangkatIot;

            // 1) endpoint terbaru
            let latest = null;
            try {
                latest = await apiFetch(
                    `/api/history-peramalan/latest?id_tambak=${encodeURIComponent(String(idTambak))}` +
                    (idIot ? `&id_perangkat_iot=${encodeURIComponent(String(idIot))}` : '')
                );
            } catch { }

            let arr = [];
            if (Array.isArray(latest)) arr = latest;
            else if (Array.isArray(latest?.data)) arr = latest.data;

            if (arr.length) {
                // filter in-range
                const fromMs = new Date(range.from.toISOString().slice(0, 10)).getTime();
                const toMs = new Date(range.to.toISOString().slice(0, 10)).getTime();
                const inRange = arr.filter(r => {
                    const t = new Date(r.tanggal + 'T00:00:00Z').getTime();
                    return t >= fromMs && t <= toMs;
                });

                // isi tabel
                setRows(inRange.map((r, idx) => ({
                    id: `${r.tanggal}-${idx}`,
                    no: idx + 1,
                    tanggal: r.tanggal,
                    ph: display.ph(r.ph) ?? null,
                    suhu: display.suhu(r.suhu) ?? null,
                    salinitas: display.salinitas(r.salinitas) ?? null,
                    kekeruhan: display.kekeruhan(r.kekeruhan) ?? null,
                    wqi: display.wqi(r.wqi) ?? null,
                    risk: riskText(r),
                })));

                // ====== BANGUN ARRAY 1..31 SESUAI TANGGAL ======
                const phArr = make31();
                const salArr = make31();
                const suhArr = make31();
                const kerArr = make31();

                inRange.forEach(r => {
                    const day = new Date(r.tanggal).getDate(); // 1..31
                    const i = day - 1;
                    if (i >= 0 && i < 31) {
                        if (r.ph != null) phArr[i] = toNum(r.ph, 2);
                        if (r.salinitas != null) salArr[i] = toNum(r.salinitas, 1);
                        if (r.suhu != null) suhArr[i] = toNum(r.suhu, 1);
                        if (r.kekeruhan != null) kerArr[i] = Math.round(Number(r.kekeruhan));
                    }
                });

                setTrend({
                    ph: phArr, salinitas: salArr, suhu: suhArr, kekeruhan: kerArr,
                    labels: FIXED_LABELS, count: FIXED_COUNT,
                });

            } else {
                // 2) fallback endpoint lama (berbasis tanggal → tetap mapping ke 1..31)
                const qs = new URLSearchParams({
                    mode: 'table',
                    ID_Tambak: String(idTambak),
                    from: range.from.toISOString(),
                    to: range.to.toISOString(),
                    gap: '1',
                }).toString();
                const list = await apiFetch(`/api/history-peramalan?${qs}`);
                const dataRows = list?.rows || [];

                setRows(
                    dataRows.map((r, idx) => ({
                        id: r.id || `${r.tanggal}-${idx}`,
                        no: idx + 1,
                        tanggal: r.tanggal,
                        ph: display.ph(r.pH ?? r.ph) ?? null,
                        suhu: display.suhu(r.suhu) ?? null,
                        salinitas: display.salinitas(r.salinitas) ?? null,
                        kekeruhan: display.kekeruhan(r.kekeruhan) ?? null,
                        wqi: display.wqi(r.wqi) ?? null,
                        risk: r.risk || riskText({
                            ph: r.pH ?? r.ph, suhu: r.suhu, salinitas: r.salinitas, kekeruhan: r.kekeruhan,
                        }),
                    }))
                );

                // mapping tanggal → slot 1..31
                const phArr = make31();
                const salArr = make31();
                const suhArr = make31();
                const kerArr = make31();

                dataRows.forEach(r => {
                    if (!r?.tanggal) return;
                    const day = new Date(r.tanggal).getDate();
                    const i = day - 1;
                    if (i >= 0 && i < 31) {
                        const ph = r.pH ?? r.ph;
                        if (ph != null) phArr[i] = toNum(ph, 2);
                        if (r.salinitas != null) salArr[i] = toNum(r.salinitas, 1);
                        if (r.suhu != null) suhArr[i] = toNum(r.suhu, 1);
                        if (r.kekeruhan != null) kerArr[i] = Math.round(Number(r.kekeruhan));
                    }
                });

                // kalau benar-benar kosong, terakhir coba getHistoryTrend (optional)
                const noAny =
                    phArr.every(v => v == null) &&
                    salArr.every(v => v == null) &&
                    suhArr.every(v => v == null) &&
                    kerArr.every(v => v == null);

                if (noAny) {
                    try {
                        const t = await getHistoryTrend(idTambak, { days: 31, to: range.to });
                        // fallback ini tidak punya tanggal → cukup pad ke 31 dari kiri
                        const to31 = (a, dec, roundInt = false) => {
                            if (!Array.isArray(a)) return make31();
                            const b = a.slice(0, 31).map(v => (v == null ? null : (roundInt ? Math.round(Number(v)) : Number(Number(v).toFixed(dec)))));
                            return b.length < 31 ? [...b, ...Array(31 - b.length).fill(null)] : b;
                        };
                        setTrend({
                            ph: to31(t?.ph, 2),
                            salinitas: to31(t?.salinitas, 1),
                            suhu: to31(t?.suhu, 1),
                            kekeruhan: to31(t?.kekeruhan, 0, true),
                            labels: FIXED_LABELS,
                            count: FIXED_COUNT
                        });
                    } catch {
                        setTrend({ ph: phArr, salinitas: salArr, suhu: suhArr, kekeruhan: kerArr, labels: FIXED_LABELS, count: FIXED_COUNT });
                    }
                } else {
                    setTrend({ ph: phArr, salinitas: salArr, suhu: suhArr, kekeruhan: kerArr, labels: FIXED_LABELS, count: FIXED_COUNT });
                }
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [me, perangkat, range.from, range.to]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const onRefresh = () => { setRefreshing(true); loadAll(); };

    const onPickQuick = (key) => {
        const now = new Date();
        if (key === '7d') {
            const to = now; const from = new Date(now.getTime() - 6 * 86400 * 1000);
            setRange({ from, to, days: 7, label: `${monthLabel(to)} (7H)` });
        } else if (key === 'thisMonth') {
            const to = now; const from = new Date(to.getFullYear(), to.getMonth(), 1);
            setRange({ from, to, days: 31, label: monthLabel(to) });
        } else {
            const base = new Date(now.getFullYear(), now.getMonth(), 1);
            const from = new Date(base.getFullYear(), base.getMonth() - 1, 1);
            const to = new Date(base.getFullYear(), base.getMonth(), 0);
            setRange({ from, to, days: 31, label: monthLabel(from) });
        }
        setOpenFilterDate(false);
        setTimeout(loadAll, 0);
    };

    // meta Y-axis
    const yMeta = useMemo(() => {
        switch (filter) {
            case 'PH': return { suffix: '', decimals: 2, format: (v) => Number(v).toFixed(2) };
            case 'SUHU': return { suffix: '°C', decimals: 1, format: (v) => Number(v).toFixed(1) };
            case 'SALINITAS': return { suffix: '‰', decimals: 1, format: (v) => Number(v).toFixed(1) };
            case 'KEKERUHAN': return { suffix: ' NTU', decimals: 0, format: (v) => String(Math.round(Number(v))) };
            default: return { suffix: '', decimals: 0, format: (v) => String(Math.round(Number(v))) };
        }
    }, [filter]);

    /** ---------- data grafik ---------- */
    const chartData = useMemo(() => {
        const labels = FIXED_LABELS;
        const L = labels.length;

        const toLen = (arr) => {
            if (!Array.isArray(arr)) return Array(L).fill(null);
            if (arr.length >= L) return arr.slice(0, L);
            return [...arr, ...Array(L - arr.length).fill(null)];
        };

        const ph = toLen(trend?.ph);
        const sal = toLen(trend?.salinitas);
        const suh = toLen(trend?.suhu);
        const ker = toLen(trend?.kekeruhan);

        const allSets = [
            { data: ph, color: () => colorLegend.pH, strokeWidth: 3, withDots: true },
            { data: sal, color: () => colorLegend.salinitas, strokeWidth: 3, withDots: true },
            { data: suh, color: () => colorLegend.suhu, strokeWidth: 3, withDots: true },
            { data: ker, color: () => colorLegend.kekeruhan, strokeWidth: 3, withDots: true },
        ];

        let datasets = allSets;
        if (filter !== 'SEMUA') {
            const key = filter.toLowerCase();
            const map = ['ph', 'salinitas', 'suhu', 'kekeruhan'];
            datasets = allSets.filter((_, i) => map[i] === key);
        }

        return { labels, datasets };
    }, [trend, filter]);

    const chartConfig = useMemo(() => ({
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: yMeta.decimals,
        color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
        propsForDots: { r: '2' },
        propsForBackgroundLines: { strokeDasharray: '4 7' },
        propsForLabels: { fontSize: 9 },
        formatYLabel: yMeta.format,
    }), [yMeta]);

    // size chart
    const chartWidth = Math.max(420, (winW || 0) - H_PAD * 2);
    const chartHeight = isLandscape
        ? Math.max(240, Math.min(winW, winH) - 80)
        : 230;

    /** ---------- Header (toggle orientasi) ---------- */
    const Header = (
        <View>
            <TouchableOpacity
                className=' mt-12 w-40 '
                onPress={() => {
                    if (isLandscape) {
                        setIsLandscape(false);
                        setTimeout(() => navigation.goBack(), 200);
                    } else {
                        navigation.goBack();
                    }
                }}
                style={{
                    position: 'fixed', left: 8, top: 8,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10
                }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>← Kembali Ke Menu</Text>
            </TouchableOpacity>

            <Text className="text-[18px] font-extrabold text-[#0a465e] mt-5" style={{ paddingLeft: H_PAD }}>
                {range.label}
            </Text>

            <View style={{ paddingHorizontal: H_PAD, marginTop: 8 }}>
                <View style={{ position: 'relative' }}>
                    {loading ? (
                        <Skeleton h={isLandscape ? chartHeight : 220} br={16} />
                    ) : (
                        <>
                            <LineChart
                                data={chartData}
                                width={chartWidth}
                                height={chartHeight}
                                chartConfig={chartConfig}
                                yAxisSuffix={yMeta.suffix}
                                bezier
                                withShadow
                                fromZero
                                style={{ borderRadius: 16, left: isLandscape ? 0 : -50 }}
                                segments={isLandscape ? 6 : 5}
                            />
                            <TouchableOpacity
                                onPress={toggleOrientation}
                                style={{
                                    position: 'absolute', right: 8, top: 8,
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                                    {isLandscape ? '⤡ Kembali' : '⤢ Layar Penuh'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* Legend hanya saat SEMUA */}
            {filter === 'SEMUA' && (
                <View className="flex-row mt-3" style={{ paddingHorizontal: H_PAD }}>
                    {[
                        { k: 'pH', c: colorLegend.pH, t: 'pH' },
                        { k: 'salinitas', c: colorLegend.salinitas, t: 'Salinitas' },
                        { k: 'suhu', c: colorLegend.suhu, t: 'Suhu' },
                        { k: 'kekeruhan', c: colorLegend.kekeruhan, t: 'Kekeruhan' },
                    ].map((lg) => (
                        <View key={lg.k} className="flex-row items-center" style={{ marginRight: 18 }}>
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: lg.c }} />
                            <Text className="ml-2 text-[14px] font-bold text-slate-800">{lg.t}</Text>
                        </View>
                    ))}
                </View>
            )}

            <Text className="mt-5 text-[15px] font-extrabold text-slate-800" style={{ paddingHorizontal: H_PAD }}>
                Klik Tombol Untuk Melihat Statistik
            </Text>
            <Text className=" -mt-1 mb-2 text-[13px] text-slate-600" style={{ paddingHorizontal: H_PAD }}>
                Berdasarkan Parameter :
            </Text>

            {/* tombol filter parameter */}
            <View className="flex-row flex-wrap justify-around" style={{ paddingHorizontal: H_PAD }}>
                {['PH', 'SALINITAS', 'KEKERUHAN', 'SUHU', 'SEMUA'].map((k) => {
                    const active = filter === k;
                    return (
                        <TouchableOpacity
                            key={k}
                            onPress={() => setFilter(k)}
                            className="rounded-2xl px-4 py-3 mr-3 mb-3"
                            style={{ backgroundColor: active ? '#67A9F3' : '#cfe3ff' }}
                        >
                            <Text className="font-extrabold" style={{ color: active ? 'white' : '#0f172a' }}>{k}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* filter tanggal */}
            <View className="mt-2 flex-row items-center" style={{ paddingHorizontal: H_PAD }}>
                <TouchableOpacity
                    onPress={() => setOpenFilterDate(true)}
                    className="px-4 py-3 rounded-2xl"
                    style={{ backgroundColor: '#67A9F3' }}
                >
                    <Text className="text-white font-extrabold">Filter Tanggal</Text>
                </TouchableOpacity>

                <View className="ml-4 flex-1 h-[44px] rounded-xl border border-slate-600/60 px-3 items-center justify-center">
                    <Text className="text-slate-900 font-semibold" numberOfLines={1}>
                        {range.from.toLocaleDateString('id-ID')} — {range.to.toLocaleDateString('id-ID')}
                    </Text>
                </View>
            </View>

            {/* header tabel */}
            <View
                className="mt-4 bg-white rounded-2xl overflow-hidden"
                style={{
                    marginHorizontal: H_PAD,
                    shadowOpacity: 0.08, shadowRadius: 8, shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 }, elevation: 3,
                }}
            >
                <View className="flex-row items-center border-b border-slate-200">
                    {COLS.map((c, i) => (
                        <View key={i} style={{ flex: c.flex, paddingVertical: 12, paddingHorizontal: 10, borderRightWidth: i < COLS.length - 1 ? 1 : 0, borderColor: '#e5e7eb' }}>
                            <Text className="text-[10px] font-extrabold text-slate-600">{c.key}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderItem = ({ item }) => (
        <View style={{ paddingHorizontal: H_PAD, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb' }}>
            <View className="flex-row items-center">
                <View style={{ flex: COLS[0].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[10px] font-semibold text-slate-700" style={{ textAlign: COLS[0].align }}>{item.no}</Text>
                </View>
                <View style={{ flex: COLS[1].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[10px] font-semibold text-slate-700" numberOfLines={1}>
                        {new Date(item.tanggal).toLocaleDateString('id-ID', {
                            day: '2-digit', month: 'short', year: 'numeric'
                        })}
                    </Text>
                </View>
                <View style={{ flex: COLS[2].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[12px] font-semibold text-slate-700" style={{ textAlign: COLS[2].align }}>
                        {item.ph ?? '-'}
                    </Text>
                </View>
                <View style={{ flex: COLS[3].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[12px] font-semibold text-slate-700" style={{ textAlign: COLS[3].align }}>
                        {item.suhu ?? '-'}
                    </Text>
                </View>
                <View style={{ flex: COLS[4].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[12px] font-semibold text-slate-700" style={{ textAlign: COLS[4].align }}>
                        {item.kekeruhan ?? '-'}
                    </Text>
                </View>
                <View style={{ flex: COLS[5].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[12px] font-semibold text-slate-700" style={{ textAlign: COLS[5].align }}>
                        {item.salinitas ?? '-'}
                    </Text>
                </View>
                <View style={{ flex: COLS[6].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text
                        className="text-[12px] font-extrabold"
                        style={{
                            textAlign: COLS[6].align, color: riskText({
                                ph: Number(String(item.ph).replace('.', '').replace(',', '.')) || item.ph,
                                suhu: Number(String(item.suhu).replace('.', '').replace(',', '.')) || item.suhu,
                                salinitas: Number(String(item.salinitas).replace('.', '').replace(',', '.')) || item.salinitas,
                                kekeruhan: Number(String(item.kekeruhan).replace('.', '').replace(',', '.')) || item.kekeruhan,
                            }) === 'Tinggi' ? '#b91c1c' : '#065f46'
                        }}
                    >
                        {riskText({
                            ph: Number(String(item.ph).replace('.', '').replace(',', '.')) || item.ph,
                            suhu: Number(String(item.suhu).replace('.', '').replace(',', '.')) || item.suhu,
                            salinitas: Number(String(item.salinitas).replace('.', '').replace(',', '.')) || item.salinitas,
                            kekeruhan: Number(String(item.kekeruhan).replace('.', '').replace(',', '.')) || item.kekeruhan,
                        })}
                    </Text>
                </View>
            </View>
        </View>
    );

    const Footer = (
        <View style={{ paddingHorizontal: H_PAD, paddingVertical: 18 }}>
            <TouchableOpacity
                onPress={() => { }}
                className="rounded-2xl px-5 py-3 self-end"
                style={{
                    backgroundColor: '#67A9F3',
                    shadowOpacity: 0.2, shadowRadius: 8, shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 }, elevation: 5,
                }}
            >
                <Text className="text-white font-extrabold">Cetak Laporan</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            <OrientationLocker orientation={isLandscape ? LANDSCAPE_LEFT : PORTRAIT} />

            <FlatList
                data={loading ? Array.from({ length: 6 }).map((_, i) => ({ id: `s-${i}` })) : rows}
                keyExtractor={(item, idx) => item.id?.toString?.() || item.no?.toString?.() || String(idx)}
                renderItem={loading ? () => <SkeletonRow /> : renderItem}
                ListHeaderComponent={Header}
                ListFooterComponent={Footer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                initialNumToRender={12}
                ListEmptyComponent={!loading ? <Text className="text-center text-slate-500 mt-6">Belum ada data.</Text> : null}
                contentContainerStyle={{ paddingBottom: 16 }}
            />

            <QuickDateModal
                visible={openFilterDate}
                onClose={() => setOpenFilterDate(false)}
                onPick={onPickQuick}
            />
        </SafeAreaView>
    );
};

export default HistoryPeramalan;
