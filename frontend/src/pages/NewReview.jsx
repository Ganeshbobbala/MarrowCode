import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../api_config';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Upload, GitBranch, Sparkles, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';
import { getUserId } from '../utils/user';

const NewReview = () => {
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('python');
    const [title, setTitle] = useState('');
    const [mode, setMode] = useState('Beginner');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);

    const handleAnalyze = async () => {
        if (!code.trim()) return;
        setIsAnalyzing(true);
        setError(null);
        try {
          const userId = getUserId();
          const response = await axios.post(`${API_BASE}/analyze`, {
            code,
            language,
            user_id: userId
          });
          // Navigate to the Results page, passing the full result as route state
          navigate('/results', { state: { result: response.data } });
        } catch (err) {
          console.error(err);
          setError(err.response?.data?.detail || 'Failed to connect to backend.');
        } finally {
          setIsAnalyzing(false);
        }
    };

    const linesCount = code.split('\n').length || 1;

    return (
        <div className="flex flex-col space-y-6 animate-fade-in pb-10 h-[calc(100vh-140px)]">
            {/* Header section */}
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-surface rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} className="text-slate-400 hover:text-white" />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">New Code Review</h2>
                    <p className="text-slate-400 mt-1">Paste your code and let AI analyze it</p>
                </div>
            </div>

            {/* Split Content */}
            <div className="flex gap-6 h-full flex-grow">
                {/* Left side: Editor */}
                <div className="glass-panel flex flex-col flex-1 overflow-hidden h-full">
                    {/* Editor Top Bar */}
                    <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-primary/20 rounded text-primary">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                            </span>
                            <div className="relative group cursor-pointer">
                                <select 
                                    className="appearance-none bg-surface border border-slate-600 rounded-md text-white px-3 py-1.5 pr-8 focus:border-primary outline-none focus:ring-1 focus:ring-primary cursor-pointer w-32"
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                >
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="java">Java</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
                            <span>{linesCount} lines</span>
                            <button className="flex items-center gap-2 hover:text-white transition-colors">
                                <Upload size={16} /> Upload
                            </button>
                        </div>
                    </div>
                    
                    {/* Monaco Editor */}
                    <div className="flex-grow">
                        <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={code}
                            onChange={(v) => setCode(v || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'Fira Code', monospace",
                                padding: { top: 16 },
                                scrollBeyondLastLine: false,
                                contextmenu: false
                            }}
                            loading={<div className="text-slate-500 flex h-full items-center justify-center">Loading editor...</div>}
                        />
                    </div>
                </div>

                {/* Right side: Settings */}
                <div className="w-80 flex flex-col gap-6">
                    {/* GitHub Connection */}
                    <div className="glass-panel p-5">
                        <div className="flex items-center gap-2 mb-4 font-semibold text-white">
                            <GitBranch size={18} /> GitHub
                        </div>
                        <button className="btn-ghost border border-slate-600 w-full flex items-center justify-center gap-2">
                            <GitBranch size={16} /> Connect GitHub
                        </button>
                    </div>

                    {/* Settings Panel */}
                    <div className="glass-panel p-5 flex flex-col gap-6 flex-grow">
                        <h3 className="font-semibold text-white">Settings</h3>
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-400">Title (optional)</label>
                            <input 
                                type="text"
                                placeholder="e.g. Sort algorithm review"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white placeholder-slate-600 rounded-lg px-4 py-2 focus:border-primary outline-none transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-400">Explanation Mode</label>
                            
                            <div 
                                className={`p-4 border rounded-xl cursor-pointer transition-colors ${mode === 'Beginner' ? 'border-primary bg-primary/5' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}
                                onClick={() => setMode('Beginner')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === 'Beginner' ? 'border-primary' : 'border-slate-500'}`}>
                                        {mode === 'Beginner' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium">Beginner</span>
                                        <span className="text-xs text-slate-400 mt-0.5">Simple explanations with examples</span>
                                    </div>
                                </div>
                            </div>

                            <div 
                                className={`p-4 border rounded-xl cursor-pointer transition-colors ${mode === 'Expert' ? 'border-primary bg-primary/5' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}
                                onClick={() => setMode('Expert')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === 'Expert' ? 'border-primary' : 'border-slate-500'}`}>
                                        {mode === 'Expert' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium">Expert</span>
                                        <span className="text-xs text-slate-400 mt-0.5">Concise, technical feedback</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    
                    {error && <span className="text-red-500 text-sm">{error}</span>}
                    {/* Big Analyze Button */}
                    <button 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="btn-primary w-full py-4 text-base tracking-wide mt-auto group disabled:opacity-50"
                    >
                        {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="group-hover:animate-pulse" />}
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewReview;
