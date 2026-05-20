import React from 'react';
import { NavLink } from 'react-router-dom';
import { Code2, Zap, GitBranch, Globe, Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full mt-10 border-t border-white/5 bg-background/80 backdrop-blur-sm z-10">
      <div className="max-w-[1800px] mx-auto px-6 md:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

          {/* Brand */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <span className="text-white font-black tracking-tight text-sm">MarroeCode</span>
              <span className="text-[9px] uppercase tracking-[0.18em] font-bold text-slate-600 border border-white/10 px-2 py-0.5 rounded-full">
                Online Compiler
              </span>
            </div>
            <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed">
              Free online compiler for Python, Java, JavaScript, C++, and C with real-time AI code review.
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <NavLink to="/" className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 uppercase tracking-widest">
              <Code2 size={11} /> Compiler
            </NavLink>
            <NavLink to="/new" className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 uppercase tracking-widest">
              <Zap size={11} /> Review
            </NavLink>
            <NavLink to="/history" className="text-[11px] font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-1.5 uppercase tracking-widest">
              <GitBranch size={11} /> History
            </NavLink>
          </div>

          {/* Credits */}
          <div className="flex flex-col items-end gap-1">
            <p className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
              Built with ❤️ by
              <span className="text-white font-bold hover:text-primary transition-colors cursor-pointer">
                Ganesh Bobbala
              </span>
            </p>
            <p className="text-slate-700 text-[10px] uppercase tracking-[0.15em] font-black">
              © {new Date().getFullYear()} MarroeCode — All rights reserved
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
