import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from '../../context/GameContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function ProjectorView() {
  const { gameState } = useContext(GameContext);
  const [leaders, setLeaders] = useState([]);
  
  // Two separate timers: Setup countdown vs Active Question timer
  const [setupCountdown, setSetupCountdown] = useState(5); 
  const [questionTimer, setQuestionTimer] = useState(0);

  // 1. Handle the initial opening suspense countdown & question window
  useEffect(() => {
    if (gameState?.status !== 'playing' || !gameState?.updatedAt) return;

    const updatedAtMs = gameState.updatedAt.toMillis ? gameState.updatedAt.toMillis() : Date.now();
    const questionDuration = gameState.activeQuestion?.timeLimit || 20;

    const updateTimers = () => {
      const nowMs = Date.now();
      const elapsedSeconds = Math.floor((nowMs - updatedAtMs) / 1000);

      // Phase 1: The 5-second suspense opening countdown
      const remainingSetup = 5 - elapsedSeconds;
      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(questionDuration); 
      } else {
        setSetupCountdown(0);
        // Phase 2: The actual question answering window starts counting down from questionDuration
        const activeElapsed = elapsedSeconds - 5;
        const remainingQuestionTime = questionDuration - activeElapsed;
        setQuestionTimer(remainingQuestionTime <= 0 ? 0 : remainingQuestionTime);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState?.updatedAt, gameState?.status, gameState?.activeQuestion]);

  // Fetch leaderboard data
  useEffect(() => {
    if (gameState?.status !== 'leaderboard') return;
    const isTeamMode = gameState.gameMode === 'team';
    const collectionPath = isTeamMode ? 'events/samarambh/teams' : 'players';
    
    const unsubscribe = onSnapshot(collection(db, collectionPath), (snapshot) => {
      let results = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          name: isTeamMode ? data.teamName : data.name,
          score: isTeamMode ? (data.totalScore || 0) : (data.score || 0) 
        });
      });
      results.sort((a, b) => b.score - a.score);
      setLeaders(results.slice(0, 5));
    });

    return () => unsubscribe();
  }, [gameState?.status, gameState?.gameMode]);

  // VIEW 1: STANDBY
  if (!gameState || gameState.status === 'waiting' || (!gameState.activeQuestion && gameState.status !== 'leaderboard')) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-4xl text-gray-500 tracking-[0.5em] uppercase mb-6">Welcome to</h2>
        <h1 className="text-8xl font-extrabold text-cyan-500 tracking-widest mb-16 drop-shadow-[0_0_40px_rgba(6,182,212,0.4)]">TECH ARENA</h1>
        <div className="bg-gray-900 border-2 border-cyan-800 p-10 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)]">
          <p className="text-3xl text-gray-400 mb-6 uppercase tracking-widest">To join the network, go to:</p>
          <p className="text-7xl font-bold text-green-400 tracking-wider">YOUR-URL.com/play</p>
        </div>
      </motion.div>
    );
  }

  // VIEW 3: PREMIUM LEADERBOARD UI
  if (gameState.status === 'leaderboard') {
    const isTeamMode = gameState.gameMode === 'team';
    return (
      <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center p-12 overflow-hidden selection:bg-cyan-500 selection:text-black">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 pt-8"
        >
          <div className="inline-block px-6 py-2 bg-red-950/60 border border-red-500 rounded-full text-red-400 text-sm tracking-[0.3em] uppercase mb-4 animate-pulse">
            ⚡ Event Concluded ⚡
          </div>
          <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-green-400 tracking-widest drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]">
            {isTeamMode ? 'SQUAD RANKINGS' : 'OPERATIVE RANKINGS'}
          </h1>
        </motion.div>

        <div className="w-full max-w-5xl space-y-6">
          {leaders.length === 0 ? (
            <div className="text-center py-24 bg-gray-900/40 border border-gray-800 rounded-3xl">
              <p className="text-3xl text-gray-500 animate-pulse uppercase tracking-widest">Tabulating telemetry data...</p>
            </div>
          ) : (
            leaders.map((leader, index) => {
              let borderStyle = 'border-gray-800 bg-gray-950/80 text-gray-400';
              let rankBadge = `#${index + 1}`;
              
              if (index === 0) { 
                borderStyle = 'border-yellow-500 bg-gradient-to-r from-yellow-950/40 to-gray-950 text-yellow-300 shadow-[0_0_40px_rgba(234,179,8,0.25)] scale-[1.02]'; 
                rankBadge = '👑 01'; 
              } else if (index === 1) { 
                borderStyle = 'border-gray-400 bg-gradient-to-r from-gray-900 to-gray-950 text-gray-200 shadow-[0_0_25px_rgba(156,163,175,0.15)]'; 
                rankBadge = '🥈 02'; 
              } else if (index === 2) { 
                borderStyle = 'border-amber-700 bg-gradient-to-r from-amber-950/30 to-gray-950 text-amber-500 shadow-[0_0_25px_rgba(180,83,9,0.15)]'; 
                rankBadge = '🥉 03'; 
              }

              return (
                <motion.div 
                  key={leader.id} 
                  initial={{ x: -80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={`flex justify-between items-center px-10 py-6 rounded-2xl border-2 transition-all duration-300 ${borderStyle}`}
                >
                  <div className="flex items-center gap-8">
                    <span className="text-4xl font-black w-24 tracking-wider">{rankBadge}</span>
                    <div className="flex flex-col">
                      <span className="text-4xl font-bold tracking-wide text-white">{leader.name}</span>
                      <span className="text-xs uppercase tracking-widest text-gray-500 mt-1">
                        {isTeamMode ? 'Verified Squad' : 'Active Operative'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-black tracking-wider text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                      {leader.score}
                    </span>
                    <span className="text-xl font-bold text-gray-500 uppercase tracking-widest">pts</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const block = gameState.activeQuestion;
  const isTeamMode = gameState.gameMode === 'team';

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col p-12">
      
      <div className="flex justify-between items-center border-b-2 border-gray-800 pb-8 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-8 h-8 bg-red-600 rounded-full animate-pulse"></div>
          <h2 className="text-4xl font-bold text-red-500 uppercase tracking-widest">Live Event</h2>
        </div>
        
        {/* TIMER BADGE */}
        {setupCountdown === 0 ? (
          <div className={`px-8 py-3 border-4 rounded-xl text-3xl font-extrabold tracking-widest uppercase ${
            questionTimer <= 5 ? 'border-red-600 text-red-500 bg-red-950/40 animate-bounce' : 'border-green-500 text-green-400'
          }`}>
            ⏳ Time Left: {questionTimer}s
          </div>
        ) : (
          <div className="px-8 py-3 border-4 border-yellow-500 text-yellow-400 rounded-xl text-3xl font-extrabold uppercase animate-pulse">
            🚨 Deploying in: {setupCountdown}s
          </div>
        )}

        <div className={`px-8 py-3 border-4 rounded-xl text-3xl font-bold uppercase ${isTeamMode ? 'border-cyan-500 text-cyan-400' : 'border-purple-500 text-purple-400'}`}>
          {isTeamMode ? 'Team Mode' : 'Solo Mode'}
        </div>
      </div>

      {/* GATEKEEPER / SUSPENSE COUNTDOWN */}
      {setupCountdown > 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
          <div className="text-9xl font-black text-yellow-400 mb-8 animate-pulse">
            {setupCountdown}
          </div>
          <h1 className="text-5xl font-bold text-gray-300 tracking-widest uppercase">
            Incoming Transmission...
          </h1>
        </div>
      ) : (
        /* QUESTION REVEAL + FULL ADMIN-SET TIMER WINDOW */
        <>
          {block?.type === 'mcq' && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-grow flex flex-col items-center justify-center max-w-7xl mx-auto w-full">
              <h1 className="text-6xl font-extrabold text-white mb-20 text-center leading-snug border-l-8 border-cyan-500 pl-10">
                {block.payload?.question}
              </h1>
              <div className="grid grid-cols-2 gap-10 w-full">
                {(block.payload?.options || []).map((opt, idx) => (
                  <div key={idx} className="bg-gray-900 border-4 border-gray-700 p-10 rounded-2xl flex items-center text-left">
                    <span className="text-5xl font-black text-gray-700 mr-8">[{idx + 1}]</span>
                    <span className="text-5xl font-bold text-cyan-400">{opt}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {block?.type === 'terminal_hack' && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-grow flex flex-col items-center justify-center max-w-7xl mx-auto w-full">
              <h1 className="text-6xl text-green-500 mb-12 font-bold text-center border-b-4 border-green-800 pb-8">
                Mission: {block.payload?.missionText}
              </h1>
              <div className="bg-gray-950 border-4 border-green-900 p-10 rounded-2xl w-full">
                <pre className="text-4xl text-green-400 font-mono whitespace-pre-wrap">{block.payload?.consoleText}</pre>
              </div>
            </motion.div>
          )}
        </>
      )}

      <div className="mt-auto text-center border-t-2 border-gray-800 pt-8">
        <p className="text-4xl text-gray-500 uppercase tracking-widest">
          {setupCountdown > 0 ? 'Get ready to read the question...' : questionTimer === 0 ? '⏰ TIME EXPIRED!' : 'Answering window is open! Lock in your answer!'}
        </p>
      </div>

    </div>
  );
}