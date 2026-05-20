import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Code2, Sparkles, BookOpen, GitBranch, Zap, Globe, ChevronDown } from 'lucide-react';
import logo from '../assets/logo.png';

const LANGUAGES = [
  { name: 'Python', color: '#f59e0b' },
  { name: 'Java', color: '#f87171' },
  { name: 'JavaScript', color: '#facc15' },
  { name: 'C++', color: '#60a5fa' },
  { name: 'C', color: '#94a3b8' },
];

const Navbar = () => {
  const [langOpen, setLangOpen] = useState(false);

  return (
    <header className="flex justify-between items-center w-full py-3 px-6 border-b border-white/5 bg-background/95 backdrop-blur-md sticky top-0 z-50">
      {/* Brand */}
      <NavLink to="/" className="flex items-center gap-3 group cursor-pointer select-none">
        <div className="w-9 h-9 p-1 bg-primary/15 rounded-xl overflow-hidden flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-all">
          <img src={logo} alt="MarroeCode Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
            MarroeCode
            <Sparkles size={12} className="text-primary opacity-80" />
          </span>
          <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-slate-500">Online Compiler</span>
        </div>
      </NavLink>

      {/* Language pills - desktop */}
      <div className="hidden md:flex items-center gap-1.5 bg-white/3 border border-white/5 rounded-xl px-2.5 py-1.5">
        {LANGUAGES.map(lang => (
          <span
            key={lang.name}
            className="text-[10px] font-black px-2.5 py-1 rounded-lg transition-all cursor-default"
            style={{ color: lang.color, background: `${lang.color}15` }}
          >
            {lang.name}
          </span>
        ))}
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-2">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`
          }
        >
          <Code2 size={14} />
          Compiler
        </NavLink>

        <NavLink
          to="/new"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`
          }
        >
          <Zap size={14} />
          Review
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) =>
            `hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`
          }
        >
          <GitBranch size={14} />
          History
        </NavLink>

        {/* Free badge */}
        <div className="ml-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
            <Globe size={10} />
            Free
          </span>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
