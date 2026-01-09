
import React, { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  currentStep?: string;
  viewMode: 'calculator' | 'knowledge';
  onViewModeChange: (mode: 'calculator' | 'knowledge') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, sidebarContent, currentStep, viewMode, onViewModeChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] text-[#1F2937]">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-80' : 'w-0'
        } fixed md:relative z-40 transition-all duration-300 ease-in-out bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden shadow-2xl md:shadow-none`}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600">
          <h1 className="text-xl font-bold text-white malayalam tracking-tight">
            Faraid Malayalam
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/80 hover:text-white">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-4 space-y-3 shrink-0">
          <button 
            onClick={() => { onViewModeChange('calculator'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all malayalam font-semibold ${viewMode === 'calculator' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-2 ring-emerald-500/20' : 'bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'}`}
          >
            <div className={`p-2 rounded-lg ${viewMode === 'calculator' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            കാൽക്കുലേറ്റർ
          </button>
          <button 
            onClick={() => { onViewModeChange('knowledge'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all malayalam font-semibold ${viewMode === 'knowledge' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 ring-2 ring-amber-500/20' : 'bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700'}`}
          >
            <div className={`p-2 rounded-lg ${viewMode === 'knowledge' ? 'bg-white/20' : 'bg-amber-100 text-amber-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            അറിവുകൾ
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
          {sidebarContent}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] relative overflow-hidden">
        <header className="h-16 border-b border-slate-200 flex items-center px-6 justify-between bg-white/90 backdrop-blur-xl sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-emerald-50 rounded-xl transition-all text-emerald-600 active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-slate-800 hidden sm:block malayalam">
              {viewMode === 'calculator' ? 'ഫറായിദ് അസിസ്റ്റന്റ്' : 'വിവരശേഖരം'}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
             {viewMode === 'calculator' && (
               <div className="hidden md:flex items-center gap-3">
                 {[1, 2, 3, 4].map((s) => (
                   <div key={s} className={`h-2 rounded-full transition-all duration-500 ${currentStep === s.toString() ? 'bg-gradient-to-r from-amber-400 to-amber-600 w-12 shadow-md shadow-amber-200' : 'bg-slate-200 w-6'}`} />
                 ))}
               </div>
             )}
            <div className="flex items-center gap-2.5 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg shadow-emerald-200 border border-white/20">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider">Assistant Live</span>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full pb-20">
            {children}
          </div>
        </section>

        {/* Decorative Background Patterns - More Colourful */}
        <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-emerald-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50rem] h-[50rem] bg-amber-400/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-[30%] left-[10%] w-[20rem] h-[20rem] bg-blue-400/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[15%] w-[30rem] h-[30rem] bg-pink-400/5 rounded-full blur-[130px] pointer-events-none" />
      </main>
    </div>
  );
};

export default Layout;
