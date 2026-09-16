import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GameProvider } from './context/GameContext'; // <-- 1. Import this

import MobileController from './pages/mobile/MobileController';
import ProjectorView from './pages/projector/ProjectorView';
import AdminDashboard from './pages/admin/AdminDashboard';

function DevHome() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white font-mono">
      <h1 className="text-4xl font-bold text-cyan-400 mb-8">TechArena Dev Menu</h1>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Link to="/play" className="bg-gray-900 border border-cyan-500 p-4 rounded text-center hover:bg-gray-800">
          📱 Join as Player (/play)
        </Link>
        <Link to="/projector" className="bg-gray-900 border border-green-500 p-4 rounded text-center hover:bg-gray-800">
          📽️ Open Projector (/projector)
        </Link>
        <Link to="/admin" className="bg-gray-900 border border-red-500 p-4 rounded text-center hover:bg-gray-800">
          ⚙️ Admin Dashboard (/admin)
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GameProvider> {/* <-- 2. Wrap the router */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DevHome />} />
            <Route path="/play" element={<MobileController />} />
            <Route path="/projector" element={<ProjectorView />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </AuthProvider>
  );
}