import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wind, Zap, Shield, BarChart3, ArrowRight, Leaf, Globe, Moon, Sun } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';

export default function LandingPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handlePortalNavigation = (targetPath, targetRole) => {
    if (isAuthenticated && user?.role !== targetRole) {
      logout();
    }
    navigate(targetPath);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-x-hidden">
      {/* Nav */}
      <header className="border-b border-slate-200 dark:border-slate-800/60 sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-emerald-400 to-green-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-900/30">
              <Wind size={22} className="animate-[spin_4s_linear_infinite]"/>
            </div>
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">EnergyDNA</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to={isAuthenticated ? "/dashboard" : "/auth/user"} className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium">
              {isAuthenticated ? "Dashboard →" : "Login →"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.15),transparent_60%)]"></div>
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8">
            <Leaf size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Blockchain-Verified Clean Energy</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6">
            <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">EnergyDNA</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A blockchain-powered platform that creates tamper-proof digital identities for every unit of wind energy — from turbine generation to final consumption.
          </p>
        </div>
      </section>

      {/* Two Portal Cards */}
      <section id="portals" className="max-w-5xl mx-auto px-6 pb-12 scroll-mt-20">
        <div className={`grid ${isAuthenticated ? 'md:grid-cols-1 max-w-xl mx-auto' : 'md:grid-cols-2'} gap-8`}>
          {/* Wind Plant Portal */}
          {(!isAuthenticated || user?.role === 'windplant') && (
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 hover:border-emerald-500/40 transition-all duration-300 group shadow-sm hover:shadow-md">
            <div className="bg-emerald-500/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Wind className="text-emerald-600 dark:text-emerald-500" size={28} />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">Wind Plant Portal</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Mint energy tokens directly from turbine datasets, manage generation audits, and verify blockchain-backed energy production.
            </p>
            <button 
              onClick={() => handlePortalNavigation(isAuthenticated && user?.role === 'windplant' ? '/mint' : '/auth/plant', 'windplant')}
              className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/40 cursor-pointer"
            >
              {isAuthenticated && user?.role === 'windplant' ? "View Dashboard" : "Access Portal"} <ArrowRight size={18} />
            </button>
          </div>
          )}

          {/* Energy User Portal */}
          {(!isAuthenticated || user?.role === 'user') && (
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 hover:border-blue-500/40 transition-all duration-300 group shadow-sm hover:shadow-md">
            <div className="bg-blue-500/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-110 transition-transform">
              <Zap className="text-blue-600 dark:text-blue-500" size={28} />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">Energy User Portal</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Receive energy tokens, verify their EnergyDNA, and maintain a secure digital ledger of your sustainable energy consumption.
            </p>
            <button 
              onClick={() => handlePortalNavigation(isAuthenticated ? "/dashboard" : "/auth/user", 'user')}
              className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/40 cursor-pointer"
            >
              {isAuthenticated && user?.role === 'user' ? "Go to Dashboard" : "Access Portal"} <ArrowRight size={18} />
            </button>
          </div>
          )}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-slate-800/60">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 rounded-xl p-6 hover:border-slate-200 dark:hover:border-slate-700 transition-colors shadow-sm">
            <Shield size={24} className="text-emerald-600 dark:text-emerald-400 mb-4" />
            <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Tamper-Proof</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Every energy token is secured with SHA-256 hashing and stored immutably on the blockchain.</p>
          </div>
          <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 rounded-xl p-6 hover:border-slate-200 dark:hover:border-slate-700 transition-colors shadow-sm">
            <BarChart3 size={24} className="text-blue-600 dark:text-blue-400 mb-4" />
            <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Full Traceability</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Track energy from wind turbine generation through transfer and final consumption with complete audit trails.</p>
          </div>
          <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/60 rounded-xl p-6 hover:border-slate-200 dark:hover:border-slate-700 transition-colors shadow-sm">
            <Globe size={24} className="text-purple-600 dark:text-purple-400 mb-4" />
            <h4 className="font-bold text-lg mb-2 text-slate-800 dark:text-white">Green Verification</h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Prove your energy is 100% renewable with verifiable blockchain certificates that cannot be double-counted.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/60 py-8">
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">© 2026 EnergyDNA. Blockchain-Verified Clean Energy Platform.</p>
      </footer>
    </div>
  );
}
