import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../api_config';
import {
  Search, Plus, Code2, ArrowRight, Filter,
  Loader2, Sparkles, RotateCcw, Clock,
  CheckCircle2, AlertCircle, AlertTriangle
} from 'lucide-react';
import { getUserId } from '../utils/user';



const langBadge = (lang) => {
  const map = {
    python:     'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
    javascript: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    java:       'bg-amber-500/15  text-amber-400  border-amber-500/20',
    cpp:        'bg-blue-500/15   text-blue-400   border-blue-500/20',
  };
  return map[lang?.toLowerCase()] ?? 'bg-slate-700 text-slate-300 border-slate-600';
};

const scoreColor = (s) =>
  s >= 80 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : 'text-rose-400';

const scoreBg = (s) =>
  s >= 80 ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
  : s >= 60 ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
  : 'bg-rose-500/10 border-rose-500/25 text-rose-400';

const formatDate = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
};

const LANG_OPTIONS = ['All', 'python', 'javascript', 'java', 'c++', 'c'];

const History = () => {
  const navigate = useNavigate();
  const [reviews, setReviews]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [langFilter, setLangFilter] = useState('All');

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = getUserId();
      const res = await axios.get(`${API_BASE}/history`, {
        params: { user_id: userId }
      });
      const list = (res.data?.history ?? []).slice().reverse();
      setReviews(list);
    } catch {
      setError('Could not load history. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const filtered = reviews.filter(r => {
    const matchLang   = langFilter === 'All' || r.language?.toLowerCase() === langFilter;
    const matchSearch = !search || r.language?.toLowerCase().includes(search.toLowerCase())
      || r.feedback?.some(f => f.message?.toLowerCase().includes(search.toLowerCase()));
    return matchLang && matchSearch;
  });

  return (
    <div className="flex flex-col space-y-6 animate-fade-in pb-10">

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1.5 tracking-tight">Review History</h2>
          <p className="text-slate-400 text-sm">
            {loading ? 'Loading…' : `${filtered.length} of ${reviews.length} reviews`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistory}
            className="p-2 rounded-xl hover:bg-surface text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RotateCcw size={16} />
          </button>
          <button onClick={() => navigate('/new')} className="btn-primary py-2.5 px-5">
            <Plus size={16} /> New Review
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 glass-panel px-4 py-3 flex items-center gap-3">
          <Search size={17} className="text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search reviews by language or issue…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none text-white outline-none w-full placeholder-slate-600 font-medium text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
          )}
        </div>

        {/* Language Filter Dropdown */}
        <div className="relative">
          <select
            value={langFilter}
            onChange={e => setLangFilter(e.target.value)}
            className="glass-panel px-4 py-3 pr-8 text-sm font-semibold text-white appearance-none cursor-pointer outline-none border border-slate-700 hover:border-slate-500 transition-colors rounded-xl bg-surface/80"
          >
            {LANG_OPTIONS.map(l => (
              <option key={l} value={l} className="bg-slate-900">{l === 'All' ? 'All Languages' : l === 'cpp' ? 'C++' : l}</option>
            ))}
          </select>
          <Filter size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 size={22} className="animate-spin" /> Loading history…
        </div>
      )}

      {!loading && error && (
        <div className="glass-panel p-10 flex flex-col items-center gap-4">
          <AlertCircle size={36} className="text-rose-400" />
          <p className="text-rose-400 font-medium">{error}</p>
          <button onClick={fetchHistory} className="btn-primary text-sm">
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="glass-panel p-14 flex flex-col items-center gap-4">
          <Sparkles size={40} className="text-slate-700" />
          <p className="text-slate-500 font-medium text-base">
            {reviews.length === 0 ? 'No reviews yet — submit your first code review!' : 'No results match your search.'}
          </p>
          {reviews.length === 0 && (
            <button onClick={() => navigate('/new')} className="btn-primary px-5 py-2.5">
              <Plus size={15} /> New Review
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((review, idx) => {
            const score  = review.scores?.quality ?? 0;
            const lang   = review.language ?? 'unknown';
            const issues = review.feedback?.length ?? 0;
            const errors = review.feedback?.filter(f => f.type?.toLowerCase() === 'error').length ?? 0;
            const date   = formatDate(review.timestamp);

            return (
              <div
                key={review.id ?? idx}
                onClick={() => navigate('/results', { state: { result: review } })}
                className="glass-panel p-5 px-6 flex items-center justify-between hover:border-slate-500 cursor-pointer transition-all group"
              >
                {/* Left: icon + info */}
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-surface border border-slate-700 rounded-xl group-hover:border-primary/40 transition-colors">
                    <Code2 size={22} className="text-indigo-400" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-white font-semibold text-[15px] capitalize">{lang === 'cpp' ? 'C++' : lang} review</span>
                    <div className="flex items-center gap-2.5 text-xs font-medium flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full border ${langBadge(lang)}`}>{lang === 'cpp' ? 'C++' : lang}</span>
                      {review.is_practice && (
                        <span className="px-2.5 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 flex items-center gap-1">
                          <Sparkles size={10} /> Practice
                        </span>
                      )}
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock size={11} /> {date}
                      </span>
                      {errors > 0 ? (
                        <span className="flex items-center gap-1 text-rose-400">
                          <AlertCircle size={11} /> {errors} error{errors > 1 ? 's' : ''}
                        </span>
                      ) : issues > 0 ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <AlertTriangle size={11} /> {issues} issue{issues > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 size={11} /> Clean
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: score + status */}
                <div className="flex items-center gap-5 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-black font-mono text-2xl ${scoreColor(score)}`}>{score}</span>
                    <span className="text-[10px] text-slate-600 font-medium">Quality score</span>
                  </div>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${scoreBg(score)}`}>
                    {score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'Poor'}
                  </span>
                  <ArrowRight size={18} className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
