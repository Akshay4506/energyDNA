import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Wind, Database, ShieldCheck, Cpu, ExternalLink, Package, Search, Sparkles, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWallet } from '../WalletContext';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';

export default function MintEnergy() {
  const [events, setEvents] = useState([]);
  const [mintedIndices, setMintedIndices] = useState([]);
  const [myTokens, setMyTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mintedToken, setMintedToken] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const { account, contract, connectWallet } = useWallet();
  const { user, isWindPlant, token: authToken } = useAuth();

  useEffect(() => {
    // If logged in as an Energy User, show their tokens.
    // Otherwise (Guest or Wind Plant), show the minting dashboard.
    if (user && !isWindPlant) {
      fetchMyTokens();
    } else {
      fetchEvents();
      fetchMintedIndices();
    }
  }, [user, isWindPlant]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/dataset-events');
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMintedIndices = async () => {
    try {
      const res = await axios.get('http://localhost:5000/minted-indices');
      setMintedIndices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyTokens = async () => {
    try {
      const res = await axios.get('http://localhost:5000/my-tokens', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setMyTokens(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const mintToken = async (index) => {
    if (!account || !contract) {
      toast.error('Please connect your MetaMask wallet first!');
      connectWallet();
      return;
    }

    setLoading(true);
    setMessage('Step 1/3: Generating EnergyDNA Hash...');
    setMintedToken(null);
    setTxHash('');

    try {
      // Step 1: Get prepared metadata from backend
      const prepRes = await axios.post('http://localhost:5000/prepare-mint', { eventIndex: index });
      const meta = prepRes.data;
      
      setMessage('Step 2/3: Confirm transaction in MetaMask...');

      // Step 2: Call smart contract directly via MetaMask
      const tx = await contract.mintEnergyToken(
        account,
        meta.tokenId,
        meta.turbineId,
        meta.timestamp,
        meta.windSpeed,
        meta.windDirection,
        meta.energyOutput,
        meta.energyDnaHash,
        meta.tokenURI
      );

      setMessage('Step 3/3: Waiting for blockchain confirmation...');
      setTxHash(tx.hash);
      const receipt = await tx.wait();

      // Extract tokenId from events
      let tokenId = 0;
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'EnergyTokenMinted') {
            tokenId = Number(parsedLog.args.tokenId);
            break;
          }
        } catch (e) { /* ignore */ }
      }

      // Step 3: Save to backend DB
      const saveRes = await axios.post('http://localhost:5000/save-minted-token', {
        tokenId,
        eventIndex: index,
        turbineId: meta.turbineId,
        timestamp: meta.timestamp,
        windSpeed: meta.windSpeed,
        windDirection: meta.windDirection,
        energyOutput: meta.energyOutput,
        energyDnaHash: meta.energyDnaHash,
        owner: account,
        txHash: tx.hash
      });

      // Remove this row from available list
      setMintedIndices(prev => [...prev, index]);

      // Sync Energy Matchmaker results
      setMatchResult(prev => {
        if (!prev) return null;
        const newResult = { ...prev };
        
        // Remove from single match if it was this token
        if (newResult.bestSingle?.originalIndex === index) {
          newResult.bestSingle = null;
        }

        // Remove from combination if it was in the bundle
        if (newResult.combination) {
          newResult.combination = newResult.combination.filter(c => c.originalIndex !== index);
          if (newResult.combination.length === 0) {
            newResult.combination = null;
          } else {
            // Update the total kW sum after removal
            const newSum = newResult.combination.reduce((acc, curr) => acc + parseFloat(curr['LV ActivePower (kW)']), 0);
            newResult.combinationSum = newSum.toFixed(2);
          }
        }
        return newResult;
      });

      toast.success('Token minted successfully!');
      setMessage('✅ Token minted successfully on blockchain!');
      setMintedToken({ ...saveRes.data.token, txHash: tx.hash });
    } catch (err) {
      if (err.code === 'ACTION_REJECTED') {
        toast.error('Transaction rejected by user.');
        setMessage('❌ Transaction rejected by user.');
      } else {
        toast.error(`Error: ${err.message?.slice(0, 40)}...`);
        setMessage(`❌ Error: ${err.message?.slice(0, 100)}`);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchVal || isNaN(searchVal)) {
      setMatchResult(null);
      return;
    }
    const target = parseFloat(searchVal);
    const available = events.filter(ev => !mintedIndices.includes(ev.originalIndex));
    
    if (available.length === 0) {
      setMatchResult({ type: 'error', message: 'No more energy events available to match.' });
      return;
    }

    // 1. Single Best Fit Logic
    let bestSingle = available[0];
    let minDiff = Math.abs(parseFloat(available[0]['LV ActivePower (kW)']) - target);
    
    available.forEach(ev => {
      const p = parseFloat(ev['LV ActivePower (kW)']);
      const diff = Math.abs(p - target);
      if (diff < minDiff) {
        minDiff = diff;
        bestSingle = ev;
      }
    });

    // Boundary logic
    const allPowers = available.map(ev => parseFloat(ev['LV ActivePower (kW)']));
    const maxPower = Math.max(...allPowers);
    const minPower = Math.min(...allPowers);

    let boundaryNote = '';
    if (target > maxPower) boundaryNote = 'Searching for a value higher than available; showing highest output.';
    else if (target < minPower) boundaryNote = 'Searching for a value lower than available; showing lowest output.';

    // 2. Combination Logic (Greedy Approximation)
    // Sort available by energy output descending
    const sortedAvailable = [...available].sort((a, b) => 
      parseFloat(b['LV ActivePower (kW)']) - parseFloat(a['LV ActivePower (kW)'])
    );

    let currentSum = 0;
    const combination = [];
    for (const ev of sortedAvailable) {
      const p = parseFloat(ev['LV ActivePower (kW)']);
      // Allow for a small buffer or exact match
      if (currentSum + p <= target + (target * 0.05)) { 
        combination.push(ev);
        currentSum += p;
        // If we are within 2% of the target, stop greedy
        if (Math.abs(currentSum - target) / target < 0.02) break;
      }
    }

    setMatchResult({
      bestSingle,
      combination: combination.length > 1 ? combination : null,
      combinationSum: currentSum.toFixed(2),
      boundaryNote
    });
  };

  // ========================
  // USER ROLE: My Tokens view (only for logged-in Energy Users)
  // ========================
  if (user && !isWindPlant) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-900 dark:from-blue-400 dark:to-indigo-400">My Energy Tokens</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Energy tokens you own — received via transfer or minted on your behalf.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Package size={18} className="text-blue-600 dark:text-blue-400"/> Owned Tokens</h3>
            <span className="text-xs font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-1 rounded-full">{myTokens.length} tokens</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[600px] overflow-y-auto">
            {myTokens.length === 0 && (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                <Package size={40} className="mx-auto mb-3 opacity-30"/>
                <p className="font-medium">No tokens yet</p>
                <p className="text-sm mt-1">Tokens transferred to your wallet will appear here automatically.</p>
              </div>
            )}
            {myTokens.map(t => (
              <div key={t.tokenId} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">Token #{t.tokenId}</span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${
                        t.state === 'Minted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' :
                        t.state === 'Transferred' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300' :
                        'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {t.state === 'Retired' ? 'Consumed / Retired' : t.state === 'Transferred' ? 'Received' : t.state}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span className="flex items-center gap-1"><Zap size={12}/> {t.energyOutput} kW</span>
                      <span className="flex items-center gap-1"><Wind size={12}/> {t.windSpeed} m/s</span>
                      <span>Turbine: {t.turbineId}</span>
                    </div>
                  </div>
                  <Link to={`/explorer?tokenId=${t.tokenId}`} className="text-xs text-blue-500 hover:text-blue-400 font-medium">View in Explorer →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========================
  // WIND PLANT ROLE: Mint view
  // ========================
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-900 dark:from-emerald-400 dark:to-teal-500">Mint Energy Tokens</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Convert raw wind energy generation events into cryptographic NFT tokens via MetaMask.</p>
      </div>

      {!account && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl flex items-center justify-between">
          <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">⚠ Connect MetaMask wallet to mint tokens on the blockchain</p>
          <button onClick={connectWallet} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Connect Wallet
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Search & Match Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sparkles size={20} className="text-blue-500" /> Energy Matchmaker
              </h3>
              <p className="text-xs text-slate-400">Find the best generation events for your needs</p>
            </div>
            
            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Zap size={18} />
                </div>
                <input 
                  type="number" 
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="Enter required energy (kW)..." 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <button 
                onClick={handleSearch}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <Search size={18} /> Find Match
              </button>
            </div>

            {matchResult && (
              <div className="mt-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                {matchResult.type === 'error' ? (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                    {matchResult.message}
                  </div>
                ) : (
                  <>
                    {matchResult.boundaryNote && (
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-800/40">
                        ℹ️ {matchResult.boundaryNote}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Single Best Fit */}
                      {matchResult.bestSingle && (
                        <div className="p-4 bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40 rounded-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-1 opacity-5"><Filter size={60} /></div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Best Single Event</span>
                            <span className="text-[10px] font-mono text-slate-400">Score: High</span>
                          </div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{matchResult.bestSingle['Date/Time']}</p>
                          <div className="flex items-center justify-between gap-2 overflow-hidden">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-slate-900 dark:text-white">{matchResult.bestSingle['LV ActivePower (kW)']}</span>
                              <span className="text-xs font-medium text-slate-400">kW</span>
                            </div>
                            <button 
                              onClick={() => {
                                if (matchResult.bestSingle?.originalIndex !== undefined) {
                                  mintToken(matchResult.bestSingle.originalIndex);
                                }
                              }}
                              disabled={loading || !account}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 relative z-10"
                            >
                              <Cpu size={14}/> Mint
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Combination Option */}
                      {matchResult.combination && (
                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40 rounded-xl relative overflow-hidden flex flex-col">
                          <div className="absolute top-0 right-0 p-1 opacity-5"><Zap size={60} /></div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Bundle Recommendation</span>
                            <div className="flex gap-2 items-center">
                              <span className="text-[10px] font-mono text-slate-400">{matchResult.combinationSum} kW</span>
                              <span className="text-xs font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">{matchResult.combination.length}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2 flex-1 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                            {matchResult.combination.map((c, i) => (
                              <div key={i} className="flex justify-between items-center p-2 bg-white/60 dark:bg-slate-800/60 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30 group/item">
                                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                                  <span className="font-bold text-slate-900 dark:text-white">{c['LV ActivePower (kW)']} kW</span>
                                  <span className="block opacity-60 text-[9px]">{c['Date/Time']?.split(' ')[1]}</span>
                                </div>
                                <button 
                                  onClick={() => mintToken(c.originalIndex)}
                                  disabled={loading || !account}
                                  className="px-2 py-1 bg-emerald-600 text-white font-medium text-[10px] rounded hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-1"
                                >
                                  <Cpu size={10}/> Mint
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-2 italic">Optimal combination closest to your requested power.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Database size={18} className="text-emerald-600 dark:text-emerald-500"/> Live Turbine Dataset</h3>
              <span className="text-xs font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-1 rounded-full">T1 Turbine</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[500px] overflow-y-auto p-2 custom-scrollbar">
              {events
                .filter(ev => !mintedIndices.includes(ev.originalIndex))
                .slice(0, 5)
                .map((ev, idx) => (
                <div key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{ev['Date/Time']}</p>
                    <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                       <span className="flex items-center gap-1"><Zap size={12}/> {ev['LV ActivePower (kW)']} kW</span>
                       <span className="flex items-center gap-1"><Wind size={12}/> {ev['Wind Speed (m/s)']} m/s</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => mintToken(ev.originalIndex)} 
                    disabled={loading || !account}
                    className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Cpu size={14}/> Mint via MetaMask
                  </button>
                </div>
              ))}
              {events.length === 0 && <div className="p-8 text-center text-slate-400 dark:text-slate-500">Loading dataset...</div>}
              {events.length > 0 && events.filter(ev => !mintedIndices.includes(ev.originalIndex)).length === 0 && (
                <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                  <Database size={40} className="mx-auto mb-3 opacity-30 text-emerald-500"/>
                  <p className="font-bold text-slate-700 dark:text-slate-300">All events tokenized!</p>
                  <p className="text-sm mt-1">Waiting for new power generation from T1 Turbine.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={100} /></div>
            <h3 className="font-semibold text-emerald-400 mb-2">Process Overview</h3>
            <ol className="text-sm text-slate-300 space-y-3 relative z-10">
              <li className="flex gap-2"><span className="text-emerald-500">1.</span> Read row from Turbine dataset</li>
              <li className="flex gap-2"><span className="text-emerald-500">2.</span> Generate SHA-256 EnergyDNA Hash</li>
              <li className="flex gap-2"><span className="text-emerald-500">3.</span> Sign & mint ERC721 Token via MetaMask</li>
              <li className="flex gap-2"><span className="text-emerald-500">4.</span> Store metadata alongside token ID</li>
            </ol>
          </div>

          {loading && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-3 animate-pulse">
              <div className="w-12 h-12 border-4 border-emerald-100 dark:border-emerald-900/40 border-t-emerald-600 dark:border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
              {txHash && (
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 truncate">
                  Tx: {txHash}
                </p>
              )}
            </div>
          )}

          {mintedToken && !loading && (
            <div className="bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950/60 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
               <h3 className="text-emerald-800 dark:text-emerald-400 font-bold flex items-center gap-2 mb-4"><ShieldCheck size={20}/> Minted Successfully</h3>
               
               <div className="space-y-3 relative z-10">
                 <div>
                   <p className="text-xs text-emerald-600/70 dark:text-emerald-500/80 uppercase font-semibold">Token ID</p>
                   <p className="font-mono text-lg text-slate-800 dark:text-white">#{mintedToken.tokenId}</p>
                 </div>
                 <div>
                   <p className="text-xs text-emerald-600/70 dark:text-emerald-500/80 uppercase font-semibold">EnergyDNA Hash</p>
                   <p className="font-mono text-xs text-slate-600 dark:text-slate-300 break-all bg-white/60 dark:bg-slate-900/60 p-2 rounded border border-emerald-100 dark:border-emerald-800/30">{mintedToken.energyDnaHash}</p>
                 </div>
                 <div>
                   <p className="text-xs text-emerald-600/70 dark:text-emerald-500/80 uppercase font-semibold">Transaction Hash</p>
                   <p className="font-mono text-xs text-slate-600 dark:text-slate-300 break-all bg-white/60 dark:bg-slate-900/60 p-2 rounded border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-1">
                     {mintedToken.txHash}
                     <ExternalLink size={10} className="text-emerald-600 shrink-0"/>
                   </p>
                 </div>
                 <div className="grid grid-cols-2 gap-2 pb-2">
                   <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded border border-emerald-50 dark:border-emerald-800/30">
                     <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/80 uppercase">Power</p>
                     <p className="font-medium text-sm dark:text-slate-200">{mintedToken.energyOutput} kW</p>
                   </div>
                   <div className="bg-white/60 dark:bg-slate-900/60 p-2 rounded border border-emerald-50 dark:border-emerald-800/30">
                     <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/80 uppercase">Velocity</p>
                     <p className="font-medium text-sm dark:text-slate-200">{mintedToken.windSpeed} m/s</p>
                   </div>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
