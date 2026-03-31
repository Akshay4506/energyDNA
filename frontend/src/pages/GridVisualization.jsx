import React from 'react';
import { Network, Battery, Factory, Home } from 'lucide-react';

export default function GridVisualization() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-4">Grid Visualization</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Track the flow of renewable energy from the wind farm to the final consumer using our blockchain abstraction model.</p>
      </div>

      <div className="relative pt-12">
        {/* Animated Background Line */}
        <div className="absolute top-1/2 left-[10%] right-[10%] h-1 bg-slate-200 dark:bg-slate-800 rounded-full -translate-y-1/2 hidden md:block z-0">
          <div className="h-full bg-emerald-400 dark:bg-emerald-600 rounded-full w-full animate-[pulse_3s_ease-in-out_infinite] opacity-50"></div>
          <div className="h-full bg-emerald-500 dark:bg-emerald-400 w-1/4 rounded-full absolute top-0 left-0 animate-[ping_4s_linear_infinite]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
          
          {/* Node 1 */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full border-4 border-emerald-100 dark:border-emerald-900/60 shadow-xl flex items-center justify-center flex-shrink-0 mb-6 group relative">
               <div className="absolute inset-0 bg-emerald-400 dark:bg-emerald-600 rounded-full animate-ping opacity-20"></div>
               <Factory size={40} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Wind Turbine</h3>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-2 px-4">Energy is generated and an EnergyDNA hash is created to represent this specific unit.</p>
            <span className="mt-4 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-400 rounded-full">Token State: Minted</span>
          </div>

          {/* Node 2 */}
          <div className="flex flex-col items-center mt-12 md:mt-0">
            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full border-4 border-blue-100 dark:border-blue-900/60 shadow-xl flex items-center justify-center flex-shrink-0 mb-6 group relative">
               <Network size={40} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Regional Grid</h3>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-2 px-4">Energy is injected into the regional transmission network for distribution.</p>
            <span className="mt-4 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-400 rounded-full">Token State: Transferred</span>
          </div>

          {/* Node 3 */}
          <div className="flex flex-col items-center mt-12 md:mt-0">
            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full border-4 border-amber-100 dark:border-amber-900/60 shadow-xl flex items-center justify-center flex-shrink-0 mb-6 group relative">
               <Battery size={40} className="text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Distributor Hub</h3>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-2 px-4">Local energy distributors acquire the tokens acting as energy credits.</p>
            <span className="mt-4 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-400 rounded-full">Token State: Transferred</span>
          </div>

          {/* Node 4 */}
          <div className="flex flex-col items-center mt-12 md:mt-0">
            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full border-4 border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center flex-shrink-0 mb-6 group relative">
               <Home size={40} className="text-slate-600 dark:text-slate-400 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">End Consumer</h3>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-2 px-4">Energy is consumed. The token is retired to prevent double counting.</p>
            <span className="mt-4 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-full">Token State: Retired</span>
          </div>

        </div>
      </div>
      
      <div className="mt-20 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 rounded-2xl max-w-4xl mx-auto">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">How It Works</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          The physical flow of electricity cannot be strictly routed from a specific turbine to a specific house. Instead, 
          blockchain-based tracing solves the "double counting" problem by tying a digital certificate (EnergyDNA Token)
          to a real unit of production. When a corporation or individual buys that renewable energy, they purchase the certificate 
          and permanently "retire" it, ensuring unparalleled transparent provenance.
        </p>
      </div>
    </div>
  );
}
