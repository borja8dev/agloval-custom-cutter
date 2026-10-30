import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { useCustomerSession } from './hooks/useCustomerSession';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { CuttingCalculator } from './pages/CuttingCalculator';
import { QuoteHistoryPage } from './pages/QuoteHistoryPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import './styles/globals.css';

const firstName = (name: string) => name.trim().split(/\s+/)[0];

const NotFound: React.FC = () => {
  useDocumentTitle('Página no encontrada · Agloval');
  return (
    <section
      aria-labelledby="not-found-title"
      className="max-w-xl mx-auto px-4 py-16 text-center space-y-4"
    >
      <h2 id="not-found-title" className="text-2xl font-bold text-gray-900">
        Esta página no existe
      </h2>
      <Link
        to="/"
        className="inline-block bg-brand-dark text-white font-semibold rounded-full px-5 py-2 hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Volver al gestor
      </Link>
    </section>
  );
};

// Layout shared by every page: header (with the customer's session), content and footer.
export const App: React.FC = () => {
  const session = useCustomerSession();

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        actions={
          session.customer && (
            <div className="flex items-center gap-2 bg-white text-brand-dark rounded-full pl-4 pr-1 py-1 text-sm">
              <span className="font-semibold">Hola, {firstName(session.customer.name)}</span>
              <button
                type="button"
                onClick={session.logout}
                className="rounded-full bg-brand-light px-3 py-1 font-medium hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark"
              >
                Cerrar sesión
              </button>
            </div>
          )
        }
      />

      <main>
        <Routes>
          <Route path="/" element={<CuttingCalculator session={session} />} />
          <Route path="/presupuestos" element={<QuoteHistoryPage />} />
          <Route path="/pedidos" element={<OrderHistoryPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

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
