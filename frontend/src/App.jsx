import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MintEnergy from './pages/MintEnergy';
import TokenExplorer from './pages/TokenExplorer';
import TraceEnergy from './pages/TraceEnergy';
import GridVisualization from './pages/GridVisualization';
import LandingPage from './pages/LandingPage';
import AuthUser from './pages/AuthUser';
import AuthWindPlant from './pages/AuthWindPlant';
import { useWallet } from './WalletContext';
import { useAuth, AuthProvider } from './AuthContext';
import { Wind, Activity, Search, Map, Zap, Wallet, Moon, Sun, LogOut, User, Bell, ChevronDown, Menu, X } from 'lucide-react';
import ProfileSettings from './pages/ProfileSettings';
import { ThemeToggle } from './components/ThemeToggle';
import { Toaster } from 'react-hot-toast';

function AppNavLink({ to, icon: Icon, children, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-1.5 font-medium px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'text-slate-600 hover:bg-slate-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400'}`}
    >
      <Icon size={18}/> {children}
    </Link>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isGuest, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  
  // Require authentication for protected routes
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppLayout() {
  const navigate = useNavigate();
  const { account, connectWallet } = useWallet();
  const { user, logout, isWindPlant, unreadCount, notifications, clearNotifications, markNotificationRead } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowProfileDropdown(false);
    if (showProfileDropdown) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showProfileDropdown]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Toaster position="top-right" toastOptions={{ className: 'dark:bg-slate-800 dark:text-white border border-slate-100 dark:border-slate-800 shadow-xl rounded-xl', duration: 4000 }} />
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-emerald-100 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-emerald-400 to-green-600 p-2 rounded-xl text-white shadow-md">
              <Wind size={24} className="animate-[spin_4s_linear_infinite]"/>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-800 dark:from-emerald-400 dark:to-teal-500">EnergyDNA</h1>
          </Link>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex gap-1 items-center">
              <ThemeToggle />
              <AppNavLink to="/dashboard" icon={Activity}>Dashboard</AppNavLink>
              <AppNavLink to="/mint" icon={Zap}>{user ? (isWindPlant ? 'Mint Energy' : 'My Tokens') : 'Wind Portal'}</AppNavLink>
              <AppNavLink to="/explorer" icon={Search}>Explorer</AppNavLink>
              <AppNavLink to="/trace" icon={Wind}>Trace</AppNavLink>
              <AppNavLink to="/grid" icon={Map}>Grid</AppNavLink>
            </nav>
            <div className="flex items-center gap-2">
              {/* Wallet — only shown for Wind Plant employees */}
              {(!user || isWindPlant) && (
                <button onClick={connectWallet} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm">
                  <Wallet size={14} className="hidden sm:block"/>
                  <span className="truncate max-w-[100px] sm:max-w-none">
                    {account ? `${account.substring(0,4)}...${account.substring(38)}` : 'Connect'}
                  </span>
                </button>
              )}

              {/* Profile Dropdown */}
              {user && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none relative ml-1 sm:ml-2"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md bg-gradient-to-br ${isWindPlant ? 'from-emerald-400 to-teal-600' : 'from-indigo-500 to-purple-600'}`}>
                      {getInitials(isWindPlant ? (user.plantName || user.name || 'WP') : (user.name || 'U'))}
                    </div>
                    <ChevronDown size={14} className={`hidden sm:block text-slate-400 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                    
                    {/* Green Dot Notification Badge */}
                    {unreadCount > 0 && (
                      <span className="absolute bottom-0 right-1 sm:right-5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse shadow-sm"></span>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-72 sm:w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                      {/* Notifications Header */}
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold">
                          <Bell size={16} /> 
                          <span>Notifications</span>
                          {unreadCount > 0 && (
                            <span className="flex items-center justify-center bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full shadow-sm">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button onClick={clearNotifications} className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold uppercase tracking-wider">Clear All</button>
                        )}
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-60 overflow-y-auto">
                        {notifications.filter(n => !n.read).length > 0 ? (
                          notifications.filter(n => !n.read).map((n) => (
                            <div 
                              key={n._id} 
                              onClick={() => {
                                markNotificationRead(n._id);
                                if (n.tokenId !== undefined && n.tokenId !== null) {
                                  navigate(`/explorer?tokenId=${n.tokenId}`);
                                } else {
                                  navigate('/dashboard');
                                }
                                setShowProfileDropdown(false);
                              }}
                              className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-800/50 last:border-0 bg-indigo-50/30 dark:bg-indigo-900/10"
                            >
                              <p className="text-xs leading-relaxed text-slate-900 dark:text-white font-semibold">{n.message}</p>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                                {new Date(n.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-slate-400 text-xs italic">No new notifications</div>
                        )}
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                        <Link 
                          to="/profile" 
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <User size={16} /> View Profile
                        </Link>
                        <button 
                          onClick={() => { logout(); setShowProfileDropdown(false); navigate('/'); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                        >
                          <LogOut size={16} /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Mobile Menu Toggle button */}
            <button 
              className="md:hidden ml-1 p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation Drawer */}
        {showMobileMenu && (
          <div className="md:hidden px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 space-y-2 animate-in slide-in-from-top-4 duration-200">
            <div className="flex justify-between items-center mb-4 px-3">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Menu</span>
              <ThemeToggle />
            </div>
            <AppNavLink to="/dashboard" icon={Activity} onClick={() => setShowMobileMenu(false)}>Dashboard</AppNavLink>
            <AppNavLink to="/mint" icon={Zap} onClick={() => setShowMobileMenu(false)}>{user ? (isWindPlant ? 'Mint Energy' : 'My Tokens') : 'Wind Portal'}</AppNavLink>
            <AppNavLink to="/explorer" icon={Search} onClick={() => setShowMobileMenu(false)}>Explorer</AppNavLink>
            <AppNavLink to="/trace" icon={Wind} onClick={() => setShowMobileMenu(false)}>Trace</AppNavLink>
            <AppNavLink to="/grid" icon={Map} onClick={() => setShowMobileMenu(false)}>Grid</AppNavLink>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/mint" element={<ProtectedRoute><MintEnergy /></ProtectedRoute>} />
          <Route path="/explorer" element={<TokenExplorer />} />
          <Route path="/trace" element={<TraceEnergy />} />
          <Route path="/grid" element={<GridVisualization />} />
          <Route path="/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}


function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/user" element={<AuthUser />} />
      <Route path="/auth/plant" element={<AuthWindPlant />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
