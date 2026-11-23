import React from 'react';
import { 
  BarChart3, AlertCircle, CheckCircle, Clock, Zap, TrendingUp
} from 'lucide-react';
import { WorkloadMemberStats, Team } from '../types';

interface WorkloadDashboardProps {
  team: Team | null;
  workload: WorkloadMemberStats[];
}

export const WorkloadDashboard: React.FC<WorkloadDashboardProps> = ({ team, workload }) => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <span>{team?.name || 'Team'} Workload & Capacity</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400">
            Real-Time Analytics
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Monitor team bandwidth, allocated hours against weekly capacity (40 hrs), and prevent burnout.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Team Members</span>
          <p className="text-2xl font-bold text-white mt-1">{workload.length}</p>
        </div>
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Total Allocated Hours</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">
            {workload.reduce((acc, curr) => acc + curr.total_estimated_hours, 0).toFixed(1)} hrs
          </p>
        </div>
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">In-Progress Tasks</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {workload.reduce((acc, curr) => acc + curr.in_progress_tasks, 0)}
          </p>
        </div>
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Completed Deliverables</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {workload.reduce((acc, curr) => acc + curr.completed_tasks, 0)}
          </p>
        </div>
      </div>

      {/* Team Member Workload Breakdown */}
      <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 overflow-y-auto">
        <h3 className="text-sm font-bold text-slate-200 mb-4">Member Capacity Utilization</h3>

        <div className="space-y-4">
          {workload.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-8">
              No workload statistics recorded yet. Assign tasks with estimated hours to populate this view.
            </div>
          ) : (
            workload.map((member) => {
              const isOverloaded = member.capacity_percentage > 100;
              const isNearCapacity = member.capacity_percentage >= 75 && member.capacity_percentage <= 100;

              let barColor = 'bg-emerald-500';
              if (isNearCapacity) barColor = 'bg-amber-500';
              if (isOverloaded) barColor = 'bg-rose-500';

              return (
                <div
                  key={member.user.id}
                  className="p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user.email}`}
                        alt={member.user.full_name}
                        className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{member.user.full_name}</h4>
                        <p className="text-[11px] text-slate-400">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-200">
                          {member.total_estimated_hours}h / 40h
                        </span>
                        <p className="text-[10px] text-slate-400">{member.capacity_percentage}% bandwidth</p>
                      </div>

                      {isOverloaded && (
                        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" />
                          <span>Over capacity</span>
                        </span>
                      )}
                      {isNearCapacity && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Near capacity
                        </span>
                      )}
                      {!isOverloaded && !isNearCapacity && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Balanced
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-700/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(member.capacity_percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Micro task stats */}
                  <div className="flex items-center space-x-6 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      <span>Assigned: {member.total_assigned_tasks}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span>In-progress: {member.in_progress_tasks}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Completed: {member.completed_tasks}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
