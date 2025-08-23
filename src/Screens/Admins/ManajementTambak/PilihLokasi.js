import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';

export default function PilihLokasi({ route, navigation }) {
  const { setLat, setLng } = route.params;

  // Ref ke MapView untuk animate/recenter
  const mapRef = useRef(null);

  // Region peta (kamera)
  const [region, setRegion] = useState({
    latitude: -6.2,        // fallback (Jakarta)
    longitude: 106.8,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Posisi marker (terpisah dari region agar bebas digeser)
  const [markerCoord, setMarkerCoord] = useState({
    latitude: -6.2,
    longitude: 106.8,
  });

  // Ambil lokasi awal user
  useEffect(() => {
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (latitude != null && longitude != null) {
          const nextRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setRegion(nextRegion);
          setMarkerCoord({ latitude, longitude });
          // animasi kamera
          if (mapRef.current) {
            mapRef.current.animateToRegion(nextRegion, 600);
          }
        }
      },
      (err) => {
        // Kalau gagal, tetap pakai fallback; kasih tahu user
        Alert.alert('Gagal membaca lokasi', err?.message || 'unknown');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  // Recenter ke lokasi user saat tombol ditekan
  const recenterToUser = () => {
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords || {};
        if (latitude != null && longitude != null) {
          const nextRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setRegion(nextRegion);
          setMarkerCoord({ latitude, longitude });
          if (mapRef.current) mapRef.current.animateToRegion(nextRegion, 600);
        }
      },
      (err) => {
        Alert.alert('Tidak bisa recenter', err?.message || 'unknown');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  return (
    <View style={{ flex: 1 }}>
     <MapView
  ref={mapRef}
  style={{ flex: 1 }}
  region={region}
  onRegionChangeComplete={setRegion}
  showsUserLocation
  showsMyLocationButton={false}
  cacheEnabled={false}
  loadingEnabled={false}
  liteMode={false}
  onPress={(e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate || {};
    if (latitude && longitude) setMarkerCoord({ latitude, longitude });
  }}
>
  <Marker
    coordinate={markerCoord}
    draggable
    onDragEnd={(e) => {
      const { latitude, longitude } = e.nativeEvent.coordinate || {};
      if (latitude && longitude) setMarkerCoord({ latitude, longitude });
    }}
  />
</MapView>


      {/* Tombol recenter ke user */}
      <TouchableOpacity
        onPress={recenterToUser}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          backgroundColor: '#ffffff',
          borderRadius: 28,
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 3,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 3,
        }}
      >
        <Icon name="locate" size={22} color="#2E86DE" />
      </TouchableOpacity>

      {/* Konfirmasi titik */}
      <TouchableOpacity
        onPress={() => {
          setLat(String(markerCoord.latitude));
          setLng(String(markerCoord.longitude));
          navigation.goBack();
        }}
        style={{
          position: 'absolute',
          bottom: 40,
          left: 20,
          right: 20,
          backgroundColor: '#2E86DE',
          padding: 15,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
          Gunakan Titik Ini
        </Text>
      </TouchableOpacity>
    </View>
  );
}
