import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Zap, Clock, Shield, Wind, ArrowRight, CheckCircle, XCircle, Send, Power, ExternalLink, Database, Activity } from 'lucide-react';
import { useWallet } from '../WalletContext';
import { useAuth } from '../AuthContext';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function TokenExplorer() {
  const [searchParams] = useSearchParams();
  const [tokenId, setTokenId] = useState('');
  const [tokenData, setTokenData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [recipientIdentifier, setRecipientIdentifier] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const { account, contract } = useWallet();
  const { user, token } = useAuth();

  // Auto-search when navigating from notification click
  useEffect(() => {
    const queryTokenId = searchParams.get('tokenId');
    if (queryTokenId !== null) {
      setTokenId(queryTokenId);
      autoSearch(queryTokenId);
    }
  }, [searchParams]);

  const autoSearch = async (id) => {
    setLoading(true);
    setError('');
    setTokenData(null);
    setHistory([]);
    setVerifyResult(null);
    try {
      const res = await axios.get(`http://localhost:5000/energy-token/${id}`);
      
      if (!isUserAllowed(res.data)) {
        setError('This token is not in your portfolio. You can only view tokens you own.');
        return;
      }
      
      setTokenData(res.data);
      const histRes = await axios.get(`http://localhost:5000/energy-history/${id}`);
      setHistory(histRes.data);
    } catch (err) {
      setError('Token not found. Please verify the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if the current user owns this token
  const isUserAllowed = (tokenResData) => {
    // Wind Plant employees and guests can view any token
    if (!user || user.role === 'windplant') return true;
    // Energy Users can only view tokens they own
    const userWallet = user.walletAddress?.toLowerCase();
    return userWallet && tokenResData.owner?.toLowerCase() === userWallet;
  };

  const searchToken = async (e) => {
    e.preventDefault();
    if (!tokenId) return;
    setLoading(true);
    setError('');
    setTokenData(null);
    setHistory([]);
    setVerifyResult(null);

    try {
      const res = await axios.get(`http://localhost:5000/energy-token/${tokenId}`);
      
      if (!isUserAllowed(res.data)) {
        setError('This token is not in your portfolio. You can only view tokens you own.');
        return;
      }
      
      setTokenData(res.data);
      
      const histRes = await axios.get(`http://localhost:5000/energy-history/${tokenId}`);
      setHistory(histRes.data);
    } catch (err) {
      setError('Token not found. Please verify the ID and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyHash = async () => {
    if (!tokenData) return;
    setVerifyResult(null);
    setActionLoading('verify');
    try {
      const res = await axios.get(`http://localhost:5000/verify-hash/${tokenData.tokenId}`);
      setVerifyResult(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Verification failed. Check console for details.');
    } finally {
      setActionLoading('');
    }
  };

  const transferToken = async () => {
    if (!recipientIdentifier || !tokenData) return;
    
    setActionLoading('transfer');
    const isWindPlant = user?.role === 'windplant';
    try {
      if (isWindPlant && contract && account) {
        // Wind Plant: MetaMask path (they own tokens on-chain via MetaMask)
        const resolveRes = await axios.get(`http://localhost:5000/resolve-recipient?id=${recipientIdentifier}`);
        const toAddress = resolveRes.data.walletAddress;

        if (!toAddress) {
          toast.error("Could not find a wallet for this recipient.");
          return;
        }

        const toastId = toast.loading('Confirm transfer in MetaMask...');
        const tx = await contract.transferEnergyToken(account, toAddress, tokenData.tokenId);
        toast.loading('Waiting for blockchain confirmation...', { id: toastId });
        await tx.wait();

        // Update DB state
        await axios.post('http://localhost:5000/update-token-state', {
          tokenId: tokenData.tokenId,
          action: 'Transferred',
          from: account,
          to: toAddress,
          txHash: tx.hash
        });
        toast.success('Transfer successful via MetaMask!', { id: toastId });
      } else if (token) {
        // Energy User: Backend Signed (platform wallet acts as custodian)
        const toastId = toast.loading('Transferring token...');
        const res = await axios.post('http://localhost:5000/transfer-token-email', {
          tokenId: tokenData.tokenId,
          recipientIdentifier
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(`Transfer successful!`, { id: toastId });
      } else {
        toast.error("Please login or connect wallet to transfer.");
        return;
      }

      setShowTransferModal(false);
      setRecipientIdentifier('');
      
      // Refresh
      const tokenRes = await axios.get(`http://localhost:5000/energy-token/${tokenData.tokenId}`);
      setTokenData(tokenRes.data);
      const histRes = await axios.get(`http://localhost:5000/energy-history/${tokenData.tokenId}`);
      setHistory(histRes.data);
    } catch (err) {
      toast.dismiss();
      if (err.response?.status === 404) {
        toast.error(`Recipient Not Found. They must have an account.`);
      } else {
        toast.error('Transfer failed: ' + (err.response?.data?.error || err.message));
      }
      console.error(err);
    } finally {
      setActionLoading('');
    }
  };

  const retireToken = async () => {
    if (!tokenData) return;
    if (!window.confirm('Are you sure you want to consume/retire this energy token? This action is irreversible.')) return;
    
    setActionLoading('retire');
    const isWindPlant = user?.role === 'windplant';
    try {
      if (isWindPlant && contract && account) {
        // Wind Plant: MetaMask path (they own tokens on-chain via MetaMask)
        const toastId = toast.loading('Confirm consumption in MetaMask...');
        const tx = await contract.retireEnergyToken(tokenData.tokenId);
        toast.loading('Waiting for blockchain confirmation...', { id: toastId });
        await tx.wait();

        await axios.post('http://localhost:5000/update-token-state', {
          tokenId: tokenData.tokenId,
          action: 'Retired',
          from: account,
          to: '0x0000000000000000000000000000000000000000',
          txHash: tx.hash
        });
        toast.success('Energy consumed successfully!', { id: toastId });
      } else if (token) {
        // Energy User: Backend signed (platform wallet acts as custodian)
        const toastId = toast.loading('Consuming energy token...');
        const res = await axios.post('http://localhost:5000/consume-token-backend', {
          tokenId: tokenData.tokenId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Energy consumed successfully!', { id: toastId });
      } else {
        toast.error('Please connect your wallet or login to consume energy.');
        return;
      }

      // Refresh
      const res = await axios.get(`http://localhost:5000/energy-token/${tokenData.tokenId}`);
      setTokenData(res.data);
      const histRes = await axios.get(`http://localhost:5000/energy-history/${tokenData.tokenId}`);
      setHistory(histRes.data);
    } catch (err) {
      toast.dismiss();
      toast.error('Consumption failed: ' + (err.response?.data?.error || err.message));
      console.error(err);
    } finally {
      setActionLoading('');
    }
  };

  const isOwner = (account && tokenData && tokenData.owner?.toLowerCase() === account.toLowerCase()) || 
                 (user && tokenData && tokenData.owner?.toLowerCase() === user.walletAddress?.toLowerCase());
  
  const tokenState = tokenData?.state?.toLowerCase() || '';
  const isRetired = tokenState === 'retired';
  
  const canTransfer = (token || (contract && account)) && isOwner && !isRetired;
  const canRetire = (token || (contract && account)) && isOwner && !isRetired;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white">Token Explorer</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Search for an EnergyDNA token by its ID to view metadata, proof of origin, and lifecycle history.</p>
        
        <form onSubmit={searchToken} className="flex max-w-md mx-auto relative pt-4 items-center">
          <div className="absolute left-0 pl-3 flex items-center pointer-events-none">
             <Search size={20} className="text-emerald-500" />
          </div>
          <input 
            type="text"
            inputMode="numeric"
            placeholder="Enter Token ID (e.g. 0)" 
            className="w-full pl-10 pr-[100px] py-4 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-500 font-mono text-lg bg-white dark:bg-slate-900 dark:text-white"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
          />
          <button type="submit" className="absolute right-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg inline-block border border-red-100 dark:border-red-800/30">{error}</p>}
      </div>

      {tokenData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 px-4 md:px-0">
          {/* Main Info Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden h-fit">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800/80 dark:to-slate-800/40 px-6 py-5 border-b border-emerald-100 dark:border-slate-700 flex justify-between items-center">
               <h3 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">Token #{tokenData.tokenId} Metadata</h3>
               <div className={`px-4 py-2 text-sm font-bold uppercase rounded-lg ${isRetired ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400'}`}>
                 {isRetired ? 'Consumed / Retired' : tokenData.state === 'Transferred' && isOwner ? 'Received' : (tokenData.state || 'Minted')}
               </div>
            </div>
            
            <div className="p-6 space-y-8">
               {/* Hash Section */}
               <div className="flex flex-col gap-1">
                 <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1"><Shield size={14}/> EnergyDNA Hash (Identifier)</p>
                 <p className="font-mono text-sm break-all bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100/60 dark:border-slate-800 shadow-inner text-slate-700 dark:text-slate-300">
                    {tokenData.energyDnaHash}
                 </p>
               </div>

               {/* Metrics Grid */}
               <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                  <MetaItem label="Origin Turbine" value={tokenData.turbineId} icon={Database} />
                  <MetaItem label="Energy Output" value={`${tokenData.energyOutput} kW`} icon={Zap} />
                  <MetaItem label="Wind Speed" value={`${tokenData.windSpeed} m/s`} icon={Wind} />
                  <MetaItem label="Timestamp" value={tokenData.timestamp ? new Date(!isNaN(tokenData.timestamp) ? Number(tokenData.timestamp) : tokenData.timestamp).toLocaleString('en-GB') : 'N/A'} icon={Clock} />
               </div>

               {/* Owner Section */}
               <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60">
                 <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-3">Current Owner</p>
                 <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-sm font-mono flex items-center justify-between group">
                   <span className="text-emerald-600 dark:text-emerald-400 truncate">
                     {tokenData.ownerName || tokenData.ownerEmail ? (
                       <span className="flex items-center gap-2">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{tokenData.ownerName || tokenData.ownerEmail}</span>
                          <span className="text-[10px] opacity-50 px-1.5 py-0.5 border border-emerald-500/30 rounded">
                            {tokenData.owner?.slice(0,6)}...{tokenData.owner?.slice(-4)}
                          </span>
                       </span>
                     ) : (
                       tokenData.owner || 'Unknown Address'
                     )}
                   </span>
                   <ExternalLink size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"/>
                 </div>
               </div>

               {/* Action Buttons */}
               <div className="pt-2 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={verifyHash} disabled={actionLoading === 'verify'} className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all shadow-md group ${verifyResult?.isValid ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'}`}>
                      <Shield size={20} className="group-hover:scale-110 transition-transform" /> 
                      {actionLoading === 'verify' ? 'Verifying...' : 'Verify DNA'}
                    </button>
                    <button onClick={() => setShowTransferModal(true)} disabled={!canTransfer} className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-900/20 group disabled:opacity-50 disabled:grayscale">
                      <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Transfer
                    </button>
                  </div>
                  <button onClick={retireToken} disabled={!canRetire} className="flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-md shadow-amber-900/20 group disabled:opacity-50 disabled:grayscale">
                    <Power size={20} className="group-hover:scale-110 transition-transform" /> Consume Energy
                  </button>
               </div>

               {/* Verify Result Display */}
               {verifyResult && (
                 <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 animate-in slide-in-from-top-2 duration-300 ${verifyResult.isValid ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'}`}>
                   {verifyResult.isValid 
                     ? <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" /> 
                     : <XCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                   }
                   <div>
                     <p className={`font-bold text-sm ${verifyResult.isValid ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>{verifyResult.message}</p>
                     {verifyResult.storedHash && (
                       <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1 break-all">ID: {verifyResult.storedHash.slice(0, 24)}...</p>
                     )}
                   </div>
                 </div>
               )}

               {/* Transfer Form Overlay */}
               {showTransferModal && (
                 <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 space-y-3 mt-4 animate-in slide-in-from-top-2 duration-300">
                   <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Secure Transfer - Token #{tokenData.tokenId}</p>
                   <input 
                     type="text" 
                     placeholder="Recipient Email or Phone" 
                     value={recipientIdentifier}
                     onChange={(e) => setRecipientIdentifier(e.target.value)}
                     className="w-full px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                   />
                   <div className="flex gap-2">
                     <button 
                       onClick={transferToken} 
                       disabled={!recipientIdentifier || actionLoading === 'transfer'} 
                       className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-bold transition-all shadow-sm"
                     >
                       {actionLoading === 'transfer' ? 'Transferring...' : 'Confirm Transfer'}
                     </button>
                     <button 
                       onClick={() => setShowTransferModal(false)} 
                       className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                     >
                       Cancel
                     </button>
                   </div>
                 </div>
               )}
            </div>
          </div>

          {/* Lifecycle Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 h-fit">
             <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-8 mt-2">Token Lifecycle History</h3>
             <div className="space-y-8 pl-4 border-l-2 border-emerald-100 dark:border-emerald-900/50 relative">
               {history.map((hist, idx) => {
                 const userWallet = user?.walletAddress?.toLowerCase();
                 const isReceiver = userWallet && hist.to?.toLowerCase() === userWallet;
                 const displayAction = hist.action === 'Transferred' ? (isReceiver ? 'Received' : 'Transferred') : hist.action;
                 return (
                 <div key={idx} className="relative">
                   <div className={`absolute -left-[23px] top-1 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 shadow-sm ring-1 ${
                     hist.action === 'Minted' ? 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900' :
                     hist.action === 'Transferred' ? 'bg-indigo-500 ring-indigo-100 dark:ring-indigo-900' :
                     'bg-amber-500 ring-amber-100 dark:ring-amber-900'
                   }`}></div>
                   <div className="space-y-2">
                     <span className={`text-xs font-bold uppercase tracking-wider ${
                       hist.action === 'Minted' ? 'text-emerald-600 dark:text-emerald-400' :
                       hist.action === 'Transferred' ? 'text-indigo-600 dark:text-indigo-400' :
                       'text-amber-600 dark:text-amber-400'
                     }`}>● {displayAction}</span>
                     <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{hist.date ? new Date(hist.date).toLocaleString('en-GB') : 'Date Unknown'}</p>
                     
                     <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-mono space-y-1 mt-2 shadow-inner">
                        <p className="flex justify-between text-slate-500 dark:text-slate-400">
                          From: 
                          <span className="text-slate-800 dark:text-slate-200 truncate ml-2 w-48 text-right">
                            {hist.fromName ? (
                              <span title={hist.from} className="cursor-help">{hist.fromName}</span>
                            ) : (
                              hist.from ? `${hist.from.slice(0,6)}...${hist.from.slice(-4)}` : 'N/A'
                            )}
                          </span>
                        </p>
                        <p className="flex justify-between text-slate-500 dark:text-slate-400">
                          To: 
                          <span className="text-slate-800 dark:text-slate-200 truncate ml-2 w-48 text-right">
                            {hist.toName ? (
                              <span title={hist.to} className="cursor-help">{hist.toName}</span>
                            ) : (
                              hist.to ? `${hist.to.slice(0,6)}...${hist.to.slice(-4)}` : 'N/A'
                            )}
                          </span>
                        </p>
                        <p className="flex justify-between text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800 pt-1 mt-1 font-semibold">
                          Transaction ID: 
                          <span className="text-emerald-600 dark:text-emerald-400 truncate ml-2 w-48 text-right font-bold" title={hist.txHash}>
                            {hist.txHash ? `${hist.txHash.slice(0,10)}...${hist.txHash.slice(-8)}` : 'N/A'}
                          </span>
                        </p>
                     </div>
                   </div>
                 </div>
                 );
                })}
               {history.length === 0 && <p className="text-slate-400 dark:text-slate-600 text-sm italic">No history available for this token.</p>}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase font-semibold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
        {Icon && <Icon size={14} />} {label}
      </p>
      <p className="font-medium text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
}
