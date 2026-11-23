import React from 'react';
import { History, CheckCircle2, MessageSquare, FileText, ArrowRight, Clock } from 'lucide-react';
import { ActivityLog, Team } from '../types';

interface ActivityFeedProps {
  team: Team | null;
  activities: ActivityLog[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ team, activities }) => {
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'task_created':
      case 'task_updated':
      case 'task_moved':
        return <CheckCircle2 className="w-4 h-4 text-indigo-400" />;
      case 'message_sent':
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case 'doc_created':
      case 'doc_edited':
        return <FileText className="w-4 h-4 text-amber-400" />;
      default:
        return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatActionTitle = (act: ActivityLog) => {
    try {
      const meta = JSON.parse(act.metadata_json);
      switch (act.action_type) {
        case 'task_created':
          return `Created task "${meta.title || 'Task'}"`;
        case 'task_moved':
          return `Moved task "${meta.title || 'Task'}" to ${meta.status || 'new column'}`;
        case 'task_updated':
          return `Updated task "${meta.title || 'Task'}"`;
        case 'doc_created':
          return `Created document "${meta.title || 'Document'}"`;
        case 'message_sent':
          return `Posted discussion message`;
        default:
          return act.action_type.replace('_', ' ');
      }
    } catch {
      return act.action_type.replace('_', ' ');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>{team?.name || 'Team'} Activity Stream</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            Audit Trail
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time event log tracking task shifts, document updates, and collaborative changes.
        </p>
      </div>

      <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 overflow-y-auto">
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {activities.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">No activity logged yet.</div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="relative flex items-start space-x-3 group">
                {/* Bullet point on timeline */}
                <div className="absolute -left-6 mt-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                </div>

                <div className="p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition flex-1 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
                      {getActionIcon(act.action_type)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">
                        {formatActionTitle(act)}
                      </p>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                        Entity: {act.entity_type} #{act.entity_id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
