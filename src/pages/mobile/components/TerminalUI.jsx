import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { GameContext } from '../../../context/GameContext';
import { db } from '../../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function TerminalUI({ payload }) {
  const { player } = useContext(AuthContext);
  const { gameState } = useContext(GameContext);
  
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const [setupCountdown, setSetupCountdown] = useState(5);
  const [questionTimer, setQuestionTimer] = useState(gameState?.activeQuestion?.timeLimit || 20);
  const inputRef = useRef(null);

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

  useEffect(() => {
    if (setupCountdown === 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [setupCountdown]);

  const handleExecute = async (e) => {
    e.preventDefault();
    if (!input.trim() || questionTimer <= 0) return;
    setIsSubmitting(true);

    try {
      const isCorrect = input.trim().toLowerCase() === (payload?.correct || '').trim().toLowerCase();

      const answerRecord = {
        pin: player.pin,
        name: player.name,
        teamCode: player.teamCode || null,
        gameMode: gameState.gameMode || 'solo',
        questionText: payload?.missionText || 'Unknown Mission',
        submittedAnswer: input.trim(),
        isCorrect: isCorrect,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'events', 'samarambh', 'answers'), answerRecord);
      
      if (navigator.vibrate) {
        navigator.vibrate(50); // Gives the phone a satisfying physical buzz on tap!
      }

      setHasSubmitted(true);
    } catch (error) {
      console.error("Transmission failed:", error);
      alert("Network error. Please attempt transmission again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!payload) {
    return (
      <div className="min-h-screen bg-black text-red-500 font-mono flex items-center justify-center p-6 text-center">
        <p>⚠️ Error: Invalid terminal payload received.</p>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-green-950 border-4 border-green-500 rounded flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          <span className="text-4xl animate-pulse">✓</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 uppercase tracking-widest">Payload Sent</h1>
        <p className="text-green-700 mb-8 uppercase tracking-widest text-sm">Awaiting server verification...</p>
      </div>
    );
  }

  if (setupCountdown > 0) {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono flex flex-col items-center justify-center p-6 text-center">
        <div className="text-8xl font-black mb-6 animate-pulse">{setupCountdown}</div>
        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">Secure Shell Booting</h2>
        <p className="text-green-800 text-sm">Mission deployment imminent...</p>
        <div className="mt-8 border border-green-900 bg-gray-950 p-4 rounded w-full max-w-xs text-xs text-green-600 uppercase">
          Hack Window: {gameState?.activeQuestion?.timeLimit || 20}s
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono flex flex-col p-6 pt-8">
      <div className="w-full max-w-md mx-auto flex flex-col h-full">
        
        <div className="flex justify-between items-center mb-6 bg-gray-900 p-3 rounded border border-green-900">
          <span className="text-green-500 font-bold text-xs uppercase tracking-widest animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> SHELL ACTIVE
          </span>
          <span className={`font-bold text-sm ${questionTimer <= 5 ? 'text-red-500 animate-bounce' : 'text-green-400'}`}>
            ⏱️ {questionTimer}s left
          </span>
          <span className="text-gray-400 text-xs uppercase">{gameState?.gameMode}</span>
        </div>

        <h1 className="text-lg font-bold text-white mb-4 uppercase tracking-wider border-l-4 border-green-500 pl-3">
          {payload?.missionText}
        </h1>
        
        <div className="bg-gray-950 border border-green-900 rounded p-4 mb-6 flex-grow shadow-[inset_0_0_15px_rgba(21,128,61,0.1)] overflow-y-auto max-h-48">
          <pre className="text-xs text-green-600 whitespace-pre-wrap font-mono">
            {payload?.consoleText}
          </pre>
        </div>

        <form onSubmit={handleExecute} className="mt-auto">
          <div className="flex items-center bg-gray-900 border border-green-700 rounded p-2 mb-4">
            <span className="text-green-500 font-bold mr-3 ml-2 text-lg">{'>'}</span>
            <input 
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter exploit / key..."
              className="w-full bg-transparent outline-none text-green-400 placeholder-green-800 text-base"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || questionTimer <= 0 || !input.trim()}
            className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-800 disabled:text-gray-600 text-black font-extrabold py-4 rounded uppercase tracking-widest transition-colors"
          >
            {isSubmitting ? 'Transmitting...' : 'Execute Command'}
          </button>
        </form>

      </div>
    </div>
  );
}