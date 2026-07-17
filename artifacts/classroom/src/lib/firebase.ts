import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBQ0bWDZzwcbWMmuXbBP9zdtdzau3KnIGw",
  authDomain: "https://medcare-analysis.firebaseapp.com",
  projectId: "medcare-analysis",
  storageBucket: "https://medcare-analysis.firebasestorage.app",
  messagingSenderId: "216283756121",
  appId: "1:216283756121:web:88b2e2642bb35f70852348",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
