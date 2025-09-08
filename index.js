/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import { showNotificationFromRemote } from './src/notifications/push';

messaging().setBackgroundMessageHandler(async remoteMessage => {
    // tampilkan notif untuk pesan data-only saat app background/quit
    await showNotificationFromRemote(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
