import React from 'react';
import { NavLink } from 'react-router-dom';
import { Code2, Sparkles, LayoutDashboard, History, User } from 'lucide-react';
import logo from '../assets/logo.png';
import { getUserId } from '../utils/user';

const Navbar = () => {
  const userId = getUserId();
  
  return (
    <header className="flex justify-between items-center w-full py-4 px-8 border-b border-white/5 bg-background">
      {/* Brand logo left */}
      <div className="flex items-center gap-3 group cursor-pointer select-none">
        <div className="w-10 h-10 p-1 bg-primary/10 rounded-xl overflow-hidden flex items-center justify-center">
          <img src={logo} alt="MarroeCode Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl font-bold text-white flex gap-2 items-center tracking-tight">
          MarroeCode
          <Sparkles size={16} className="text-accent opacity-80" />
        </h1>
      </div>

      {/* Navigation center-right */}
      <nav className="flex items-center gap-6">
        <NavLink 
          to="/" 
          className={({ isActive }) => 
            `flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-sm ${
              isActive ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-500 hover:text-white'
            }`
          }
        >
          <Code2 size={18} />
          Practice
        </NavLink>
      </nav>
    </header>
  );
};

export default Navbar;
