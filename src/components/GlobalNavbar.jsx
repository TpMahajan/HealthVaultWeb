import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, Bell, BellRing, User, UserCircle, Settings, LogOut,
  Sun, Moon, ChevronDown, Shield, LayoutDashboard, UserCheck,
  Users, MessageSquare, QrCode, FolderHeart, History, ScanLine
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const GlobalNavbar = ({ setSidebarOpen, desktopSidebarCollapsed, setDesktopSidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const {
    notifications,
    unreadCount,
    highlightedNotificationIds,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    toastNotification,
    setToastNotification
  } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const { pathname } = useLocation();

  const resolveUserAvatar = (profile) => {
    const rawAvatar = String(
      profile?.avatar ||
      profile?.avatarUrl ||
      profile?.profileImage ||
      profile?.profilePicture ||
      ""
    ).trim();
    if (!rawAvatar) return "";
    if (/^(https?:)?\/\//i.test(rawAvatar) || rawAvatar.startsWith("data:")) {
      return rawAvatar;
    }
    if (rawAvatar.startsWith("/uploads/")) return `http://localhost:5000${rawAvatar}`;
    if (rawAvatar.startsWith("uploads/")) return `http://localhost:5000/${rawAvatar}`;
    if (rawAvatar.startsWith("/")) return `http://localhost:5000${rawAvatar}`;
    return `http://localhost:5000/uploads/${rawAvatar}`;
  };

  const navbarAvatarSrc = resolveUserAvatar(user);

  // Close menus when route changes
  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [navbarAvatarSrc]);

  // Click outside functionality - Detects click on document
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close profile if clicking outside
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      // Close notifications if clicking outside
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    if (profileOpen || notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen, notificationsOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/patients') return 'Active Session';
    if (path === '/all-patients') return 'Patient Manager';
    if (path === '/messages') return 'Messages';
    if (path === '/scan') return 'QR Scanner';
    if (path === '/vault') return 'Medical Vault';
    if (path === '/profile') return 'My Profile';
    if (path === '/settings') return 'Settings';
    if (path === '/history') return 'Session History';
    if (path.startsWith('/patient-details')) return 'Patient Details';
    return 'Medical Vault';
  };

  const getPageIcon = () => {
    const path = location.pathname;
    const cls = 'h-[15px] w-[15px] shrink-0';
    if (path === '/dashboard') return <LayoutDashboard className={cls} />;
    if (path === '/patients') return <UserCheck className={cls} />;
    if (path === '/all-patients') return <Users className={cls} />;
    if (path === '/messages') return <MessageSquare className={cls} />;
    if (path === '/scan') return <QrCode className={cls} />;
    if (path === '/vault') return <FolderHeart className={cls} />;
    if (path === '/profile') return <User className={cls} />;
    if (path === '/settings') return <Settings className={cls} />;
    if (path === '/history') return <History className={cls} />;
    if (path.startsWith('/patient-details')) return <UserCheck className={cls} />;
    return <LayoutDashboard className={cls} />;
  };

  const resolveNotificationTarget = (notification) => {
    const data =
      notification?.data && typeof notification.data === "object"
        ? notification.data
        : {};
    const deepLink = String(
      data.deepLink || notification?.deepLink || ""
    ).trim();
    if (deepLink) {
      if (/^https?:\/\//i.test(deepLink)) {
        return { externalUrl: deepLink, path: "" };
      }
      if (deepLink.startsWith("healthvault://")) {
        const normalized = deepLink.replace("healthvault://", "/");
        return { path: normalized.startsWith("/") ? normalized : "/dashboard" };
      }
      if (deepLink.startsWith("/")) {
        return { path: deepLink };
      }
    }

    const type = String(data.type || notification?.type || "").toLowerCase();
    const currentRole = String(
      user?.role || localStorage.getItem("role") || ""
    )
      .trim()
      .toLowerCase();
    if (type === "direct_message" || type === "patient_message" || type === "doctor_message") {
      const currentUserId = String(
        user?.id || user?._id || ""
      ).trim();
      let counterpartId = String(data.counterpartId || "").trim();

      if (!counterpartId || (currentUserId && counterpartId === currentUserId)) {
        counterpartId = String(
          (currentRole === "doctor" ? data.patientId : data.doctorId) ||
            data.senderId ||
            ""
        ).trim();
      }

      return {
        path: counterpartId
          ? `/messages?counterpart=${encodeURIComponent(counterpartId)}`
          : "/messages",
      };
    }

    if (type === "session_extension_request" || type === "session_extension_response") {
      return { path: currentRole === "doctor" ? "/patients" : "/dashboard" };
    }

    const hasAppointment = Boolean(data.appointmentId);
    if (hasAppointment || type.includes("appointment")) {
      return { path: "/dashboard" };
    }
    if (type.includes("session")) {
      return { path: "/patients" };
    }
    if (type.includes("document") || type.includes("file")) {
      return { path: "/vault" };
    }
    return { path: "/dashboard" };
  };

  const handleNotificationClick = async (notification) => {
    const notificationId = String(notification?.id || "").trim();
    if (!notificationId) return;
    if (!notification.read) {
      await markAsRead(notificationId);
    }
    const target = resolveNotificationTarget(notification);
    setNotificationsOpen(false);
    if (target.externalUrl) {
      window.open(target.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (target.path) {
      navigate(target.path);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#1F1F1F]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 px-6 py-0 flex items-center justify-between transition-all duration-300 h-[65px]">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2.5 bg-primary text-white rounded-2xl shadow-lg active:scale-95 transition-all duration-200"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div
          className="group flex items-center gap-2 px-4 py-2 rounded-[14px] border transition-all duration-300 ease-in-out
            bg-white/50 dark:bg-white/[0.06]
            border-white/60 dark:border-white/[0.12]
            shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.12)]
            backdrop-blur-[12px]"
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <span className="text-slate-400 dark:text-white/40 transition-colors duration-300 group-hover:text-slate-500 dark:group-hover:text-white/60">
            {getPageIcon()}
          </span>
          <h1
            className="text-[15px] font-semibold tracking-tight text-slate-800 dark:text-white leading-none"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* ── Navbar chip animations ── */}
      <style>{`
        @keyframes chip-glow {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.45); }
          50%  { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes bell-shake {
          0%,100% { transform: rotate(0deg); }
          15%     { transform: rotate(-18deg); }
          30%     { transform: rotate(16deg); }
          45%     { transform: rotate(-12deg); }
          60%     { transform: rotate(10deg); }
          75%     { transform: rotate(-6deg); }
          90%     { transform: rotate(4deg); }
        }
        @keyframes sun-spin {
          from { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(200deg) scale(1.25); }
          to   { transform: rotate(360deg) scale(1); }
        }
        @keyframes moon-bounce {
          0%,100% { transform: translateY(0) scale(1); }
          40%     { transform: translateY(-4px) scale(1.15); }
          70%     { transform: translateY(2px) scale(0.95); }
        }
        .chip-btn:active { animation: chip-glow 0.4s ease-out forwards; }
        .bell-icon       { animation: bell-shake 0.6s ease-in-out; }
        .sun-icon:active { animation: sun-spin 0.55s ease-in-out; }
        .dark .chip-dark-visible {
          background: rgba(255,255,255,0.10) !important;
          border-color: rgba(255,255,255,0.22) !important;
        }
      `}</style>

      {/* ── Right section: 3 separate glass chips ── */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle — glass chip */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Light Mode' : 'Dark Mode'}
          className="chip-btn relative group inline-flex items-center justify-center w-10 h-10 rounded-[12px]
            bg-white/60 dark:bg-white/[0.10]
            border border-slate-200/80 dark:border-white/[0.22]
            shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]
            backdrop-blur-[10px]
            transition-all duration-[250ms] ease-out
            hover:-translate-y-[3px] hover:scale-[1.06]
            hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]
            hover:bg-white/80 dark:hover:bg-white/[0.16]
            hover:border-slate-300 dark:hover:border-white/[0.35]
            active:scale-95 active:translate-y-0"
        >
          {isDark ? (
            <Sun
              key="sun"
              className="h-5 w-5 text-amber-400 transition-transform duration-500 group-hover:rotate-[30deg] group-active:rotate-180"
            />
          ) : (
            <Moon
              key="moon"
              className="h-5 w-5 text-slate-600 transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110"
            />
          )}
        </button>

        {/* Notification Center */}
        {/* Notification Bell — glass chip */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileOpen(false);
            }}
            className={`chip-btn relative group inline-flex items-center justify-center w-10 h-10 rounded-[12px]
              bg-white/60 dark:bg-white/[0.10]
              border border-slate-200/80 dark:border-white/[0.22]
              shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]
              backdrop-blur-[10px]
              transition-all duration-[250ms] ease-out
              hover:-translate-y-[3px] hover:scale-[1.06]
              hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]
              hover:bg-white/80 dark:hover:bg-white/[0.16]
              hover:border-slate-300 dark:hover:border-white/[0.35]
              active:scale-95 active:translate-y-0
              ${notificationsOpen ? 'bg-white/80 dark:bg-white/[0.16] border-slate-300 dark:border-white/[0.35] shadow-[0_8px_24px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] -translate-y-[2px]' : ''}`}
          >
            <BellRing className={`h-5 w-5 transition-all duration-300
              group-hover:scale-110
              ${unreadCount > 0 ? 'text-[#2E2E2E] dark:text-white bell-icon' : 'text-[#1F2937] dark:text-[#E4E8EE]'}
              `} />
            {highlightedNotificationIds.length > 0 && (
              <span className="absolute inset-0 rounded-[12px] ring-2 ring-rose-400/60 animate-pulse pointer-events-none" />
            )}

            {/* Unread Count Badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#A8E6A3] text-[#2E2E2E] text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#1F1F1F] shadow-lg animate-in zoom-in duration-300">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-4 w-[320px] bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/10 rounded-[16px] shadow-xl dark:shadow-black/60 z-[70] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 transform-gpu origin-top-right">
              <style>
                {`
                  .notif-scrollbar::-webkit-scrollbar {
                    width: 4px;
                  }
                  .notif-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .notif-scrollbar::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 10px;
                  }
                  .dark .notif-scrollbar::-webkit-scrollbar-thumb {
                    background: #475569;
                  }
                `}
              </style>

              <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-baseline bg-gray-50/30 dark:bg-[#1e1e1e]">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-bold text-[#1F2937] dark:text-white uppercase tracking-wider">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#EEF3F7] dark:bg-[#EEF3F7]/20 text-[#2E2E2E] text-[10px] font-bold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors uppercase tracking-wider"
                  >
                    Mark Read
                  </button>
                  <button
                    onClick={clearAllNotifications}
                    className="text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors uppercase tracking-wider"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto notif-scrollbar scroll-smooth">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center px-6">
                    <div className="h-12 w-12 bg-[#EEF3F7] dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BellRing className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm font-semibold text-[#1F2937] dark:text-white mb-1">No new notifications</p>
                    <p className="text-[12px] text-gray-500 dark:text-gray-500">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const getTypeStyle = () => {
                      const title = n.title?.toLowerCase() || '';
                      const type = n.type?.toLowerCase() || '';

                      if (title.includes('emergency') || title.includes('critical') || type === 'alert' || type === 'error') {
                        return { bg: 'bg-[#FEE2E2] text-red-600 dark:bg-red-500/20 dark:text-red-400', icon: BellRing };
                      } else if (title.includes('success') || title.includes('completed') || type === 'success') {
                        return { bg: 'bg-[#DCFCE7] text-green-600 dark:bg-green-500/20 dark:text-green-400', icon: BellRing };
                      }
                      return { bg: 'bg-[#DBEAFE] text-[#2E2E2E] dark:bg-[#EEF3F7]/20 dark:text-[#2F9E6F]', icon: BellRing };
                    };

                    const typeStyle = getTypeStyle();
                    const TypeIcon = typeStyle.icon;

                    const formatTime = (timestamp) => {
                      if (!timestamp) return 'Now';
                      const date = new Date(timestamp);
                      const now = new Date();
                      const diffMs = now - date;
                      const diffMins = Math.floor(diffMs / 60000);
                      if (diffMins < 1) return 'Now';
                      if (diffMins < 60) return `${diffMins}m`;
                      const diffHours = Math.floor(diffMins / 60);
                      if (diffHours < 24) return `${diffHours}h`;
                      return `${Math.floor(diffHours / 24)}d`;
                    };

                    const isHighlighted = highlightedNotificationIds.includes(
                      String(n.id || "")
                    );

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`px-5 py-4 border-b border-gray-50 dark:border-white/5 last:border-0 hover:bg-[#EEF3F7] dark:hover:bg-white/[0.04] cursor-pointer transition-all relative group ${!n.read ? 'bg-[#EEF3F7]/40 dark:bg-[#EEF3F7]/5' : ''
                          } ${isHighlighted ? 'ring-1 ring-amber-300/80 bg-amber-50/70 dark:bg-amber-900/20' : ''
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${typeStyle.bg} transition-transform group-hover:scale-110`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <p className={`text-[13px] font-bold leading-tight truncate ${!n.read ? 'text-[#1F2937] dark:text-white' : 'text-[#1F2937] dark:text-[#E4E8EE]'}`}>
                                {n.title}
                              </p>
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase ml-2 shrink-0">
                                {formatTime(n.createdAt)}
                              </span>
                            </div>
                            <p className={`text-[11px] leading-relaxed line-clamp-2 ${!n.read ? 'text-[#1F2937] dark:text-[#E4E8EE]' : 'text-[#334155] dark:text-[#CBD5E1]'}`}>
                              {n.body || n.message}
                            </p>
                            {(n.data?.deepLink || n.deepLink) && (
                              <p className="mt-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-400">
                                Tap to open
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile — glass chip */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            className={`chip-btn group inline-flex items-center gap-2.5 px-3 py-2 rounded-[12px]
              bg-white/60 dark:bg-white/[0.10]
              border border-slate-200/80 dark:border-white/[0.22]
              shadow-[0_2px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]
              backdrop-blur-[10px]
              transition-all duration-[250ms] ease-out
              hover:-translate-y-[3px] hover:scale-[1.03]
              hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]
              hover:bg-white/80 dark:hover:bg-white/[0.16]
              hover:border-slate-300 dark:hover:border-white/[0.35]
              active:scale-95 active:translate-y-0
              ${profileOpen ? 'bg-white/80 dark:bg-white/[0.16] border-slate-300 dark:border-white/[0.35] shadow-[0_8px_24px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] -translate-y-[2px]' : ''}`}
          >
            {/* Circular Avatar (40px) */}
            <div className="h-10 w-10 rounded-full bg-[#EEF3F7] dark:bg-[#1A1C23] flex items-center justify-center p-[2px] shadow-sm transition-transform duration-300 group-hover:scale-105 border border-[#E4E8EE] dark:border-white/10">
              <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center">
                {navbarAvatarSrc && !avatarLoadFailed ? (
                  <img
                    src={navbarAvatarSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-[#BFEFFF]/30">
                    <User className="h-5 w-5 text-[#1F2937]" />
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-[#1F2937] dark:text-white leading-none tracking-tight">
                {user?.name?.split(' ')[0] || 'User'}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`h-1.5 w-1.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] ${user?.isActive !== false ? 'bg-emerald-500' : 'bg-[#E4E8EE]'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${user?.isActive !== false ? 'text-emerald-600 dark:text-emerald-500' : 'text-[#1F2937] dark:text-[#E4E8EE]'}`}>
                  {user?.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Dropdown Arrow */}
            <ChevronDown className={`h-4 w-4 ml-1 text-[#1F2937] transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-4 w-60 bg-white dark:bg-[#141414] border border-[#E4E8EE] dark:border-white/10 rounded-3xl shadow-2xl dark:shadow-black/60 z-[70] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 transform-gpu origin-top-right">
              {/* Header */}
              <div className="p-5 border-b border-[#E4E8EE] dark:border-white/5 bg-[#EEF3F7] dark:bg-[#1e1e1e]">
                <div className="flex flex-col">
                  <span className="text-[13px] font-black text-[#1F2937] dark:text-white uppercase tracking-tight truncate">
                    {user?.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Shield className="h-3 w-3 text-[#2F9E6F] dark:text-emerald-400" />
                    <span className="text-[10px] font-bold text-[#64748B] dark:text-gray-400 uppercase tracking-widest">
                      {user?.role === 'patient' ? 'Verified Patient' : (user?.specialty || 'Medical Professional')}
                    </span>
                  </div>
                </div>
              </div>
              {/* Menu Items */}
              <div className="p-2.5">
                <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-[#1F2937] dark:text-gray-300 hover:text-[#2E2E2E] dark:hover:text-white hover:bg-[#EEF3F7] dark:hover:bg-white/5 rounded-2xl transition-all duration-200 uppercase tracking-wider group">
                  <UserCircle className="h-4 w-4 text-[#64748B] dark:text-gray-400 group-hover:text-[#2F9E6F] dark:group-hover:text-white transition-all duration-200 group-hover:scale-110" />
                  My Profile
                </Link>
                <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-[#1F2937] dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-white/5 rounded-2xl transition-all duration-200 uppercase tracking-wider group">
                  <Settings className="h-4 w-4 text-[#64748B] dark:text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-white transition-all duration-200 group-hover:scale-110" />
                  Settings
                </Link>
              </div>
              {/* Logout */}
              <div className="p-2.5 border-t border-[#E4E8EE] dark:border-white/5 bg-gray-50/50 dark:bg-[#141414]">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-black text-rose-500 dark:text-red-400 hover:text-rose-600 dark:hover:text-red-300 hover:bg-rose-50 dark:hover:bg-white/5 rounded-2xl transition-all duration-200 tracking-[0.1em] uppercase group"
                >
                  <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast Preview handled separately by its own timer */}

      {/* Toast Notification Preview */}
      {toastNotification && (
        <div className="fixed top-20 right-6 z-[100] animate-in slide-in-from-right-5 fade-in duration-500">
          <div className="w-[360px] bg-white/95 dark:bg-[#1A1C23]/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[16px] shadow-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-4">
                {/* Icon based on type */}
                <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${toastNotification.title?.toLowerCase().includes('emergency') || toastNotification.title?.toLowerCase().includes('critical') || toastNotification.type === 'alert'
                  ? 'bg-[#FEE2E2] text-red-600 dark:bg-red-500/20 dark:text-red-400'
                  : toastNotification.title?.toLowerCase().includes('success') || toastNotification.type === 'success'
                    ? 'bg-[#DCFCE7] text-green-600 dark:bg-green-500/20 dark:text-green-400'
                    : 'bg-[#DBEAFE] text-[#2E2E2E] dark:bg-[#EEF3F7]/20 dark:text-[#2F9E6F]'
                  }`}>
                  <BellRing className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-bold text-[#1F2937] dark:text-[#1F2937] leading-tight">
                      {toastNotification.title}
                    </p>
                    <button
                      onClick={() => setToastNotification(null)}
                      className="ml-2 text-[#1F2937] hover:text-[#1F2937] dark:hover:text-[#E4E8EE] transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[12px] text-[#1F2937] dark:text-[#E4E8EE] line-clamp-2 leading-relaxed">
                    {toastNotification.body || toastNotification.message}
                  </p>
                  <button
                    onClick={() => {
                      const target = toastNotification;
                      setToastNotification(null);
                      if (target) {
                        handleNotificationClick(target);
                      }
                    }}
                    className="mt-3 text-[11px] font-bold text-[#2E2E2E] hover:text-[#2F9E6F] dark:hover:text-[#A8E6A3] transition-colors uppercase tracking-wider"
                  >
                    Open Notification →
                  </button>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-100 dark:bg-white/5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#7EDC8B] to-[#2F9E6F] animate-[shrink_5s_linear_forwards]" style={{
                animation: 'shrink 5s linear forwards'
              }}></div>
            </div>
          </div>

          <style>
            {`
              @keyframes shrink {
                from { width: 100%; }
                to { width: 0%; }
              }
            `}
          </style>
        </div>
      )}
    </header>
  );
};

export default GlobalNavbar;
