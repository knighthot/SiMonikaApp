// screens/HistoryPeramalan.js
import React, { useCallback, useMemo, useState } from 'react';
import {
    View, Text, TouchableOpacity, SafeAreaView, FlatList,
    RefreshControl, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getMe, apiFetch, getHistoryTrend } from '../../../api';

const screenW = Dimensions.get('window').width;
const H_PAD = 20; // padding horizontal (px) -> selaras dengan px-5

/* ====== Kolom tabel (proporsi agar selalu muat) ====== */
const COLS = [
    { key: '#', flex: 0.4, align: 'center' },
    { key: 'TANGGAL', flex: 1.5, align: 'left' },
    { key: 'PH', flex: 0.5, align: 'center' },
    { key: 'SUHU', flex: 0.9, align: 'center' },
    { key: 'KEKERUHAN', flex: 1.1, align: 'center' },
    { key: 'SANITASI', flex: 1.0, align: 'center' },
    { key: 'RESIKO', flex: 1.1, align: 'center' },
];

/* ---------------- Skeleton sederhana ---------------- */
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

/* ------------- Modal filter tanggal cepat ------------- */
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

/* ----------------- Util kecil ----------------- */
const monthLabel = (d) => d.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
const riskText = (row) => {
    const bad =
        (row.pH && (row.pH < 6.5 || row.pH > 8.5)) ||
        (row.salinitas && (row.salinitas < 15 || row.salinitas > 35)) ||
        (row.suhu && (row.suhu < 25 || row.suhu > 34)) ||
        (row.kekeruhan && row.kekeruhan > 70);
    return bad ? 'Tinggi' : 'Normal';
};
const colorLegend = { pH: '#1d4ed8', salinitas: '#16a34a', suhu: '#f59e0b', kekeruhan: '#7e22ce' };

const HistoryPeramalan = () => {
    const [me, setMe] = useState(null);

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

    const loadAll = useCallback(async () => {
        try {
            setLoading(true);
            const m = me || (await getMe());
            if (!me) setMe(m);
            const idTambak = m?.ID_Tambak || m?.TB_Tambak?.ID_Tambak;

            const t = await getHistoryTrend(idTambak, { days: 31, to: range.to });
            setTrend(t || {});

            const qs = new URLSearchParams({
                mode: 'table',
                ID_Tambak: String(idTambak),
                from: range.from.toISOString(),
                to: range.to.toISOString(),
                gap: '1',  // ambil tiap 1 record
            }).toString();

            const list = await apiFetch(`/api/history-peramalan?${qs}`);
            const dataRows = list?.rows || [];
            setRows(
                dataRows.map((r, idx) => ({
                    no: idx + 1,
                    tanggal: r.tanggal,
                    pH: r.pH,
                    suhu: r.suhu,
                    kekeruhan: r.kekeruhan,
                    salinitas: r.salinitas,
                    // tampilkan risk_label di kolom RESIKO
                    risk: r.risk || 'Normal',
                }))
            );

        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [me, range.from, range.to]);

    React.useEffect(() => { loadAll(); }, [loadAll]);

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

    /* ---------- siapkan data grafik ---------- */
    const chartData = useMemo(() => {
        const N = 30;
        const labels = Array.from({ length: N }, (_, i) => `${i + 1}`);
        const safe = (arr) => (Array.isArray(arr) ? arr : Array(N).fill(null));
        const ph = safe(trend?.pH || trend?.ph || trend?.PH);
        const sal = safe(trend?.salinitas || trend?.Salinitas);
        const suh = safe(trend?.suhu || trend?.Suhu);
        const ker = safe(trend?.kekeruhan || trend?.Kekeruhan);
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

    const chartConfig = {
        backgroundGradientFrom: '#ffffff',
        backgroundGradientTo: '#ffffff',
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
        propsForDots: { r: '2' },
        propsForBackgroundLines: { strokeDasharray: '4 7' },
        propsForLabels: { fontSize: 9 }, // coba 8–10 sesuai selera
    };

    /* ---------- bagian header (selalu muat) ---------- */
    const Header = (
        <View>
            <Text className="text-[18px] font-extrabold text-[#0a465e] mt-14" style={{ paddingLeft: H_PAD }}>
                {range.label}
            </Text>

            <View style={{ paddingHorizontal: H_PAD, marginTop: 8 }}>
                {loading ? (
                    <Skeleton h={220} br={16} />
                ) : (
                    <LineChart
                        data={chartData}
                        width={Math.max(420, screenW - H_PAD * 2)}  // aman di semua device
                        height={230}
                        chartConfig={chartConfig}
                        bezier

                        withShadow
                        fromZero
                        style={{ borderRadius: 16, left: -50 }}
                        segments={5}
                    />
                )}
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

            {/* tombol filter parameter — wrap otomatis */}
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
                            <Text className="font-extrabold text-[px]" style={{ color: active ? 'white' : '#0f172a' }}>{k}</Text>
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

            {/* header tabel (proporsi flex → tak overflow) */}
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
                {/* # */}
                <View style={{ flex: COLS[0].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[10px] font-semibold text-slate-700" style={{ textAlign: COLS[0].align }}>{item.no}</Text>
                </View>
                {/* TANGGAL */}
                <View style={{ flex: COLS[1].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[10px] font-semibold text-slate-700" numberOfLines={1}>
                        {new Date(item.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                {/* PH */}
                <View style={{ flex: COLS[2].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[12px] font-semibold text-slate-700" style={{ textAlign: COLS[2].align }}>{item.pH ?? '-'}</Text>
                </View>
                {/* SUHU */}
                <View style={{ flex: COLS[3].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[12px] font-semibold text-slate-700" style={{ textAlign: COLS[3].align }}>{item.suhu ?? '-'}</Text>
                </View>
                {/* KEKERUHAN */}
                <View style={{ flex: COLS[4].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[12px] font-semibold text-slate-700" style={{ textAlign: COLS[4].align }}>{item.kekeruhan ?? '-'}</Text>
                </View>
                {/* SANITASI */}
                <View style={{ flex: COLS[5].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text className="text-[10px] font-semibold text-slate-700" style={{ textAlign: COLS[5].align }}>{item.salinitas ?? '-'}</Text>
                </View>
                {/* RESIKO */}
                <View style={{ flex: COLS[6].flex, paddingVertical: 12, paddingHorizontal: 10 }}>
                    <Text
                        className="text-[12px] font-extrabold"
                        style={{ textAlign: COLS[6].align, color: riskText(item) === 'Tinggi' ? '#b91c1c' : '#065f46' }}
                    >
                        {riskText(item)}
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
