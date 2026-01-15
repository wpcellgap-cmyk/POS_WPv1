import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyBEAIJBAEkdtjVqqaedXtTHPyZlaYphVQ0",
    authDomain: "pos-konter-sas-wpcell.firebaseapp.com",
    projectId: "pos-konter-sas-wpcell",
    storageBucket: "pos-konter-sas-wpcell.firebasestorage.app",
    messagingSenderId: "38681184416",
    appId: "1:38681184416:web:d55f703eb9353077e0a1c5",
    measurementId: "G-514C8V57V0"
};

const app = initializeApp(firebaseConfig);

// Use React Native specific auth initialization with AsyncStorage persistence
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export default app;
