import React from 'react';

const StyleTest = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="glass-card max-w-md">
        <h1 className="text-3xl font-bold text-white mb-4">
          Style Test
        </h1>
        <p className="text-gray-300 mb-6">
          If you can see this glassmorphism card with proper styling, Tailwind CSS is working correctly!
        </p>
        
        <div className="space-y-4">
          <button className="glass-button w-full bg-primary-600 hover:bg-primary-700">
            Primary Button
          </button>
          
          <input 
            type="text" 
            placeholder="Test input field"
            className="glass-input"
          />
          
          <div className="glass p-4 rounded-lg">
            <p className="text-primary-400">✅ Glassmorphism working!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StyleTest; 