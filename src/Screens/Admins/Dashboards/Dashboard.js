import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

const AdminDashboardScreen = () => {
  const [isOn, setIsOn] = useState(false);
  const center = { latitude: -6.200000, longitude: 106.816666 }; // Lokasi Jakarta contoh

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          ...center,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {isOn && (
          <Circle
            center={center}
            radius={200} // meter
            fillColor="rgba(59,130,246,0.2)"
            strokeColor="rgba(59,130,246,0.6)"
          />
        )}

        {/* Contoh Marker */}
        <Marker coordinate={center} title="Perangkat" />
      </MapView>

      {/* Switch */}
      <TouchableOpacity
        style={[styles.switch, isOn ? styles.switchOn : styles.switchOff]}
        onPress={() => setIsOn(!isOn)}
      >
        <Text style={styles.switchText}>{isOn ? 'ON' : 'OFF'}</Text>
      </TouchableOpacity>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tambak Pak A</Text>
        <Text>Lokasi: Jakarta</Text>
        <Text>Kedalaman: -</Text>
        <Text>Substrat: -</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={{ color: 'white' }}>Cek Detail</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  switch: {
    position: 'absolute',
    right: 20,
    top: height / 2,
    width: 50,
    height: 80,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  switchOff: { backgroundColor: '#f87171' },
  switchOn: { backgroundColor: '#4ade80' },
  switchText: { color: 'white', fontWeight: 'bold' },
  card: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    width: width * 0.9,
    padding: 16,
    elevation: 5,
  },
  cardTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 4 },
  button: {
    marginTop: 10,
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
});

export default AdminDashboardScreen;
