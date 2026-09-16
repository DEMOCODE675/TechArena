import React, { createContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const GameContext = createContext();

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState({
    status: 'waiting', // 'waiting', 'playing', 'leaderboard'
    activeQuestion: null, // Holds the current question payload
    timeRemaining: 0,
  });

  useEffect(() => {
    // Listen to the master event document
    const eventRef = doc(db, 'events', 'samarambh');
    
    const unsubscribe = onSnapshot(eventRef, (docSnap) => {
      if (docSnap.exists()) {
        setGameState(docSnap.data());
      } else {
        console.log("Waiting for admin to initialize the game...");
      }
    });

    // Cleanup listener when app closes
    return () => unsubscribe();
  }, []);

  return (
    <GameContext.Provider value={{ gameState }}>
      {children}
    </GameContext.Provider>
  );
}