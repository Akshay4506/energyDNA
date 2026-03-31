import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Wind, ArrowLeft, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import axios from 'axios';

export default function AuthWindPlant() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        const res = await axios.post('http://localhost:5000/auth/signup', { ...form, role: 'windplant' });
        login(res.data.token, res.data.user);
      } else {
        const res = await axios.post('http://localhost:5000/auth/login', { email: form.email, password: form.password, role: 'windplant' });
        login(res.data.token, res.data.user);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      {/* Nav */}
      <header className="border-b border-slate-200 dark:border-slate-800/60 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-400 to-green-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-900/30">
              <Wind size={20} className="animate-[spin_4s_linear_infinite]"/>
            </div>
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">EnergyDNA</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl dark:shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-2">
            {isSignup ? 'Wind Plant Employee Signup' : 'Wind Plant Employee Login'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8">
            {isSignup ? 'Register as an employee to mint energy tokens' : 'Login as employee to manage your energy tokens'}
          </p>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Employee Name</label>
                  <input name="name" value={form.name} onChange={handleChange} required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="e.g. Jane Doe" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Mobile Number</label>
                  <input name="mobile" value={form.mobile} onChange={handleChange} required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="e.g. +91 9876543210" />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="windplant@energy.com" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange} required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all pr-12" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-slate-400 hover:text-white">
                  {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            {/* Removed Owner Key field for Employees */}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (isSignup ? 'Create Account' : 'Login')}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            {isSignup ? "Already have an account? " : "Don't have a wind plant account? "}
            <button onClick={() => { setIsSignup(!isSignup); setError(''); }} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-semibold">
              {isSignup ? 'Login' : 'Sign up'}
            </button>
          </p>

          <div className="mt-4 text-center">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <ArrowLeft size={14}/> Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
