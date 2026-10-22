import React from 'react';
import { CuttingCalculator } from './pages/CuttingCalculator';
import './styles/globals.css';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <CuttingCalculator />

      <footer className="bg-gray-900 text-gray-400 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          <p>Aglomerados Valencia S.L. · Gestor de pedidos</p>
          <p className="mt-1">© {new Date().getFullYear()} Agloval</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
