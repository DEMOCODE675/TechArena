import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, getDocs, doc, setDoc, onSnapshot, writeBatch, increment, query, where } from 'firebase/firestore';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('builder'); 
  const [statusMsg, setStatusMsg] = useState('');

  const [uiType, setUiType] = useState('mcq');
  const [timeLimit, setTimeLimit] = useState(15);
  const [mcqQuestion, setMcqQuestion] = useState('');
  const [mcqOptions, setMcqOptions] = useState('');
  const [mcqCorrect, setMcqCorrect] = useState('');
  const [termLog, setTermLog] = useState('');
  const [termMission, setTermMission] = useState('');
  const [termCorrect, setTermCorrect] = useState('');

  const [savedBlocks, setSavedBlocks] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [broadcastMode, setBroadcastMode] = useState('solo'); 
  const [liveState, setLiveState] = useState(null);

  useEffect(() => {
    if (activeTab === 'controller') fetchBlocks();

    const unsubscribe = onSnapshot(doc(db, 'events', 'samarambh'), (docSnap) => {
      if (docSnap.exists()) setLiveState(docSnap.data());
    });
    return () => unsubscribe();
  }, [activeTab]);

  const fetchBlocks = async () => {
    setIsFetching(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'content', 'samarambh', 'questions'));
      const blocks = [];
      querySnapshot.forEach((document) => blocks.push({ id: document.id, ...document.data() }));
      setSavedBlocks(blocks);
    } catch (error) {
      console.error("Error fetching blocks:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setStatusMsg('Saving to database...');
    try {
      let payload = {};
      if (uiType === 'mcq') payload = { question: mcqQuestion, options: mcqOptions.split(',').map(opt => opt.trim()), correct: mcqCorrect };
      else if (uiType === 'terminal_hack') payload = { consoleText: termLog, missionText: termMission, correct: termCorrect };

      await addDoc(collection(db, 'content', 'samarambh', 'questions'), { type: uiType, timeLimit: Number(timeLimit), payload: payload, createdAt: serverTimestamp() });
      
      setStatusMsg('✅ Block saved successfully!');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (error) {
      setStatusMsg('❌ Error saving block.');
    }
  };

  const handlePushToGlobal = async (block) => {
    setStatusMsg('Broadcasting to all devices...');
    try {
      await setDoc(doc(db, 'events', 'samarambh'), {
        status: 'playing',
        gameMode: broadcastMode,
        activeQuestion: block,
        timeRemaining: block.timeLimit,
        updatedAt: serverTimestamp()
      });
      setStatusMsg(`📡 LIVE: Pushed as ${broadcastMode.toUpperCase()} mode!`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setStatusMsg('❌ Failed to push.');
    }
  };

  // ==========================================
  // 🚀 THE LATENCY SCORING ENGINE (PRO GAMING MATH)
  // ==========================================
  const handleStopGame = async () => {
    if (!liveState?.activeQuestion) return; // Failsafe
    
    setStatusMsg('Halting game and calculating latency scores...');
    try {
      const qText = liveState.activeQuestion.payload.question || liveState.activeQuestion.payload.missionText;
      const currentMode = liveState.gameMode;
      const questionTimeLimit = liveState.activeQuestion.timeLimit || 20;
      
      // 1. Instantly lock the game so no more answers come in
      await setDoc(doc(db, 'events', 'samarambh'), {
        status: 'leaderboard', 
        gameMode: currentMode,
        activeQuestion: null, 
        updatedAt: serverTimestamp()
      });

      // 2. Fetch all CORRECT answers for this specific question
      const answersRef = collection(db, 'events', 'samarambh', 'answers');
      const q = query(answersRef, where("questionText", "==", qText), where("isCorrect", "==", true));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // 3. Prepare a Database Batch
        const batch = writeBatch(db);
        const pointsMap = {}; 

        // 4. Calculate Speed-Based Points Formula
        snapshot.forEach((docSnap) => {
          const ans = docSnap.data();
          const identifier = currentMode === 'team' ? ans.teamCode : ans.pin;
          
          if (identifier) {
            const timeTaken = ans.timeTaken || 0;
            const timeRemaining = Math.max(0, questionTimeLimit - timeTaken);
            
            // Formula: 500 base points + up to 500 speed bonus points based on latency
            const basePoints = 500;
            const speedBonus = Math.round(500 * (timeRemaining / questionTimeLimit));
            const earnedPoints = basePoints + speedBonus;

            pointsMap[identifier] = (pointsMap[identifier] || 0) + earnedPoints;
          }
        });

        // 5. Assign the points to the correct collection
        for (const [id, points] of Object.entries(pointsMap)) {
          if (currentMode === 'team') {
            const teamRef = doc(db, 'events', 'samarambh', 'teams', id);
            batch.update(teamRef, { totalScore: increment(points) });
          } else {
            const playerRef = doc(db, 'players', id);
            batch.update(playerRef, { score: increment(points) });
          }
        }

        // 6. Fire the updates!
        await batch.commit();
      }

      setStatusMsg('🛑 Game Stopped. Speed-Based Leaderboard Updated!');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setStatusMsg('❌ Failed to calculate scores. Check console.');
    }
  };

  const handleProjectorOverride = async (newStatus, overrideMode = 'solo') => {
    setStatusMsg(`Changing projector to ${newStatus}...`);
    try {
      await setDoc(doc(db, 'events', 'samarambh'), {
        status: newStatus, 
        gameMode: overrideMode,
        activeQuestion: null, 
        updatedAt: serverTimestamp()
      });
      setStatusMsg('✅ Projector updated successfully!');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (err) {
      setStatusMsg('❌ Failed to update projector.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-mono p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-red-500">⚙️ Admin Control Panel</h1>
          {statusMsg && <p className={statusMsg.includes('❌') ? "text-red-400 font-bold bg-red-900/50 px-4 py-2 rounded" : "text-green-400 font-bold bg-green-900/50 px-4 py-2 rounded"}>{statusMsg}</p>}
        </div>
        
        <div className="flex gap-4 mb-8 border-b border-gray-800 pb-4">
          <button onClick={() => setActiveTab('builder')} className={`px-4 py-2 ${activeTab === 'builder' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-gray-300'}`}>Game Builder (CMS)</button>
          <button onClick={() => setActiveTab('controller')} className={`px-4 py-2 ${activeTab === 'controller' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-gray-300'}`}>Live Event Controller</button>
        </div>

        {/* TAB 1: GAME BUILDER */}
        {activeTab === 'builder' && (
          <form onSubmit={handleSaveQuestion} className="bg-gray-900 border border-gray-700 p-6 rounded-lg">
            <h2 className="text-xl text-cyan-400 mb-6">Create New Content Block</h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2 uppercase">Block Type</label>
                <select value={uiType} onChange={(e) => setUiType(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white outline-none focus:border-red-500">
                  <option value="mcq">Standard MCQ (Quiz)</option>
                  <option value="terminal_hack">Terminal Log (Hack)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2 uppercase">Time Limit (Seconds)</label>
                <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white outline-none focus:border-red-500" />
              </div>
            </div>
            <hr className="border-gray-800 my-6" />

            {uiType === 'mcq' && (
              <div className="space-y-4">
                <div><label className="block text-gray-400 text-sm mb-2">Question Text</label><input type="text" value={mcqQuestion} onChange={e => setMcqQuestion(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white" placeholder="What is React?" required /></div>
                <div><label className="block text-gray-400 text-sm mb-2">Options (Comma separated)</label><input type="text" value={mcqOptions} onChange={e => setMcqOptions(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white" placeholder="Library, Framework, DB" required /></div>
                <div><label className="block text-gray-400 text-sm mb-2">Correct Answer</label><input type="text" value={mcqCorrect} onChange={e => setMcqCorrect(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white border-l-4 border-l-green-500" placeholder="Library" required /></div>
              </div>
            )}

            {uiType === 'terminal_hack' && (
              <div className="space-y-4">
                <div><label className="block text-gray-400 text-sm mb-2">Terminal Console Output</label><textarea value={termLog} onChange={e => setTermLog(e.target.value)} rows="5" className="w-full bg-black border border-gray-700 p-3 rounded text-green-400 font-mono" placeholder="root@server:~# ..." required /></div>
                <div><label className="block text-gray-400 text-sm mb-2">Mission Directive</label><input type="text" value={termMission} onChange={e => setTermMission(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white" required /></div>
                <div><label className="block text-gray-400 text-sm mb-2">Correct Answer</label><input type="text" value={termCorrect} onChange={e => setTermCorrect(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded text-white border-l-4 border-l-green-500" required /></div>
              </div>
            )}
            <button type="submit" className="mt-8 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded">Save to Database</button>
          </form>
        )}

        {/* TAB 2: LIVE CONTROLLER */}
        {activeTab === 'controller' && (
          <div className="space-y-6">
            
            {liveState?.status === 'playing' && (
              <div className="bg-red-950 border-2 border-red-500 p-6 rounded-lg flex justify-between items-center animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.2)]">
                <div>
                  <h2 className="text-red-400 font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                    Game is currently LIVE
                  </h2>
                  <p className="text-white text-sm">Students are submitting answers right now.</p>
                </div>
                <button 
                  onClick={handleStopGame}
                  className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-8 py-4 rounded uppercase tracking-widest text-lg shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                >
                  🛑 Stop & Calculate
                </button>
              </div>
            )}

            <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg">
              <h3 className="text-white font-bold mb-4 uppercase tracking-widest text-sm text-cyan-400">Stage Display Overrides</h3>
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => handleProjectorOverride('leaderboard', 'solo')} disabled={liveState?.status === 'playing'} className="bg-purple-900/50 hover:bg-purple-800 border border-purple-500 text-purple-300 disabled:opacity-50 font-bold py-3 rounded text-sm transition-colors">🏆 Force Solo Leaderboard</button>
                <button onClick={() => handleProjectorOverride('leaderboard', 'team')} disabled={liveState?.status === 'playing'} className="bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500 text-cyan-300 disabled:opacity-50 font-bold py-3 rounded text-sm transition-colors">🏆 Force Team Leaderboard</button>
                <button onClick={() => handleProjectorOverride('waiting', 'solo')} disabled={liveState?.status === 'playing'} className="bg-gray-800 hover:bg-gray-700 border border-gray-500 text-gray-300 disabled:opacity-50 font-bold py-3 rounded text-sm transition-colors">🔄 Reset to Standby</button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg">
              <div className="mb-6 p-4 bg-black border border-gray-700 rounded-lg flex justify-between items-center">
                <div>
                  <h3 className="text-white font-bold mb-1">Set Event Broadcast Mode</h3>
                  <p className="text-gray-500 text-xs">Determines how points are calculated.</p>
                </div>
                <div className="flex bg-gray-900 rounded p-1 border border-gray-700">
                  <button onClick={() => setBroadcastMode('solo')} className={`px-6 py-2 rounded font-bold text-sm transition-colors ${broadcastMode === 'solo' ? 'bg-cyan-600 text-black' : 'text-gray-400 hover:text-white'}`}>SOLO MODE</button>
                  <button onClick={() => setBroadcastMode('team')} className={`px-6 py-2 rounded font-bold text-sm transition-colors ${broadcastMode === 'team' ? 'bg-cyan-600 text-black' : 'text-gray-400 hover:text-white'}`}>TEAM MODE</button>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl text-cyan-400">Content Arsenal</h2>
                <button onClick={fetchBlocks} className="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded text-white border border-gray-600">🔄 Refresh List</button>
              </div>
              
              {isFetching ? (
                <p className="text-gray-500 text-center py-8">Accessing database...</p>
              ) : savedBlocks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No questions built yet.</p>
              ) : (
                <div className="space-y-4">
                  {savedBlocks.map((block) => {
                    const isLive = liveState?.status === 'playing' && liveState?.activeQuestion?.id === block.id;

                    return (
                      <div key={block.id} className={`p-4 rounded flex justify-between items-center transition-colors duration-300 ${isLive ? 'bg-red-950/40 border-2 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'bg-black border border-gray-700 hover:border-cyan-900'}`}>
                        <div className="flex items-center">
                          {isLive && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-4 shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>}
                          <span className={`text-xs px-2 py-1 rounded uppercase tracking-widest mr-3 ${isLive ? 'bg-red-900 text-red-200' : 'bg-gray-800 text-gray-300'}`}>{block.type}</span>
                          <span className={`font-bold ${isLive ? 'text-red-400' : 'text-white'}`}>{block.type === 'mcq' ? block.payload.question : block.payload.missionText}</span>
                        </div>
                        <button 
                          onClick={() => handlePushToGlobal(block)}
                          disabled={liveState?.status === 'playing'}
                          className={`font-bold px-6 py-2 rounded uppercase text-sm tracking-wider ${isLive ? 'bg-red-600 text-white cursor-not-allowed opacity-80' : liveState?.status === 'playing' ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-black'}`}
                        >
                          {isLive ? 'Currently Live' : 'Push to Screens'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}