import React, { useEffect, useMemo, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ScrollView,
    StyleSheet,
    StatusBar,
    Image
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import WaveBackground from '../../../Utils/WaveBackground';
import WaveWhiteBackground from '../../../Components/Decor/WaveWhiteBackground';
import Logo from "../../../Assets/Image/Logo.png"
import { getRandomSensorData } from '../../../Utils/randomSensor';
import LiquidBadge from '../../../Components/CircleInfo/LiquidBadge';
import CardWave from '../../../Components/Decor/CardWave';
// === gauge ring (tetap) ===
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
                    <Text className="text-[22px] font-extrabold" style={{ color }}>{valueText}</Text>
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

// status sederhana dari sensor → label/warna
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

// format tanggal Indo
const indoDay = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const tglIndo = (d) =>
    d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

const DashboardUser = ({ route, navigation }) => {
    const tambak = route?.params?.tambak ?? { Nama: 'Tambak A' };

    const [sensor, setSensor] = useState(getRandomSensorData());
    useEffect(() => {
        const t = setInterval(() => setSensor(getRandomSensorData()), 4000);
        return () => clearInterval(t);
    }, []);

    const status = useMemo(() => getStatus(sensor), [sensor]);

    // map label → key LiquidBadge
    const statusKey = status.text === 'Baik' ? 'baik' : status.text === 'Buruk' ? 'buruk' : 'sedang';

    const now = new Date();
    const next = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const gauges = [
        { label: 'SUHU', color: '#22c55e', valueText: `${sensor.Suhu}°C`, progress: Math.min(1, Math.max(0, (sensor.Suhu - 20) / 20)) },
        { label: 'PH', color: '#ef4444', valueText: `${sensor.PH}`, progress: Math.min(1, Math.max(0, sensor.PH / 14)) },
        { label: 'SALINITAS', color: '#a3be00', valueText: `${sensor.Salinitas}`, progress: Math.min(1, Math.max(0, sensor.Salinitas / 40)) },
        { label: 'KEKERUHAN', color: '#0ea5e9', valueText: `${sensor.Kekeruhan} NTU`, progress: Math.min(1, Math.max(0, sensor.Kekeruhan / 300)) },
    ];
    const CARD_W = 200, GAP = 12;

    return (
        <View className="flex-1 bg-white ">
      <StatusBar translucent={true} backgroundColor={'transparent'} />
            <ScrollView showsVerticalScrollIndicator={false} >
            
                {/* Greeting card */}
            <View style={styles.cardShadow} className="mx-4 mt-14">
  <View className="rounded-3xl bg-white overflow-hidden">
    {/* wave statis di bawah teks */}
    <View className="absolute left-0 right-0 bottom-0">
      <CardWave height={100} />
    </View>

    <View className="p-5">
      <Text className="text-[36px] font-extrabold">
        {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
      </Text>
      <Text className="text-[16px] mt-1 font-semibold">{indoDay[now.getDay()]}</Text>
      <Text className="text-[20px] mt-8 font-extrabold text-[#ffffff]">Selamat Datang</Text>
      <Text className="text-[18px] -mt-1 font-extrabold text-[#ffffff]">{tambak.Nama}</Text>
    </View>

    {/* ikon ikan di kanan-atas */}
    <View className="absolute right-4 top-12">
      <View className="w-[96px] h-[96px] bg-[#cfe8ff] rounded-full items-center justify-center">
        <Image source={Logo} className="w-[60px] h-[65px]" />
      </View>
    </View>
  </View>
</View>

<View className="h-[70px] mt-4" pointerEvents="none">
  {/* posisikan wave menempel di bawah container ini */}
  <View className="absolute left-0 right-0 top-[-40px]">
    <WaveWhiteBackground height={150} />
  </View>
</View>
                {/* Status + teks + actions */}
                <View className="mt-4 px-4 flex-1">
                    <View className="flex-row items-center">
                        {/* === Liquid water badge (animated) === */}
                        <LiquidBadge status={statusKey} label={status.text} size={120} />

                        <View className="flex-1 ml-4">
                            <Text className="text-[13px] leading-5 text-slate-700">
                                Kondisi air laut di tambak pada tanggal <Text className="font-bold">{tglIndo(now)}</Text> sampai <Text className="font-bold">{tglIndo(next)}</Text> berada dalam kategori <Text style={{ color: status.color }} className="font-bold">{status.text.toLowerCase()}</Text>. Parameter utama seperti suhu, pH, salinitas, dan tingkat kekeruhan {status.text === 'Baik' ? 'masih stabil dan sesuai' : 'perlu perhatian'} untuk budidaya ikan kerapu.
                            </Text>

                            <View className="flex-row mt-3">
                                <TouchableOpacity className="bg-[#67A9F3] px-4 py-2 rounded-xl mr-3">
                                    <Text className="text-white font-extrabold">Ramal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity className="bg-[#67A9F3] px-4 py-2 rounded-xl">
                                    <Text className="text-white font-extrabold">Tanya AI</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Header small + Cek Alat */}
                <View className="mt-6 px-4 flex-row items-center justify-between">
                    <Text className="text-[18px] font-bold text-slate-800">Parameter</Text>
                    <TouchableOpacity
                        className="bg-[#67A9F3] px-4 py-2 rounded-xl"
                        onPress={() => navigation.navigate?.('Perangkat')}
                    >
                        <Text className="text-white font-extrabold">Cek Alat</Text>
                    </TouchableOpacity>
                </View>

                {/* Gauges scrollable */}
                <View className="mt-3">
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
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
  cardShadow: {
    borderRadius: 24,     // sama dengan rounded-3xl
    backgroundColor: '#fff',
    // iOS shadow
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    // Android shadow
    elevation: 12,
  },
});

export default DashboardUser;
