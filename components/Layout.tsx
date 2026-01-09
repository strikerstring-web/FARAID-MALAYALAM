
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-2xl mx-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
