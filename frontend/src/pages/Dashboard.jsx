import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Wind, Zap, RefreshCw, BookOpen, Copy, Check, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalMinted: 0, transferred: 0, retired: 0, turbines: 1 });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [latestToken, setLatestToken] = useState(null);

  const { user, token: authToken } = useAuth();

  useEffect(() => {
    fetchStats();
    fetchChartData();
    fetchLatestToken();

    const interval = setInterval(() => {
      fetchStats(true); // Silent fetch
      fetchChartData();
      fetchLatestToken();
    }, 10000); // 10s auto-refresh

    return () => clearInterval(interval);
  }, [user]);

  const fetchStats = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const endpoint = (user && user.role === 'user') ? 'http://localhost:5000/user-stats' : 'http://localhost:5000/dashboard-stats';
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await axios.get(endpoint, { headers });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const endpoint = (user && user.role === 'user') ? 'http://localhost:5000/user-chart-data' : 'http://localhost:5000/chart-data';
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await axios.get(endpoint, { headers });
      setChartData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLatestToken = async () => {
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await axios.get('http://localhost:5000/latest-token', { headers });
      setLatestToken(res.data);
    } catch (err) {
      // No tokens minted yet, this is fine
    }
  };

  const refreshAll = () => {
    setLoading(true);
    fetchStats();
    fetchChartData();
    fetchLatestToken();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-900 dark:from-emerald-400 dark:to-teal-500">System Overview</h2>
           <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time wind energy tracing and tokenization analytics</p>
        </div>
        <button onClick={refreshAll} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all">
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : user?.role === 'user' ? (
          <>
            <StatCard title="Tokens Currently Owned" value={stats.received || 0} icon={Zap} color="emerald" />
            <StatCard 
              title="My Wallet Address" 
              value={user?.walletAddress ? `${user.walletAddress.slice(0,6)}...${user.walletAddress.slice(-4)}` : 'N/A'} 
              icon={Wind} 
              color="blue" 
              copyValue={user?.walletAddress}
              isAddress={true}
            />
            <StatCard title="Tokens Sent Out" value={stats.transferred || 0} icon={Activity} color="indigo" />
            <StatCard title="Tokens Consumed" value={stats.retired || 0} icon={RefreshCw} color="amber" />
          </>
        ) : (
          <>
            <StatCard title="Total Tokens Minted" value={stats.totalMinted || 0} icon={Zap} color="emerald" />
            <StatCard title="Active Turbines" value={stats.turbines || 1} icon={Wind} color="blue" />
            <StatCard title="Tokens Distributed" value={stats.transferred || 0} icon={Activity} color="indigo" />
            <StatCard title="Tokens Consumed" value={stats.retired || 0} icon={RefreshCw} color="amber" />
          </>
        )}
      </div>

      {/* Energy Story Card */}
      {latestToken && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-800 dark:to-teal-900 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={20} className="text-emerald-200" />
              <h3 className="font-bold text-lg text-emerald-100">Energy Story</h3>
            </div>
            <p className="text-white/90 text-lg leading-relaxed">
              {user?.role === 'user' ? (
                <>
                  You hold Token <span className="font-bold text-white">#{latestToken.tokenId}</span>. This energy was generated at <span className="font-bold text-white">{new Date(!isNaN(latestToken.timestamp) ? Number(latestToken.timestamp) : latestToken.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span> on{' '}
                  <span className="font-bold text-white">{new Date(!isNaN(latestToken.timestamp) ? Number(latestToken.timestamp) : latestToken.timestamp).toLocaleDateString('en-GB')}</span> by{' '}
                  Turbine <span className="font-bold text-white">{latestToken.turbineId}</span> at{' '}
                  <span className="font-bold text-white">{latestToken.windSpeed} m/s</span> wind speed, producing{' '}
                  <span className="font-bold text-white">{parseFloat(latestToken.energyOutput).toFixed(2)} kW</span> of clean power.
                  EnergyDNA hash: <span className="font-mono text-sm bg-white/10 px-1.5 py-0.5 rounded">{latestToken.energyDnaHash?.slice(0, 16)}...</span>
                </>
              ) : (
                <>
                  This energy was generated at <span className="font-bold text-white">{new Date(!isNaN(latestToken.timestamp) ? Number(latestToken.timestamp) : latestToken.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span> on{' '}
                  <span className="font-bold text-white">{new Date(!isNaN(latestToken.timestamp) ? Number(latestToken.timestamp) : latestToken.timestamp).toLocaleDateString('en-GB')}</span> by{' '}
                  Turbine <span className="font-bold text-white">{latestToken.turbineId}</span> at{' '}
                  <span className="font-bold text-white">{latestToken.windSpeed} m/s</span> wind speed, producing{' '}
                  <span className="font-bold text-white">{parseFloat(latestToken.energyOutput).toFixed(2)} kW</span> of clean power.
                  It was tokenized on the blockchain as Token <span className="font-bold text-white">#{latestToken.tokenId}</span> with{' '}
                  EnergyDNA hash <span className="font-mono text-sm bg-white/10 px-1.5 py-0.5 rounded">{latestToken.energyDnaHash?.slice(0, 16)}...</span>
                </>
              )}
            </p>
            <p className="text-emerald-200 text-sm mt-3 uppercase tracking-wider font-semibold">Status: {latestToken.state}</p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Power vs Time Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">⚡ Power Output vs Time (kW)</h3>
          <div className="h-72">
            {loading && chartData.length === 0 ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="index" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dx={-10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="power" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPower)" />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">{user?.role === 'user' ? "Chronological output of your received tokens" : "Real data from T1.csv turbine dataset"}</p>
        </div>

        {/* Wind Speed vs Power Scatter Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">🌬 Wind Speed vs Power Output</h3>
          <div className="h-72">
            {loading && chartData.length === 0 ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis 
                  dataKey="speed" 
                  name="Wind Speed" 
                  unit="m/s" 
                  type="number"
                  domain={['auto', 'auto']}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10}} 
                  dy={10}
                />
                <YAxis 
                  dataKey="power" 
                  name="Power" 
                  unit="kW" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10}} 
                  dx={-10}
                />
                <ZAxis range={[40, 120]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Scatter name="Energy Events" data={chartData} fill="#6366f1" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">{user?.role === 'user' ? "Each dot = one token you own" : "Each dot = one generation event from dataset"}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, copyValue, isAddress }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyValue) return;
    navigator.clipboard.writeText(copyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-400',
    indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-400'
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 hover:shadow-md transition-shadow group relative">
      {copyValue && (
        <button 
          onClick={handleCopy}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
          title="Copy to clipboard"
        >
          {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={14} />}
        </button>
      )}
      <div className={`p-4 rounded-xl ${colorMap[color]} group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className={`${isAddress ? 'text-xl sm:text-2xl' : 'text-3xl'} font-bold text-slate-800 dark:text-white truncate`}>{value}</p>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 animate-pulse">
      <div className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
      <div className="space-y-3 flex-1">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-full w-full bg-slate-100/50 dark:bg-slate-800/20 rounded-xl animate-pulse flex items-center justify-center">
       <Activity size={32} className="text-slate-300 dark:text-slate-700 opacity-50" />
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 pointer-events-none">
        <p className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5 opacity-80 text-xs uppercase tracking-wide">
          <Clock size={12}/> {label !== undefined && label !== '' ? `Record #${label}` : "Data Generation Point"}
        </p>
        <div className="space-y-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6 text-sm font-semibold" style={{ color: entry.color }}>
              <span className="flex items-center gap-1.5">
                {entry.name.toLowerCase().includes('power') ? <Zap size={14}/> : <Wind size={14}/>}
                {entry.name === 'power' ? 'Power Output' : entry.name === 'speed' ? 'Wind Speed' : entry.name}
              </span>
              <span className="text-slate-900 dark:text-white font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {(typeof entry.value === 'number') ? entry.value.toFixed(2) : entry.value} {entry.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
