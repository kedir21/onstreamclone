
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home' },
    { id: 'movies', icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 00-1 1z', label: 'Movies' },
    { id: 'tv', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'TV Shows' },
    { id: 'watchlist', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z', label: 'Watchlist' },
    { id: 'search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', label: 'Search' }
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-inter flex-col">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-black scroll-smooth relative pb-24">
        <div className="max-w-[1440px] mx-auto min-h-full bg-gradient-to-b from-[#0a0a0a] to-[#050505] relative">
          {children}
        </div>
      </main>

      {/* Mobile-First Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl flex items-center justify-around border-t border-white/5 z-[90] safe-area-bottom">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-1.5 flex-1 h-full transition-all duration-300 relative ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-500'}`}
          >
            {activeTab === tab.id && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-b-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
            )}
            <svg className={`w-6 h-6 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === tab.id ? 2.5 : 2} d={tab.icon} />
            </svg>
            <span className={`text-[10px] font-black uppercase tracking-tight transition-all ${activeTab === tab.id ? 'opacity-100' : 'opacity-70 text-[9px]'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
