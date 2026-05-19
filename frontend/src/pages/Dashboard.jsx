import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../api_config';
import {
  Plus, Code2, TrendingUp, AlertTriangle,
  CheckCircle2, ArrowRight, Clock, Loader2, Sparkles, RotateCcw, Target
} from 'lucide-react';
import { getUserId } from '../utils/user';
const langBadge = (lang) => {
  const map = {
    python:     'bg-indigo-500/20 text-indigo-400 border-indigo-500/20',
    javascript: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    java:       'bg-amber-500/15  text-amber-400  border-amber-500/20',
    cpp:        'bg-blue-500/15   text-blue-400   border-blue-500/20',
  };
  return map[lang?.toLowerCase()] ?? 'bg-slate-700 text-slate-400 border-slate-600';
};

const scoreColor = (s) =>
  s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : 'text-rose-400';

const formatDate = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
};

// ─── Animated number ──────────────────────────────────────────────────────────
const AnimNum = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 25);
    const id = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(id); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(id);
  }, [value]);
  return <>{display}</>;
};

// ─── Metric Card ─────────────────────────────────────────────────────────────
const MetricCard = ({ label, value, sub, icon, color }) => (
  <div className="bg-surface/80 border border-white/5 p-6 rounded-2xl flex justify-between items-center transition-all hover:bg-surface hover:border-white/10 group">
    <div>
      <p className="text-[11px] uppercase font-bold text-slate-500 mb-2 tracking-wider">{label}</p>
      <h3 className="text-3xl font-bold text-white">
        <AnimNum value={typeof value === 'number' ? value : 0} />
        {sub && <span className="text-lg text-slate-500 ml-1">{sub}</span>}
      </h3>
    </div>
    <div className={`p-3 rounded-xl ${color} transition-transform group-hover:scale-110`}>
      {icon}
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = getUserId();
      const res = await axios.get(`${API_BASE}/history`, {
        params: { user_id: userId }
      });
      // newest first
      const list = (res.data?.history ?? []).slice().reverse();
      setReviews(list);
    } catch {
      setError('Could not load history. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  // ── Derived metrics ──────────────────────────────────────────────────────
  const total    = reviews.length;
  const avgQ     = total ? Math.round(reviews.reduce((s, r) => s + (r.scores?.quality ?? 0), 0) / total) : 0;
  const issues   = reviews.reduce((s, r) => s + (r.feedback?.length ?? 0), 0);
  const recent   = reviews.slice(0, 5);

  // Blind spot analytics
  let docsIssues = 0, syntaxIssues = 0, perfIssues = 0, secIssues = 0;
  reviews.forEach(r => {
    (r.feedback || []).forEach(f => {
       const msg = (f.message || "").toLowerCase();
       if (msg.includes("docstring") || msg.includes("comment")) docsIssues++;
       else if (msg.includes("syntax") || msg.includes("semicolon") || msg.includes("var")) syntaxIssues++;
       else if (msg.includes("loop") || msg.includes("o(n") || msg.includes("time complexity")) perfIssues++;
       else if (msg.includes("exploit") || msg.includes("injection") || msg.includes("xss")) secIssues++;

    });
  });


  return (
    <div className="flex flex-col space-y-8 animate-fade-in pb-10">

      {/* Header */}
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1.5 tracking-tight">Dashboard</h2>
          <p className="text-slate-400 text-sm font-medium">AI-powered code analysis at your fingertips</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistory}
            className="p-2 rounded-xl hover:bg-surface text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={() => navigate('/new')}
            className="bg-primary hover:bg-primaryHover text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> New Review
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-5">
        <MetricCard
          label="Total Reviews" value={total}
          icon={<Code2 size={26} className="text-primary" />}
          color="bg-primary/10"
        />
        <MetricCard
          label="Avg Quality" value={avgQ} sub="/100"
          icon={<TrendingUp size={26} className="text-emerald-400" />}
          color="bg-emerald-500/10"
        />
        <MetricCard
          label="Issues Found" value={issues}
          icon={<AlertTriangle size={26} className="text-amber-400" />}
          color="bg-amber-500/10"
        />
        <MetricCard
          label="Completed" value={total}
          icon={<CheckCircle2 size={26} className="text-emerald-400" />}
          color="bg-emerald-500/10"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Blind Spot Analytics (Moved to top/left) */}
        <div className="col-span-1 bg-surface/80 border border-white/5 rounded-2xl flex flex-col p-6">
          <div className="flex items-center gap-2 mb-4">
             <Target size={20} className="text-indigo-400" />
             <h3 className="text-lg font-bold text-white">Blind Spots</h3>
          </div>
          <p className="text-xs text-slate-400 mb-6 font-medium">Auto-analyzed weak areas from your past reviews.</p>
          
          <div className="flex flex-col gap-4">
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-300"><span>Performance & Big-O</span><span className="text-rose-400">{perfIssues} hits</span></div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden"><div className="bg-rose-500 h-2" style={{width: `${Math.min(100, perfIssues*10)}%`}}></div></div>
             </div>
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-300"><span>Security Vulnerabilities</span><span className="text-amber-400">{secIssues} hits</span></div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden"><div className="bg-amber-500 h-2" style={{width: `${Math.min(100, secIssues*15)}%`}}></div></div>
             </div>
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-300"><span>Best Practices & Docs</span><span className="text-blue-400">{docsIssues} hits</span></div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden"><div className="bg-blue-500 h-2" style={{width: `${Math.min(100, docsIssues*8)}%`}}></div></div>
             </div>
             <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-300"><span>Syntax & Scope</span><span className="text-emerald-400">{syntaxIssues} hits</span></div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden"><div className="bg-emerald-500 h-2" style={{width: `${Math.min(100, syntaxIssues*5)}%`}}></div></div>
             </div>
          </div>
        </div>

        {/* Recent Reviews Panel (Moved to bottom/right) */}
        <div className="col-span-2 bg-surface/80 border border-white/5 rounded-2xl flex flex-col pt-6 pb-2">
          <div className="px-6 flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Recent Reviews</h3>
            <button
              onClick={() => navigate('/history')}
              className="text-[13px] font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-14 gap-3 text-slate-500">
              <Loader2 size={20} className="animate-spin" /> Loading reviews…
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center py-12 gap-3">
              <p className="text-rose-400 text-sm font-medium">{error}</p>
              <button onClick={fetchHistory} className="btn-ghost text-sm border border-slate-700">
                <RotateCcw size={14} /> Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && recent.length === 0 && (
            <div className="flex flex-col items-center py-14 gap-4">
              <Sparkles size={36} className="text-slate-700" />
              <p className="text-slate-500 font-medium">No reviews yet — start your first one!</p>
              <button onClick={() => navigate('/new')} className="btn-primary text-sm px-5 py-2">
                <Plus size={15} /> New Review
              </button>
            </div>
          )}

          {/* List */}
          {!loading && !error && recent.length > 0 && (
            <div className="flex flex-col">
              {recent.map((review, idx) => {
                const score = review.scores?.quality ?? 0;
                const date  = formatDate(review.timestamp);
                const lang  = review.language ?? 'unknown';
                return (
                  <div
                    key={review.id ?? idx}
                    onClick={() => navigate('/results', { state: { result: review } })}
                    className="flex items-center justify-between py-4 px-6 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Code2 size={20} className="text-primary stroke-[2]" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[15px] font-bold text-slate-100 capitalize">{lang === 'cpp' ? 'C++' : lang} review</span>
                        <div className="flex text-[11px] font-semibold items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded-full border ${langBadge(lang)}`}>{lang === 'cpp' ? 'C++' : lang}</span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock size={12} className="stroke-[2.5]" /> {date}
                          </span>
                          <span className="text-slate-600">{review.feedback?.length ?? 0} issues</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      <span className={`font-black font-mono text-xl ${scoreColor(score)}`}>{score}</span>
                      <span className="text-[11px] font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                        completed
                      </span>
                      <ArrowRight size={16} className="text-slate-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
