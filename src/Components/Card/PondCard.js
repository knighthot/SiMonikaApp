// src/components/PondCard.js
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PondCard({ name }) {
  return (
    <View className="flex-row bg-blue-800 rounded-lg p-3 mb-4">
      {/* Icon */}
      <View className="justify-center items-center w-20">
        {/* Anda bisa ganti Image dengan SVG */}
        <Icon name="fish-outline" size={30} color="#fff" />
        <Text className="text-white text-xs mt-1">{name}</Text>
      </View>

      {/* Data */}
      <View className="flex-1 bg-white rounded-tr-lg rounded-br-lg p-3 justify-between">
        <View>
          <Text className="text-xs text-gray-500">Id_Peralat:</Text>
          <Text className="text-xs text-gray-500">Subtract:</Text>
          <Text className="text-xs text-gray-500">Lokasi:</Text>
        </View>
        <View className="flex-row justify-end mt-2 space-x-2">
          <TouchableOpacity className="bg-green-500 p-2 rounded-full">
            <Icon name="eye" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-yellow-400 p-2 rounded-full">
            <Icon name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-red-600 p-2 rounded-full">
            <Icon name="trash" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
