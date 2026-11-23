import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { TimelineView } from './components/TimelineView';
import { TeamChat } from './components/TeamChat';
import { DocEditor } from './components/DocEditor';
import { WorkloadDashboard } from './components/WorkloadDashboard';
import { ActivityFeed } from './components/ActivityFeed';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api';
import { wsClient } from './services/websocket';
import { offlineSync } from './services/offlineSync';
import { 
  User, Team, Project, Task, Channel, Message, Document, 
  WorkloadMemberStats, ActivityLog, NotificationItem, TaskStatus, TaskPriority 
} from './types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('kanban');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Core Data
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [workload, setWorkload] = useState<WorkloadMemberStats[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Project Creation Modal state
  const [showCreateProjModal, setShowCreateProjModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  // 1. Initial Authentication Check
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then(user => setCurrentUser(user))
        .catch(() => api.setToken(null));
    }
  }, []);

  // 2. Network connectivity listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      offlineSync.flushQueue().then(count => {
        if (count > 0 && activeProject) {
          api.getTasks(activeProject.id).then(setTasks);
        }
      });
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeProject]);

  // 3. Load Teams when User logs in
  const loadTeams = useCallback(async () => {
    try {
      const res = await api.getTeams();
      if (res.length > 0) {
        setTeams(res);
        setActiveTeam(res[0]);
      } else {
        // Create initial default team
        const defaultTeam = await api.createTeam({
          name: 'Engineering Workspace',
          description: 'Core product engineering & sync team'
        });
        setTeams([defaultTeam]);
        setActiveTeam(defaultTeam);
      }
    } catch (err) {
      console.error('Error loading teams:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadTeams();
    }
  }, [currentUser, loadTeams]);

  // 4. Load Projects, Channels, Docs, Workload, Activities when Active Team changes
  useEffect(() => {
    if (!activeTeam) return;

    // Load projects
    api.getProjects(activeTeam.id).then(async projs => {
      if (projs.length > 0) {
        setProjects(projs);
        setActiveProject(projs[0]);
      } else {
        const defaultProj = await api.createProject({
          team_id: activeTeam.id,
          name: 'Core Platform v1.0',
          description: 'Real-time collaborative features and synchronization',
          color: '#4f46e5'
        });
        setProjects([defaultProj]);
        setActiveProject(defaultProj);
      }
    });

    // Load channels
    api.getChannels(activeTeam.id).then(chans => {
      setChannels(chans);
      if (chans.length > 0) {
        setActiveChannel(chans[0]);
      }
    });

    // Load documents
    api.getDocuments(activeTeam.id).then(docs => {
      setDocuments(docs);
      if (docs.length > 0) {
        setActiveDoc(docs[0]);
      }
    });

    // Load workload
    api.getTeamWorkload(activeTeam.id).then(setWorkload).catch(console.error);

    // Load activities
    api.getActivity(activeTeam.id).then(setActivities).catch(console.error);

    // Load notifications
    api.getNotifications().then(setNotifications).catch(console.error);
  }, [activeTeam]);

  // 5. Load Tasks when Active Project changes
  useEffect(() => {
    if (!activeProject) return;
    api.getTasks(activeProject.id).then(setTasks).catch(console.error);

    // Connect to Project WebSocket room for live task sync
    const token = api.getToken();
    if (token) {
      const room = `project_${activeProject.id}`;
      wsClient.joinRoom(room, token);

      const unsubscribe = wsClient.subscribe(room, (data) => {
        if (data.type === 'task_event') {
          if (data.event === 'created') {
            setTasks(prev => [data.task, ...prev.filter(t => t.id !== data.task.id)]);
          } else if (data.event === 'updated') {
            setTasks(prev => prev.map(t => t.id === data.task.id ? { ...t, ...data.task } : t));
          } else if (data.event === 'deleted') {
            setTasks(prev => prev.filter(t => t.id !== data.task.id));
          }
          // Refresh workload and activities
          if (activeTeam) {
            api.getTeamWorkload(activeTeam.id).then(setWorkload).catch(console.error);
            api.getActivity(activeTeam.id).then(setActivities).catch(console.error);
          }
        }
      });

      return () => {
        unsubscribe();
        wsClient.leaveRoom(room);
      };
    }
  }, [activeProject, activeTeam]);

  // 6. Load Messages when Active Channel changes & connect WebSocket
  useEffect(() => {
    if (!activeChannel) return;
    api.getMessages(activeChannel.id).then(setMessages).catch(console.error);

    const token = api.getToken();
    if (token) {
      const room = `channel_${activeChannel.id}`;
      wsClient.joinRoom(room, token);

      const unsubscribe = wsClient.subscribe(room, (data) => {
        if (data.type === 'chat_message') {
          setMessages(prev => [...prev.filter(m => m.id !== data.message.id), data.message]);
        }
      });

      return () => {
        unsubscribe();
        wsClient.leaveRoom(room);
      };
    }
  }, [activeChannel]);

  // Handlers for Kanban actions
  const handleTaskStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    if (!isOnline) {
      await offlineSync.queueMutation('TASK_UPDATE', { id: taskId, data: { status: newStatus } });
      return;
    }

    try {
      await api.updateTask(taskId, { status: newStatus });
      if (activeTeam) {
        api.getTeamWorkload(activeTeam.id).then(setWorkload);
      }
    } catch (e) {
      console.error('Failed to update task status:', e);
    }
  };

  const handleTaskAssigneeChange = async (taskId: number, newAssigneeId: number | undefined) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignee_id: newAssigneeId } : t));

    if (!isOnline) {
      await offlineSync.queueMutation('TASK_UPDATE', { id: taskId, data: { assignee_id: newAssigneeId } });
      return;
    }

    try {
      await api.updateTask(taskId, { assignee_id: newAssigneeId });
      if (activeTeam) {
        api.getTeamWorkload(activeTeam.id).then(setWorkload);
      }
    } catch (e) {
      console.error('Failed to update task assignee:', e);
    }
  };

  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    priority: TaskPriority;
    assignee_id?: number;
    due_date?: string;
    estimated_hours: number;
    status: TaskStatus;
  }) => {
    if (!activeProject) return;

    if (!isOnline) {
      const tempTask: Task = {
        id: Date.now(),
        project_id: activeProject.id,
        creator_id: currentUser?.id || 1,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...taskData,
      };
      setTasks(prev => [tempTask, ...prev]);
      await offlineSync.queueMutation('TASK_CREATE', { project_id: activeProject.id, ...taskData });
      return;
    }

    try {
      const created = await api.createTask({
        project_id: activeProject.id,
        ...taskData,
      });
      setTasks(prev => [created, ...prev.filter(t => t.id !== created.id)]);
      if (activeTeam) {
        api.getTeamWorkload(activeTeam.id).then(setWorkload);
      }
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await api.deleteTask(taskId);
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  // Chat handlers
  const handleSendMessage = async (content: string) => {
    if (!activeChannel) return;
    try {
      const msg = await api.sendMessage(activeChannel.id, content);
      setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const handleCreateChannel = async (name: string, topic?: string) => {
    if (!activeTeam) return;
    try {
      const chan = await api.createChannel({ team_id: activeTeam.id, name, topic });
      setChannels(prev => [...prev, chan]);
      setActiveChannel(chan);
    } catch (e) {
      console.error('Failed to create channel:', e);
    }
  };

  // Doc handlers
  const handleCreateDoc = async (title: string, content?: string) => {
    if (!activeTeam) return;
    try {
      const doc = await api.createDocument({ team_id: activeTeam.id, title, content });
      setDocuments(prev => [doc, ...prev]);
      setActiveDoc(doc);
    } catch (e) {
      console.error('Failed to create document:', e);
    }
  };

  const handleUpdateDoc = async (docId: number, data: { title?: string; content?: string }) => {
    try {
      const updated = await api.updateDocument(docId, data);
      setDocuments(prev => prev.map(d => d.id === docId ? updated : d));
      if (activeDoc?.id === docId) {
        setActiveDoc(updated);
      }
    } catch (e) {
      console.error('Failed to update document:', e);
    }
  };

  // Project creation handler
  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeam || !newProjName.trim()) return;
    try {
      const proj = await api.createProject({
        team_id: activeTeam.id,
        name: newProjName,
        description: newProjDesc,
        color: '#6366f1'
      });
      setProjects(prev => [...prev, proj]);
      setActiveProject(proj);
      setNewProjName('');
      setNewProjDesc('');
      setShowCreateProjModal(false);
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await api.markNotificationRead(id);
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <AuthModal onSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        teams={teams}
        activeTeam={activeTeam}
        onSelectTeam={setActiveTeam}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={setActiveProject}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        isOnline={isOnline}
        onLogout={handleLogout}
        onCreateProjectClick={() => setShowCreateProjModal(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Dynamic Main Workspace Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
          {activeTab === 'kanban' && (
            <KanbanBoard
              tasks={tasks}
              project={activeProject}
              teamMembers={activeTeam?.members || []}
              onTaskStatusChange={handleTaskStatusChange}
              onTaskAssigneeChange={handleTaskAssigneeChange}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineView
              tasks={tasks}
              project={activeProject}
              onTaskStatusChange={handleTaskStatusChange}
            />
          )}

          {activeTab === 'chat' && (
            <TeamChat
              team={activeTeam}
              channels={channels}
              activeChannel={activeChannel}
              onSelectChannel={setActiveChannel}
              onCreateChannel={handleCreateChannel}
              messages={messages}
              onSendMessage={handleSendMessage}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'docs' && (
            <DocEditor
              team={activeTeam}
              documents={documents}
              activeDoc={activeDoc}
              onSelectDoc={setActiveDoc}
              onCreateDoc={handleCreateDoc}
              onUpdateDoc={handleUpdateDoc}
              isOnline={isOnline}
            />
          )}

          {activeTab === 'workload' && (
            <WorkloadDashboard
              team={activeTeam}
              workload={workload}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityFeed
              team={activeTeam}
              activities={activities}
            />
          )}
        </main>
      </div>

      {/* Project Creation Modal */}
      {showCreateProjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Create New Project</h3>
            <form onSubmit={handleCreateProjectSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Mobile App Redesign"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Goals and milestones..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateProjModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
