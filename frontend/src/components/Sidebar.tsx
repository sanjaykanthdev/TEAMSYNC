import React from 'react';
import { 
  Kanban, Calendar, MessageSquare, FileText, BarChart3, History
} from 'lucide-react';

export type ActiveTab = 'kanban' | 'timeline' | 'chat' | 'docs' | 'workload' | 'activity';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'kanban', label: 'Kanban Board', icon: <Kanban className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline & Gantt', icon: <Calendar className="w-4 h-4" /> },
    { id: 'chat', label: 'Team Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'docs', label: 'Collaborative Docs', icon: <FileText className="w-4 h-4" /> },
    { id: 'workload', label: 'Team Workload', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity History', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-56 border-r border-slate-800 bg-slate-900/60 flex flex-col py-4 justify-between shrink-0 select-none">
      <div className="space-y-1 px-3">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Workspace Views
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-3 mx-3 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300">Sync Engine Active</p>
        <p className="text-[10px] text-slate-500">Yjs CRDT + Redis Pub/Sub + Celery Schedulers</p>
      </div>
    </aside>
  );
};
