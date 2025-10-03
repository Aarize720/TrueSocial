// Layout principal de l'application
import React from 'react';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mobile */}
      <div className="lg:hidden">
        <Header />
      </div>

      <div className="flex">
        {/* Sidebar desktop */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Contenu principal */}
        <main className="flex-1 lg:ml-64">
          <div className="px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Navigation mobile */}
      <div className="lg:hidden">
        <MobileNavigation />
      </div>
    </div>
  );
};