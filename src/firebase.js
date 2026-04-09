import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvQ5z8J4K2L3M4N5O6P7Q8R9S0T1U2V3W",
  authDomain: "medicalvaultnotifications.firebaseapp.com",
  projectId: "medicalvaultnotifications",
  storageBucket: "medicalvaultnotifications.appspot.com",
  messagingSenderId: "110074872225764434749",
  appId: "1:110074872225764434749:web:abcd1234efgh5678ijkl9012"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);
const VAPID_KEY = String(import.meta?.env?.VITE_FIREBASE_VAPID_KEY || '').trim();
let warnedMissingVapid = false;

// FCM service worker registration
export const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      return true;
    } else {
      console.log('Notification permission denied.');
      return false;
    }
  } catch (error) {
    console.error('Error requesting permission:', error);
    return false;
  }
};

// Get FCM token
export const getFCMToken = async () => {
  try {
    const permission = await requestPermission();
    if (!permission) {
      return null;
    }

    if (!VAPID_KEY || VAPID_KEY === 'your-vapid-key-here') {
      if (!warnedMissingVapid) {
        warnedMissingVapid = true;
        console.warn('FCM VAPID key is missing or invalid. Skipping push token registration.');
      }
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      console.log('FCM Token:', token);
      return token;
    } else {
      throw new Error('No registration token available.');
    }
  } catch (error) {
    console.warn('Unable to retrieve FCM token:', error?.message || error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      resolve(payload);
    });
  });
};

// Register service worker for background messages
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  }
};

export { messaging };
export default app;
