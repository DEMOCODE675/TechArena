import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function PlayerDashboard({ onOpenTeam }) {
  const { player } = useContext(AuthContext);
  const [allPlayers, setAllPlayers] = useState([]);
  const [myRank, setMyRank] = useState({ rank: '-', score: 0 });

  // Real-time listener for all players' scores
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'players'), (snapshot) => {
      let playersList = [];
      snapshot.forEach((doc) => {
        playersList.push({ id: doc.id, ...doc.data() });
      });

      // Sort highest score to lowest
      playersList.sort((a, b) => (b.score || 0) - (a.score || 0));
      setAllPlayers(playersList);

      // Find current logged-in player's rank and score
      const index = playersList.findIndex((p) => p.pin === player.pin);
      if (index !== -1) {
        setMyRank({
          rank: index + 1,
          score: playersList[index].score || 0
        });
      }
    });

    return () => unsubscribe();
  }, [player?.pin]);

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col p-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-cyan-400">{player?.name}</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest">PIN: {player?.pin}</p>
        </div>
        <button 
          onClick={onOpenTeam}
          className="bg-gray-900 border border-cyan-500 text-cyan-400 text-xs px-4 py-2 rounded font-bold uppercase hover:bg-cyan-950 transition-colors"
        >
          {player?.teamCode ? '🛡️ Squad Room' : '➕ Join Squad'}
        </button>
      </div>

      {/* 🚀 PERSONAL RANK CARD (STICKY TOP BANNER) */}
      <div className="bg-gradient-to-r from-cyan-950 to-gray-900 border-2 border-cyan-500 p-6 rounded-2xl mb-8 shadow-[0_0_20px_rgba(6,182,212,0.2)] flex justify-between items-center">
        <div>
          <span className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Your Standing</span>
          <h2 className="text-4xl font-black text-white mt-1">Rank #{myRank.rank}</h2>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-cyan-300">{myRank.score}</span>
          <span className="text-xs text-gray-400 uppercase block tracking-widest">Total Points</span>
        </div>
      </div>

      {/* WAITING ROOM STATUS */}
      <div className="text-center my-4">
        <div className="inline-block w-3 h-3 bg-yellow-500 rounded-full animate-ping mr-2"></div>
        <span className="text-yellow-400 text-sm uppercase tracking-widest">Network Standby — Awaiting Host Transmission...</span>
      </div>

      {/* 🚀 LIVE STUDENT LEADERBOARD LIST */}
      <div className="mt-4 flex-grow">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Live Operative Standings</h3>
        
        <div className="space-y-3 pb-12">
          {allPlayers.map((p, idx) => {
            const isMe = p.pin === player.pin;
            return (
              <div 
                key={p.id} 
                className={`flex justify-between items-center p-4 rounded-xl border transition-all ${
                  isMe 
                  ? 'bg-cyan-950/40 border-cyan-500 text-white' 
                  : 'bg-gray-950 border-gray-800 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-black text-lg ${idx === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-base">
                    {p.name} {isMe && <span className="text-xs text-cyan-400 ml-1">(You)</span>}
                  </span>
                </div>
                <div className="font-black text-lg text-white">
                  {p.score || 0} <span className="text-xs text-gray-500 font-normal">pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}