import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyALEBD-RuTfk9rdjk9vZSLQegpjJ6mesy0',
  authDomain: 'eterna-3ab2b.firebaseapp.com',
  projectId: 'eterna-3ab2b',
  storageBucket: 'eterna-3ab2b.firebasestorage.app',
  messagingSenderId: '763318700422',
  appId: '1:763318700422:web:612a21494b27ceea2fc407',
  measurementId: 'G-E0J9B05RCE',
};

const app = initializeApp(firebaseConfig);

isSupported()
  .then((supported) => {
    if (!supported) return;

    window.eternaFirebaseApp = app;
    window.eternaFirebaseAnalytics = getAnalytics(app);
  })
  .catch(() => {
    window.eternaFirebaseApp = app;
  });
