import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { GameContext } from '../../../context/GameContext';
import { db } from '../../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function QuizUI({ payload }) {
  const { player } = useContext(AuthContext);
  const { gameState } = useContext(GameContext);
  
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const [setupCountdown, setSetupCountdown] = useState(5);
  const [questionTimer, setQuestionTimer] = useState(gameState?.activeQuestion?.timeLimit || 20);

  useEffect(() => {
    if (!gameState?.updatedAt) return;
    const timeLimit = gameState.activeQuestion?.timeLimit || 20;
    const updatedAtMs = gameState.updatedAt.toMillis ? gameState.updatedAt.toMillis() : Date.now();

    const updateTimers = () => {
      const elapsedSeconds = Math.floor((Date.now() - updatedAtMs) / 1000);
      const remainingSetup = 5 - elapsedSeconds;
      
      if (remainingSetup > 0) {
        setSetupCountdown(remainingSetup);
        setQuestionTimer(timeLimit);
      } else {
        setSetupCountdown(0);
        const activeElapsed = elapsedSeconds - 5;
        const remainingQuestionTime = timeLimit - activeElapsed;
        setQuestionTimer(remainingQuestionTime <= 0 ? 0 : remainingQuestionTime);
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState?.updatedAt]);

 // 1. Add a ref when the component loads to track start time (after the 5s setup countdown ends)
const [questionStartTime, setQuestionStartTime] = useState(null);

useEffect(() => {
  if (setupCountdown === 0 && !questionStartTime) {
    setQuestionStartTime(Date.now());
  }
}, [setupCountdown, questionStartTime]);

const handleLockAnswer = async () => {
  if (!selected || questionTimer <= 0) return;
  setIsSubmitting(true);

  try {
    const isCorrect = selected === payload?.correct;
    
    // 2. Calculate exact latency in seconds
    const timeTaken = questionStartTime ? (Date.now() - questionStartTime) / 1000 : 0;

    const answerRecord = {
      pin: player.pin,
      name: player.name,
      teamCode: player.teamCode || null,
      gameMode: gameState.gameMode || 'solo',
      questionText: payload?.question || 'Unknown Question',
      submittedAnswer: selected,
      isCorrect: isCorrect,
      timeTaken: Number(timeTaken.toFixed(1)), // e.g. 3.4 seconds
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'events', 'samarambh', 'answers'), answerRecord);

    if (navigator.vibrate) {
        navigator.vibrate(50); // Gives the phone a satisfying physical buzz on tap!
      }
      
    setHasSubmitted(true);
  } catch (error) {
    console.error("Failed to submit answer:", error);
  } finally {
    setIsSubmitting(false);
  }
};

  // Safe Guard: If payload is missing entirely
  if (!payload) {
    return (
      <div className="min-h-screen bg-black text-red-500 font-mono flex items-center justify-center p-6 text-center">
        <p>⚠️ Error: Invalid payload received by mobile client.</p>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gray-900 border-4 border-green-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Answer Locked!</h1>
        <p className="text-gray-400 mb-8 uppercase tracking-widest text-sm">Awaiting host clearance...</p>
      </div>
    );
  }

  if (setupCountdown > 0) {
    return (
      <div className="min-h-screen bg-black text-yellow-400 font-mono flex flex-col items-center justify-center p-6 text-center">
        <div className="text-8xl font-black mb-6 animate-pulse">{setupCountdown}</div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">Get Ready!</h2>
        <p className="text-gray-500 text-sm">Question deploying across network...</p>
        <div className="mt-8 border border-gray-800 bg-gray-900 p-4 rounded w-full max-w-xs text-xs text-gray-400 uppercase">
          Answering Window: {gameState?.activeQuestion?.timeLimit || 20}s
        </div>
      </div>
    );
  }

  // Safely map options, defaulting to an empty array if undefined
  const optionsList = payload?.options || [];

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col p-6 pt-8">
      <div className="w-full max-w-md mx-auto">
        
        <div className="flex justify-between items-center mb-6 bg-gray-900 p-3 rounded border border-gray-800">
          <span className="text-red-500 font-bold text-xs uppercase tracking-widest animate-pulse">🔴 LIVE</span>
          <span className={`font-bold text-sm ${questionTimer <= 5 ? 'text-red-500 animate-bounce' : 'text-yellow-400'}`}>
            ⏳ {questionTimer}s left
          </span>
          <span className="text-gray-400 text-xs uppercase">{gameState?.gameMode}</span>
        </div>

        <h1 className="text-xl font-bold text-white mb-6 border-l-4 border-cyan-500 pl-4">
          {payload?.question}
        </h1>
        
        <div className="space-y-3">
          {optionsList.map((opt, idx) => (
            <button 
              key={idx}
              onClick={() => setSelected(opt)}
              className={`w-full p-4 rounded border-2 text-left transition-all duration-200 ${
                selected === opt 
                ? 'bg-cyan-900 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,153,0.3)]' 
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-green-500 hover:text-green-400'
              }`}
            >
              <span className="text-gray-600 mr-4 font-bold">[{idx + 1}]</span>
              {opt}
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-6">
            <button 
              onClick={handleLockAnswer}
              disabled={isSubmitting || questionTimer <= 0}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-black font-extrabold py-4 rounded uppercase tracking-widest"
            >
              {isSubmitting ? 'Transmitting...' : 'Lock Answer'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}