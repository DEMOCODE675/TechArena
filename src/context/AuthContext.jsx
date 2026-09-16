import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if they already have a PIN saved in their browser
  useEffect(() => {
    const checkLocalSession = async () => {
      const savedPin = localStorage.getItem('techarena_pin');
      if (savedPin) {
        await signInWithPin(savedPin);
      } else {
        setLoading(false);
      }
    };
    checkLocalSession();
  }, []);

  // Generate a new PIN for a new student
  const registerNewPlayer = async (name) => {
    try {
      const userCredential = await signInAnonymously(auth);
      const pin = Math.floor(1000 + Math.random() * 9000).toString(); // e.g. "8392"

      const playerRef = doc(db, 'players', pin);
      const playerData = {
        name: name,
        pin: pin,
        uid: userCredential.user.uid,
        teamCode: null,
        createdAt: serverTimestamp()
      };
      
      await setDoc(playerRef, playerData);
      localStorage.setItem('techarena_pin', pin);
      setPlayer(playerData);
      return pin;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  // Let them log in on a laptop using their PIN
  const signInWithPin = async (pin) => {
    try {
      await signInAnonymously(auth);
      const playerRef = doc(db, 'players', pin);
      const docSnap = await getDoc(playerRef);

      if (docSnap.exists()) {
        const playerData = docSnap.data();
        localStorage.setItem('techarena_pin', pin);
        setPlayer(playerData);
        return playerData;
      } else {
        throw new Error("PIN not found. Try registering again.");
      }
    } catch (error) {
      localStorage.removeItem('techarena_pin');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ player, loading, registerNewPlayer, signInWithPin }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}