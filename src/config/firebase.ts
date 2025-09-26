import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:demo-app-id',
};

// Initialize Firebase with error handling for demo mode
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
} catch (error) {
  console.warn('❌ Firebase initialization failed - running in demo mode:', error);
  // Create a minimal mock app for demo purposes
  app = { options: firebaseConfig } as any;
}

// Initialize Firebase Auth and get a reference to the service
let auth;
let googleProvider;

try {
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Configure the Google provider
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
  console.log('✅ Firebase Auth initialized successfully');
} catch (error) {
  console.warn('❌ Firebase Auth initialization failed - running in demo mode:', error);
  // Create mock auth for demo purposes
  auth = null;
  googleProvider = null;
}

export { auth, googleProvider };
export default app;