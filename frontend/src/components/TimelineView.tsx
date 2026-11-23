import React from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Task, Project } from '../types';

interface TimelineViewProps {
  tasks: Task[];
  project: Project | null;
  onTaskStatusChange: (taskId: number, newStatus: any) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, project, onTaskStatusChange }) => {
  // Sort tasks by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  const now = new Date();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>{project?.name || 'Project'} Timeline & Milestones</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400">
            Interactive Gantt
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Visualize project schedule, target milestones, and detect approaching deadlines.
        </p>
      </div>

      <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 overflow-y-auto">
        <div className="space-y-4">
          {sortedTasks.map((task) => {
            const hasDueDate = Boolean(task.due_date);
            const dueDateObj = task.due_date ? new Date(task.due_date) : null;
            const isOverdue = dueDateObj && dueDateObj < now && task.status !== 'done';
            const isDueSoon = dueDateObj && dueDateObj >= now && (dueDateObj.getTime() - now.getTime()) < (86400000 * 2);

            let statusBadgeColor = 'bg-slate-800 text-slate-300';
            if (task.status === 'in_progress') statusBadgeColor = 'bg-indigo-900/70 text-indigo-300 border border-indigo-700';
            if (task.status === 'review') statusBadgeColor = 'bg-amber-900/70 text-amber-300 border border-amber-700';
            if (task.status === 'done') statusBadgeColor = 'bg-emerald-900/70 text-emerald-300 border border-emerald-700';

            return (
              <div 
                key={task.id} 
                className="p-4 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 rounded-xl transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3">
                  <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center ${
                    task.status === 'done' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-700/50 text-slate-300'
                  }`}>
                    {task.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-slate-100">{task.title}</h4>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${statusBadgeColor}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                    )}
                  </div>
                </div>

                {/* Right side: Timeline metrics */}
                <div className="flex items-center space-x-4 shrink-0">
                  {/* Deadline Indicator */}
                  {hasDueDate ? (
                    <div className="flex items-center space-x-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-300">
                        {dueDateObj?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overdue</span>
                        </span>
                      )}
                      {isDueSoon && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Due Soon
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">No deadline set</span>
                  )}

                  {/* Estimated Hours */}
                  <div className="text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    <span className="text-slate-200 font-semibold">{task.estimated_hours}</span> hrs
                  </div>

                  {/* Assignee Avatar */}
                  <div className="flex items-center space-x-1.5">
                    <img 
                      src={task.assignee?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee_id || 'unassigned'}`}
                      alt="assignee"
                      className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600"
                    />
                    <span className="text-xs text-slate-300 font-medium">
                      {task.assignee?.full_name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
