import { NavigationContainer } from '@react-navigation/native';
import { navRef } from './src/Navigations/navigationService';
import RootNavigator from './src/Navigations/RootNavigator';

export default function App() {
  return (
    <NavigationContainer ref={navRef}>
      <RootNavigator />
    </NavigationContainer>
  );
}
