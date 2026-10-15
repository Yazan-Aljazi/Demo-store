import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyA3c2uCUuPhPR4L8eezLmD-HOQu13g_vNc",
  authDomain: "my-store-1eea3.firebaseapp.com",
  projectId: "my-store-1eea3",
  storageBucket: "my-store-1eea3.firebasestorage.app",
  messagingSenderId: "503951276743",
  appId: "1:503951276743:web:6c62a938835687f8975ce2",

};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

if (import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });

  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}


