import React from 'react';
import { CuttingCalculator } from './pages/CuttingCalculator';
import './styles/globals.css';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CuttingCalculator />

      <div className="bg-gray-900 text-gray-400 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p>Agloval Custom Cutting Calculator - Portfolio Project by Borja8dev</p>
          <p className="mt-1">Built with React, TypeScript, and Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
};

export default App;
