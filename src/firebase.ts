import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBPGID_oDZle7FhhzmwRjpHuzqXwiAJHTc",
  authDomain: "honoaienterprise.firebaseapp.com",
  projectId: "honoaienterprise",
  storageBucket: "honoaienterprise.firebasestorage.app",
  messagingSenderId: "410042062227",
  appId: "1:410042062227:web:08b85f573ef129ec664466",
  measurementId: "G-ZYLH78KB67",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
