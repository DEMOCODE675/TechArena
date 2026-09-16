import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function PlayerLogin() {
  const { registerNewPlayer, signInWithPin } = useContext(AuthContext);
  
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isReturningUser) {
        await signInWithPin(inputValue);
      } else {
        if (inputValue.length < 2) throw new Error("Name is too short");
        await registerNewPlayer(inputValue);
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-cyan-400 mb-2 tracking-wider">TechArena</h1>
          <p className="text-gray-400 uppercase tracking-widest text-xs">Awaiting Connection...</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border-2 border-green-800 p-6 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.15)]">
          
          <label className="block text-sm mb-2 text-green-300 uppercase tracking-wide">
            {isReturningUser ? 'Enter 4-Digit PIN' : 'Enter Your Alias'}
          </label>
          
          <input 
            type={isReturningUser ? "number" : "text"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isReturningUser ? "e.g. 8392" : "HackerCat99"}
            className="w-full bg-black border border-green-600 focus:border-cyan-400 outline-none px-4 py-3 text-white rounded mb-4 text-center text-lg"
            autoComplete="off"
            required
          />

          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full bg-green-600 text-black font-bold py-3 rounded hover:bg-green-500 transition-colors uppercase">
            {isSubmitting ? 'Connecting...' : 'Initialize Session'}
          </button>
        </form>

        <button 
          onClick={() => { setIsReturningUser(!isReturningUser); setInputValue(''); setError(''); }}
          className="w-full text-center mt-6 text-gray-500 hover:text-cyan-400 text-sm underline decoration-gray-700 underline-offset-4"
        >
          {isReturningUser ? "Wait, I need to register a new name." : "I already have a PIN code."}
        </button>
      </div>
    </div>
  );
}