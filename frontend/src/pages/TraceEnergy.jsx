import React, { useState } from 'react';
import axios from 'axios';
import { Search, Map, Wind, ArrowRightCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function TraceEnergy() {
  const [tokenId, setTokenId] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const traceToken = async (e) => {
    e.preventDefault();
    if (!tokenId) return;
    setLoading(true);
    setError('');
    setTokenData(null);

    try {
      const res = await axios.get(`http://localhost:5000/energy-token/${tokenId}`);
      
      // Energy Users can only trace tokens they own
      if (user && user.role !== 'windplant') {
        const userWallet = user.walletAddress?.toLowerCase();
        if (!userWallet || res.data.owner?.toLowerCase() !== userWallet) {
          setError('This token is not in your portfolio. You can only trace tokens you own.');
          return;
        }
      }
      
      setTokenData(res.data);
    } catch (err) {
      setError('Token trace failed. Invalid EnergyDNA token identity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 max-w-4xl mx-auto px-4">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-4">Energy Trace</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Trace the full origin timeline of arbitrary energy units generated through the grid.</p>
      </div>

      <form onSubmit={traceToken} className="flex max-w-md mx-auto relative pt-4 items-center">
        <div className="absolute left-0 pl-3 flex items-center pointer-events-none">
           <Search size={20} className="text-emerald-500" />
        </div>
        <input 
          type="text" 
          inputMode="numeric"
          placeholder="Enter Token ID (e.g. 0)" 
          className="w-full pl-10 pr-[100px] py-4 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500 font-mono text-lg bg-white dark:bg-slate-900 dark:text-white"
          value={tokenId}
          onChange={e => setTokenId(e.target.value)}
        />
        <button type="submit" className="absolute right-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm">
          {loading ? 'Tracing...' : 'Trace'}
        </button>
      </form>

      {error && <div className="text-center font-medium text-red-500">{error}</div>}

      {tokenData && (
        <div className="mt-8">
          <div className="text-center md:text-left md:pl-28 mb-10 space-y-2 animate-in fade-in duration-500">
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center justify-center md:justify-start gap-3">
              Tracing Token <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-xl">#{tokenData.tokenId}</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-mono text-sm max-w-2xl text-center md:text-left">DNA Identifier: {tokenData.energyDnaHash}</p>
          </div>
          <div className="relative pt-4 pb-16">
            <div className="absolute top-0 bottom-0 left-12 w-1 bg-gradient-to-b from-emerald-400 via-emerald-300 to-slate-200 dark:to-slate-800 rounded-full z-0 hidden md:block"></div>
          
          <div className="space-y-16 relative z-10">
            {/* Generation Step */}
            <div className="flex md:items-center flex-col md:flex-row gap-6">
              <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center shrink-0 mx-auto md:mx-0">
                <Wind size={36} className="text-emerald-600 dark:text-emerald-400 animate-[spin_4s_linear_infinite]" />
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex-1 relative arrow-left">
                <span className="absolute -top-3 left-6 text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-1 rounded">1. Generation</span>
                <p className="font-bold text-slate-800 dark:text-white text-lg mb-2">Wind Farm Origin</p>
                <div className="text-sm text-slate-600 dark:text-slate-400 grid grid-cols-2 gap-y-2">
                  <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Turbine ID</span>
                  <span className="font-mono text-slate-800 dark:text-slate-300">{tokenData.turbineId}</span>
                  <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Plant / Location</span>
                  <span className="font-mono text-slate-800 dark:text-slate-300">
                    {user?.plantName || 'EnergyDNA Demo Plant'}
                  </span>
                  <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Output</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{tokenData.energyOutput} kW</span>
                  <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">Timestamp</span>
                  <span className="font-mono text-slate-800 dark:text-slate-300">{new Date(!isNaN(tokenData.timestamp) ? Number(tokenData.timestamp) : tokenData.timestamp).toLocaleString('en-GB')}</span>
                </div>
              </div>
            </div>

            {/* Tokenization Step */}
            <div className="flex md:items-center flex-col md:flex-row gap-6">
              <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/60 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center shrink-0 mx-auto md:mx-0">
                <Map size={36} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex-1 relative arrow-left">
                <span className="absolute -top-3 left-6 text-xs font-bold uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-1 rounded">2. Tokenization</span>
                <p className="font-bold text-slate-800 dark:text-white text-lg mb-2">Blockchain Minting</p>
                <div className="space-y-3 mt-4">
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold">Immutable Record (EnergyDNA)</p>
                  <p className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 rounded-lg text-xs font-mono break-all text-slate-600 dark:text-slate-300">{tokenData.energyDnaHash}</p>
                </div>
              </div>
            </div>

            {/* Ownership Step */}
            <div className="flex md:items-center flex-col md:flex-row gap-6">
              <div className="w-24 h-24 rounded-full bg-slate-800 dark:bg-slate-700 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center shrink-0 mx-auto md:mx-0">
                <ArrowRightCircle size={36} className="text-white" />
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex-1 relative arrow-left">
                <span className="absolute -top-3 left-6 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">3. Ownership</span>
                <p className="font-bold text-slate-800 dark:text-white text-lg mb-2">Current State</p>
                <div className="flex items-center gap-4 mt-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                  <div className={`px-4 py-2 text-sm font-bold uppercase rounded-lg ${tokenData.state === 'Retired' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400'}`}>
                    {tokenData.state === 'Retired' ? 'Consumed / Retired' : (user?.role !== 'windplant' && tokenData.state === 'Transferred' && tokenData.owner?.toLowerCase() === user?.walletAddress?.toLowerCase()) ? 'Received' : tokenData.state}
                  </div>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate flex-1 leading-relaxed">
                    Owned by wallet:<br/>
                    <span className="text-slate-800 dark:text-slate-300">{tokenData.owner}</span>
                  </p>
                </div>
              </div>
            </div>

          </div>
          </div>
        </div>
      )}
    </div>
  );
}
