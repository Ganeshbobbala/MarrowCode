import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NewReview from './pages/NewReview';
import History from './pages/History';
import Results from './pages/Results';
import Practice from './pages/Practice';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-slate-300 font-sans flex flex-col items-center">
        {/* Abstract Glow Effects */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 blur-[150px] rounded-full mix-blend-screen" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/5 blur-[150px] rounded-full mix-blend-screen" />
        </div>

        <div className="w-full z-20">
          <Navbar />
        </div>

        <div className="w-full max-w-[1800px] px-4 md:px-8 z-10 flex flex-col flex-grow">
          <div className="flex-grow mt-10">
            <Routes>
              <Route path="/" element={<Practice />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/new" element={<NewReview />} />
              <Route path="/history" element={<History />} />
              <Route path="/results" element={<Results />} />
            </Routes>
          </div>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
