import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';

export default function TeamLobby({ onBack }) { // <-- Add { onBack } here
  const { player } = useContext(AuthContext);

  const [joinCode, setJoinCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Live state for the team room
  const [activeTeam, setActiveTeam] = useState(null);
  const [roster, setRoster] = useState([]);

  // Listen for team updates if the player is in a team
  useEffect(() => {
    if (!player?.teamCode) return;

    // 1. Listen to the Team Document
    const teamRef = doc(db, 'events', 'samarambh', 'teams', player.teamCode);
    const unsubscribeTeam = onSnapshot(teamRef, (docSnap) => {
      if (docSnap.exists()) setActiveTeam(docSnap.data());
    });

    // 2. Listen to all players who have this teamCode
    const playersRef = collection(db, 'players');
    const q = query(playersRef, where("teamCode", "==", player.teamCode));
    const unsubscribeRoster = onSnapshot(q, (querySnapshot) => {
      const teammates = [];
      querySnapshot.forEach((doc) => teammates.push(doc.data()));
      setRoster(teammates);
    });

    return () => {
      unsubscribeTeam();
      unsubscribeRoster();
    };
  }, [player?.teamCode]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (teamName.length < 3) throw new Error("Team name too short.");

      // Generate a random 4-letter code (e.g., "XR4B")
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      // Create the team in Firestore
      const teamRef = doc(db, 'events', 'samarambh', 'teams', code);
      await setDoc(teamRef, {
        teamName: teamName,
        teamCode: code,
        leaderPin: player.pin,
        totalScore: 0,
        createdAt: new Date()
      });

      // Update the player's profile to link them to this team
      const playerRef = doc(db, 'players', player.pin);
      await updateDoc(playerRef, { teamCode: code, isLeader: true });

      // Force local reload to trigger the useEffect listener (in a real app, AuthContext would update this)
      window.location.reload(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const code = joinCode.toUpperCase();
      const teamRef = doc(db, 'events', 'samarambh', 'teams', code);
      const docSnap = await getDoc(teamRef);

      if (!docSnap.exists()) throw new Error("Team code not found.");

      // Link player to the team
      const playerRef = doc(db, 'players', player.pin);
      await updateDoc(playerRef, { teamCode: code, isLeader: false });

      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // VIEW 1: THE WAITING ROOM (If player is already in a team)
  if (player?.teamCode && activeTeam) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col items-center p-6 pt-12">
        <h2 className="text-gray-400 text-sm uppercase tracking-widest">Team</h2>
        <h1 className="text-4xl font-bold text-cyan-400 mt-2 mb-8">{activeTeam.teamName}</h1>
        
        <div className="w-full max-w-md border-2 border-dashed border-green-700 bg-green-950/20 p-6 rounded-xl text-center mb-8">
          <p className="text-gray-400 mb-2">Invite Code:</p>
          <p className="text-5xl font-extrabold text-green-400 tracking-[0.2em]">{activeTeam.teamCode}</p>
        </div>

        <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
            <span className="font-bold text-white">Roster</span>
            <span className="text-cyan-400 text-sm">{roster.length} / 5</span>
          </div>
          <ul className="divide-y divide-gray-800">
            {roster.map((member) => (
              <li key={member.pin} className="p-4 flex items-center text-gray-300">
                <span className="mr-3">{member.isLeader ? '👑' : '👤'}</span>
                {member.name} {member.pin === player.pin && "(You)"}
              </li>
            ))}
          </ul>
        </div>
        
        <p className="mt-8 text-yellow-400 animate-pulse">Waiting for host to start...</p>
      </div>
    );
  }

  // VIEW 2: CREATE OR JOIN (If player has no team)
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-8">Join the Arena</h1>
      
      <div className="w-full max-w-sm space-y-8">
        {/* Create Team Form */}
        <form onSubmit={handleCreateTeam} className="bg-gray-900 border border-green-800 p-6 rounded shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <h2 className="text-white font-bold mb-4 uppercase">Create a Team</h2>
          <input 
            type="text" 
            placeholder="Team Name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full bg-black border border-green-600 focus:border-cyan-400 outline-none px-4 py-2 text-white rounded mb-4"
            required
          />
          <button disabled={loading} type="submit" className="w-full bg-green-600 text-black font-bold py-2 rounded hover:bg-green-500">
            Generate Code
          </button>
        </form>

        <div className="text-center text-gray-500 uppercase tracking-widest text-sm">- OR -</div>

        {/* Join Team Form */}
          <form onSubmit={handleJoinTeam} className="bg-gray-900 border border-cyan-800 p-6 rounded shadow-[0_0_15px_rgba(34,211,153,0.1)]">
            <h2 className="text-white font-bold mb-4 uppercase">Join with Code</h2>
            <input 
              type="text" 
              placeholder="4-Letter Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="w-full bg-black border border-cyan-600 focus:border-cyan-400 outline-none px-4 py-2 text-white rounded mb-4 text-center uppercase tracking-widest font-bold text-xl"
              maxLength={4}
              required
            />
            <button disabled={loading} type="submit" className="w-full bg-cyan-600 text-black font-bold py-2 rounded hover:bg-cyan-500">
              Join Squad
            </button>
          </form>
          {error && <p className="text-red-500 text-center">{error}</p>}
        <button onClick={onBack} className="w-full text-center mt-6 text-gray-500 hover:text-cyan-400 text-sm underline decoration-gray-700 underline-offset-4">
          Back to Dashboard
        </button>
      </div>  
        {error && <p className="text-red-500 text-center">{error}</p>}
      </div>
  );
}