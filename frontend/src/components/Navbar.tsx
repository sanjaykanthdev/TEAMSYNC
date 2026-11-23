import React, { useState } from 'react';
import { 
  Bell, CheckCircle2, Wifi, WifiOff, Users, FolderKanban, 
  ChevronDown, LogOut, Plus
} from 'lucide-react';
import { User, Team, Project, NotificationItem } from '../types';

interface NavbarProps {
  currentUser: User | null;
  teams: Team[];
  activeTeam: Team | null;
  onSelectTeam: (team: Team) => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: number) => void;
  isOnline: boolean;
  onLogout: () => void;
  onCreateProjectClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  teams,
  activeTeam,
  onSelectTeam,
  projects,
  activeProject,
  onSelectProject,
  notifications,
  onMarkNotificationRead,
  isOnline,
  onLogout,
  onCreateProjectClick
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Team Switcher */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            TS
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            TEAMSYNC
          </span>
        </div>

        {/* Team Selector */}
        <div className="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <select 
            className="bg-transparent outline-none cursor-pointer font-medium text-slate-200"
            value={activeTeam?.id || ''}
            onChange={(e) => {
              const team = teams.find(t => t.id === Number(e.target.value));
              if (team) onSelectTeam(team);
            }}
          >
            {teams.map(t => (
              <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">{t.name}</option>
            ))}
          </select>
        </div>

        {/* Project Selector */}
        <div className="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
          <FolderKanban className="w-3.5 h-3.5 text-cyan-400" />
          <select 
            className="bg-transparent outline-none cursor-pointer font-medium text-slate-200 max-w-[160px] truncate"
            value={activeProject?.id || ''}
            onChange={(e) => {
              const proj = projects.find(p => p.id === Number(e.target.value));
              if (proj) onSelectProject(proj);
            }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">{p.name}</option>
            ))}
          </select>
          <button 
            onClick={onCreateProjectClick}
            title="Create Project"
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right side utilities */}
      <div className="flex items-center space-x-4">
        {/* Real-time Connection Status */}
        <div 
          className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
            isOnline 
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400' 
              : 'bg-rose-950/60 border-rose-800/80 text-rose-400'
          }`}
          title={isOnline ? 'Real-time WebSocket Live' : 'Offline - Mutations Queued Locally'}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-medium">Live Sync</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="font-medium">Offline Mode</span>
            </>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
                <span className="text-xs font-bold text-slate-200">Live Deadline Reminders & Alerts</span>
                <span className="text-[10px] text-slate-400">{unreadCount} unread</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No notifications yet.</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => onMarkNotificationRead(n.id)}
                      className={`p-3 text-xs cursor-pointer hover:bg-slate-800/60 transition ${
                        !n.is_read ? 'bg-indigo-950/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200">{n.title}</span>
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                      </div>
                      <p className="text-slate-400 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <img 
              src={currentUser?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=user"} 
              alt={currentUser?.full_name}
              className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600"
            />
            <span className="text-xs font-medium text-slate-200 hidden sm:inline">{currentUser?.full_name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-3 border-b border-slate-800">
                <p className="text-xs font-semibold text-slate-200">{currentUser?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
              </div>
              <button 
                onClick={onLogout}
                className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-slate-800 flex items-center space-x-2 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
