import React, { useState } from 'react';
import { 
  Plus, MoreHorizontal, Clock, AlertCircle, CheckCircle2, User as UserIcon, Calendar, Filter
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority, Project, TeamMember } from '../types';

interface KanbanBoardProps {
  tasks: Task[];
  project: Project | null;
  teamMembers: TeamMember[];
  onTaskStatusChange: (taskId: number, newStatus: TaskStatus) => void;
  onTaskAssigneeChange: (taskId: number, newAssigneeId: number | undefined) => void;
  onCreateTask: (taskData: {
    title: string;
    description: string;
    priority: TaskPriority;
    assignee_id?: number;
    due_date?: string;
    estimated_hours: number;
    status: TaskStatus;
  }) => void;
  onDeleteTask: (taskId: number) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'border-slate-700 bg-slate-900/40' },
  { id: 'in_progress', label: 'In Progress', color: 'border-indigo-600/50 bg-indigo-950/20' },
  { id: 'review', label: 'Code Review', color: 'border-amber-600/50 bg-amber-950/20' },
  { id: 'done', label: 'Completed', color: 'border-emerald-600/50 bg-emerald-950/20' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  project,
  teamMembers,
  onTaskStatusChange,
  onTaskAssigneeChange,
  onCreateTask,
  onDeleteTask,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(4);
  const [targetColumn, setTargetColumn] = useState<TaskStatus>('todo');

  const filteredTasks = tasks.filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreateTask({
      title,
      description,
      priority,
      assignee_id: assigneeId,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      estimated_hours: Number(estimatedHours) || 0,
      status: targetColumn,
    });
    setTitle('');
    setDescription('');
    setShowCreateModal(false);
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Urgent</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">Medium</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-300">Low</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6">
      {/* Top Bar inside Kanban */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>{project?.name || 'Project Board'}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400">
              Live Sync Enabled
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {project?.description || 'Collaborative Kanban with real-time updates and live task assignment.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Priorities</option>
              <option value="urgent" className="bg-slate-900">Urgent</option>
              <option value="high" className="bg-slate-900">High</option>
              <option value="medium" className="bg-slate-900">Medium</option>
              <option value="low" className="bg-slate-900">Low</option>
            </select>
          </div>

          <button
            onClick={() => {
              setTargetColumn('todo');
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-lg shadow-indigo-600/30 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* 4-Column Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto min-h-0 pb-2">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-xl border ${col.color} backdrop-blur-sm p-3 min-w-[280px] max-h-full`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) {
                  onTaskStatusChange(Number(taskId), col.id);
                }
              }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-slate-200 uppercase tracking-wide">
                    {col.label}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setTargetColumn(col.id);
                    setShowCreateModal(true);
                  }}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                  title="Add task to this column"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Task Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {colTasks.length === 0 ? (
                  <div className="h-28 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-[11px] text-slate-400 select-none">
                    Drop tasks here
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(task.id));
                      }}
                      className="group p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-xl shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing space-y-2.5"
                    >
                      {/* Top: Priority & Actions */}
                      <div className="flex items-center justify-between">
                        {getPriorityBadge(task.priority)}
                        <select
                          className="bg-slate-900 text-[10px] text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 outline-none cursor-pointer"
                          value={task.status}
                          onChange={(e) => onTaskStatusChange(task.id, e.target.value as TaskStatus)}
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 transition line-clamp-2">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Footer: Due date, Hours, Live Assignee */}
                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center space-x-2">
                          {task.due_date && (
                            <span className="flex items-center space-x-1 text-slate-300" title={`Due: ${new Date(task.due_date).toLocaleDateString()}`}>
                              <Calendar className="w-3 h-3 text-cyan-400" />
                              <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </span>
                          )}
                          {task.estimated_hours > 0 && (
                            <span className="flex items-center space-x-0.5 text-slate-400" title="Estimated hours">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{task.estimated_hours}h</span>
                            </span>
                          )}
                        </div>

                        {/* Live Assignee Dropdown */}
                        <div className="flex items-center space-x-1">
                          <select
                            value={task.assignee_id || ''}
                            onChange={(e) => onTaskAssigneeChange(task.id, e.target.value ? Number(e.target.value) : undefined)}
                            className="bg-transparent text-[10px] text-slate-300 font-medium outline-none cursor-pointer max-w-[100px] truncate"
                          >
                            <option value="" className="bg-slate-900 text-slate-500">Unassigned</option>
                            {teamMembers.map((m) => (
                              <option key={m.user.id} value={m.user.id} className="bg-slate-900 text-slate-200">
                                {m.user.full_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create New Task</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Integrate Yjs sync provider"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Details, acceptance criteria, or context..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assignee</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    value={assigneeId || ''}
                    onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : undefined)}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg shadow-md shadow-indigo-600/30 transition"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
