import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Menu, X, LayoutDashboard, FolderKanban, Receipt, Users, LogOut, Shield, IndianRupee, FileText } from 'lucide-react';
import { VmsLogo } from './VmsLogo';
import GlobalCrmSearch from './GlobalCrmSearch';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, toggleRole } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);

  // We read the current hash to determine active tab for simplicity in this SPA
  const [currentHash, setCurrentHash] = React.useState(window.location.hash || '#dashboard');

  React.useEffect(() => {
    const onHashChange = () => setCurrentHash(window.location.hash || '#dashboard');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navItems = [
    { title: 'Dashboard', hash: '#dashboard', icon: <LayoutDashboard size={20} /> },
    { title: 'Projects', hash: '#projects', icon: <FolderKanban size={20} /> },
    { title: 'Invoices', hash: '#invoices', icon: <Receipt size={20} /> },
    { title: 'Leads', hash: '#leads', icon: <Users size={20} /> },
    { title: 'Expenditures', hash: '#expenditures', icon: <IndianRupee size={20} /> },
    { title: 'Doc Generator', hash: '#generator', icon: <FileText size={20} /> },
  ];

  if (currentUser?.role === 'ADMIN') {
    navItems.push({ title: 'Logs', hash: '#logs', icon: <Shield size={20} /> });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b-4 border-black bg-white z-20 shadow-md">
        <div className="flex items-center gap-2">
           <VmsLogo className="w-8 h-8" />
           <span className="heavy-text text-xl tracking-tighter uppercase">Inside VMS</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 active:translate-y-1 transition-transform border-2 border-black bg-[#E63946] text-white">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:static inset-y-0 left-0 w-64 bg-white border-r-4 border-black z-10 transform transition-transform duration-300 ease-in-out flex flex-col shadow-[8px_0_0_0_#000]
        ${menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 hidden md:block border-b-4 border-black overflow-hidden relative">
          <div className="relative z-10 flex flex-col items-start gap-2">
            <VmsLogo className="w-12 h-12" />
            <h1 className="heavy-text text-2xl uppercase tracking-tighter mix-blend-difference text-white">Inside VMS</h1>
            <span className="text-[10px] heavy-text tracking-widest bg-black text-white px-2 py-0.5 uppercase">Systems</span>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E63946] rounded-full -translate-y-1/2 translate-x-1/4 border-4 border-black z-0"></div>
        </div>

         <nav className="flex-1 p-4 space-y-2.5 overflow-y-auto">
          {navItems.map(item => {
            const active = currentHash === item.hash;
            return (
              <a
                key={item.hash}
                href={item.hash}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 heavy-text uppercase text-xs tracking-widest p-3 border-3 rounded-[14px] transition-all duration-200 ${active ? 'bg-[#FFB703] text-black border-black shadow-[3px_3px_0_0_#000] scale-[1.03] translate-x-1' : 'border-transparent text-gray-700 hover:border-black hover:bg-[#F4F4F0] hover:rounded-[14px]'}`}
              >
                <div className={active ? 'scale-110' : 'opacity-70'}>{item.icon}</div>
                {item.title}
              </a>
            );
          })}
        </nav>

        {/* User / Authentication Badge */}
        <div className="p-4 border-t-3 border-black bg-[#1D3557] text-white flex flex-col gap-3">
           <div className="text-sm heavy-text uppercase truncate flex items-center gap-2">
             <div className="w-8 h-8 bg-[#E63946] border-2 border-black flex items-center justify-center text-white shrink-0 rounded-full">
               {currentUser?.name?.charAt(0)}
             </div>
             {currentUser?.name}
           </div>
           <button
              onClick={toggleRole}
              className="flex items-center justify-between p-2 mb-1 border-2 border-white/20 hover:border-white transition-colors rounded-[10px]"
           >
              <span className="text-xs heavy-text flex items-center gap-2"><Shield size={14} className="opacity-70"/> {currentUser?.role}</span>
              <span className="text-[10px] heavy-text uppercase bg-white text-[#1D3557] px-1.5 py-0.5 rounded-[6px]">Switch</span>
           </button>
           <button onClick={logout} className="flex flex-row items-center gap-2 text-sm heavy-text uppercase hover:text-[#FFB703] transition-colors w-full justify-start border-t border-white/20 pt-3">
             <LogOut size={18} /> Logout
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative z-0 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-dashed border-gray-200 pb-4 shrink-0">
          <GlobalCrmSearch />
          
          <div className="hidden sm:flex items-center gap-2 font-mono text-[9px] text-gray-400 bg-gray-50 border border-black/5 px-3 py-1.5 rounded-[10px]">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>SYSTEM STATE: ACTIVE CRM GRID READY</span>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </main>
      
      {/* Mobile overlay */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} className="fixed inset-0 bg-black/50 z-0 md:hidden backdrop-blur-sm" />
      )}
    </div>
  );
}
