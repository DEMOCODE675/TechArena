import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { GameContext } from '../../context/GameContext'; // <-- Import the live listener

// Import our Views
import PlayerLogin from './PlayerLogin';
import PlayerDashboard from './PlayerDashboard';
import TeamLobby from './TeamLobby';
import QuizUI from './components/QuizUI';
import TerminalUI from './components/TerminalUI'; 

export default function MobileController() {
  const { player } = useContext(AuthContext);
  const { gameState } = useContext(GameContext); // <-- Grab the global game state
  const [showTeamForm, setShowTeamForm] = useState(false);

  // 1. Not logged in? Show Login.
  if (!player) {
    return <PlayerLogin />;
  }

  // ==========================================
  // 🚀 THE COMPONENT REGISTRY (INTERCEPTOR)
  // If the host pushed a question, take over the screen!
  // ==========================================
  if (gameState?.status === 'playing' && gameState?.activeQuestion) {
    const block = gameState.activeQuestion;
    
    switch (block.type) {
  case 'mcq':
    return <QuizUI payload={block.payload} />;
  case 'terminal_hack':
    return <TerminalUI payload={block.payload} />; // <-- 2. Render it
  default:
    return <div className="min-h-screen bg-black text-red-500 p-8">Unknown Component Type!</div>;
}
  }

  // ==========================================
  // WAITING ROOM STATES (If game status is 'waiting')
  // ==========================================
  
  // 2. Already in a Team? Force them directly into their Team Room.
  if (player?.teamCode) {
    return <TeamLobby onBack={() => {}} />;
  }

  // 3. Clicked "Access Team Roster"? Show the Create/Join form.
  if (showTeamForm) {
    return <TeamLobby onBack={() => setShowTeamForm(false)} />;
  }

  // 4. Default Logged-In State: The Solo Dashboard
  return <PlayerDashboard onOpenTeam={() => setShowTeamForm(true)} />;
}