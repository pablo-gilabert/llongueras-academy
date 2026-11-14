/** Firebase web SDK initialization; never includes privileged server credentials. */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration for Academia Llongueras.
const firebaseConfig = {
    apiKey: 'AIzaSyB4_vcmz5CISAwrAfMKtg-oQQxjq1C4D2M',
    authDomain: 'academia-llongueras.firebaseapp.com',
    projectId: 'academia-llongueras',
    storageBucket: 'academia-llongueras.firebasestorage.app',
    messagingSenderId: '89264951216',
    appId: '1:89264951216:web:a8282c736599a4e2f9d075',
};

// Initialize the Firebase application.
const app = initializeApp(firebaseConfig);

// Initialize authentication and Firestore services.
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;