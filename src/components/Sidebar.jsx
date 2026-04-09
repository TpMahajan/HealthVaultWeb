import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, History, UserCircle, Settings,
  Shield, LogOut, X, User, Activity, Menu, Clock, MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDoctor = user?.role !== 'patient';

  const navigationItems = user?.role === 'patient'
    ? [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'My medical Vault', href: '/vault', icon: History },
      { name: 'Messages', href: '/messages', icon: MessageCircle },
      { name: 'Profile', href: '/profile', icon: UserCircle },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
    : [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Active Session', href: '/patients', icon: Activity },
      { name: 'Patient Manager', href: '/all-patients', icon: Users },
      { name: 'Session History', href: '/history', icon: History },
      { name: 'Messages', href: '/messages', icon: MessageCircle },
      { name: 'Profile', href: '/profile', icon: UserCircle },
      { name: 'Settings', href: '/settings', icon: Settings },
    ];

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  const NavItem = ({ item, mobile = false }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.href;

    if (mobile) {
      return (
        <button
          key={item.name}
          onClick={() => {
            navigate(item.href);
            setIsOpen(false);
          }}
          className={`relative w-full flex items-center space-x-4 px-4 py-3.5 rounded-xl transition-all duration-300 group overflow-hidden ${isActive
            ? 'bg-primary/10 text-primary after:absolute after:left-0 after:h-6 after:w-1 after:bg-primary after:rounded-r-full after:shadow-[0_0_12px_var(--primary-color)]'
            : 'text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white hover:bg-primary/5 dark:hover:bg-white/5'
            }`}
        >
          <Icon className={`h-[22px] w-[22px] ${isActive ? 'text-primary' : 'group-hover:text-primary'} transition-all duration-300`} />
          <span className="font-semibold tracking-wide" style={{ fontFamily: "'Outfit', sans-serif" }}>{item.name}</span>
        </button>
      );
    }

    return (
      <button
        key={item.name}
        onClick={() => navigate(item.href)}
        className={`relative w-full flex items-center ${isCollapsed ? 'justify-center mx-auto' : 'space-x-4'} px-4 py-4 rounded-2xl transition-all duration-200 group overflow-hidden ${isActive
          ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary'
          : 'text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white hover:bg-primary/5 hover:bg-white/10 dark:hover:bg-white/10'
          }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full shadow-[0_0_15px_var(--primary-color)] animate-pulse" />
        )}
        <Icon className={`${isCollapsed ? 'h-6 w-6' : 'h-[22px] w-[22px]'} ${isActive ? 'scale-110 drop-shadow-[0_0_8px_var(--primary-color)]' : 'group-hover:scale-110 group-hover:text-primary'} transition-all duration-500 ease-out`} />
        {!isCollapsed && (
          <span className={`font-medium tracking-inter whitespace-nowrap transition-all duration-500 ${isActive ? 'opacity-100' : 'text-slate-500 dark:text-slate-400 opacity-90 group-hover:opacity-100'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
            {item.name}
          </span>
        )}

      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar Rail */}
      <aside className={`hidden lg:flex flex-col bg-white dark:bg-[#1F1F1F] fixed left-0 top-0 h-screen z-30 border-r border-gray-200 dark:border-white/5 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className={`px-6 py-3 border-b border-gray-200/50 dark:border-slate-800/50 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start space-x-3'} h-[65px] transition-all duration-300`}>
          {isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(false)}
              className="group/toggle relative p-2.5 text-slate-400 hover:text-primary hover:bg-white/10 dark:hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <Menu className="h-6 w-6" />
            </button>
          ) : (
            <>
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg shrink-0"
                style={{ background: 'var(--primary-gradient)' }}
              >
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="flex-1 text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none whitespace-nowrap overflow-hidden">
                Medical Vault
              </span>
              <button
                onClick={() => setIsCollapsed(true)}
                className="group/toggle relative p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white/10 dark:hover:bg-white/10 rounded-xl transition-all duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        <nav className="flex-1 py-10 px-4 space-y-4 overflow-y-auto custom-scrollbar">
          {navigationItems.map((item) => <NavItem key={item.name} item={item} />)}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-white/5">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 group/profile`}>
            <div className="relative cursor-pointer shrink-0" onClick={() => navigate('/profile')}>
              <div className={`h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all duration-300 ${isDoctor ? 'group-hover/profile:bg-primary/10 group-hover/profile:text-primary dark:group-hover/profile:bg-primary/20' : 'group-hover/profile:bg-blue-50 dark:group-hover/profile:bg-blue-500/10 group-hover/profile:text-blue-600'}`}>
                <UserCircle className="h-6 w-6" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 cursor-pointer overflow-hidden transition-all duration-500" onClick={() => navigate('/profile')}>
                <p className={`text-sm font-medium tracking-inter text-slate-900 dark:text-white truncate transition-colors ${isDoctor ? 'group-hover/profile:text-primary' : 'group-hover/profile:text-blue-600'}`}>{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium uppercase tracking-inter tracking-wider">{user?.role === 'patient' ? 'Patient' : 'Specialist'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] bg-slate-950/20 backdrop-blur-[2px] transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-[70] w-72 bg-white dark:bg-[#1F1F1F] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg"
                style={isDoctor
                  ? { background: 'var(--primary-gradient)', boxShadow: '0 8px 22px color-mix(in srgb, var(--primary-color) 26%, var(--secondary-color) 26%, transparent)' }
                  : { background: 'linear-gradient(to bottom right, #3b82f6, #4f46e5)' }}
              >
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Medical Vault</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => <NavItem key={item.name} item={item} mobile />)}
          </nav>

          <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <UserCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{user?.role === 'patient' ? 'Patient' : 'Specialist'}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
