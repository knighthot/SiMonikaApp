import { View, Text } from 'react-native'
import React from 'react'
import "./global.css"
const App = () => {
  return (
    <View className="flex-1 items-center justify-center">
      <Text className='text-3xl font-bold bg-red-500'>App</Text>
      <View className='bg-white'>
        <Text className='text-3xl font-bold'>App</Text>
      </View>
    </View>
  )
}

export default App