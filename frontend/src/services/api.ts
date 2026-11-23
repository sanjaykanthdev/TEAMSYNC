import { User, Team, Project, Task, Channel, Message, Document, WorkloadMemberStats, ActivityLog, NotificationItem } from '../types';

const API_BASE = 'http://localhost:8000/api/v1';

class ApiService {
  private token: string | null = localStorage.getItem('teamsync_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('teamsync_token', token);
    } else {
      localStorage.removeItem('teamsync_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async register(data: { email: string; full_name: string; password: string }) {
    const res = await this.request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async login(data: { email: string; password: string }) {
    const res = await this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    return this.request<Team[]>('/teams');
  }

  async createTeam(data: { name: string; description?: string }): Promise<Team> {
    return this.request<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Projects
  async getProjects(teamId: number): Promise<Project[]> {
    return this.request<Project[]>(`/projects/team/${teamId}`);
  }

  async createProject(data: { team_id: number; name: string; description?: string; color?: string }): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Tasks
  async getTasks(projectId: number): Promise<Task[]> {
    return this.request<Task[]>(`/tasks/project/${projectId}`);
  }

  async createTask(data: Partial<Task> & { project_id: number; title: string }): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(taskId: number, data: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(taskId: number): Promise<void> {
    await this.request(`/tasks/${taskId}`, { method: 'DELETE' });
  }

  // Chat
  async getChannels(teamId: number): Promise<Channel[]> {
    return this.request<Channel[]>(`/chat/channels/team/${teamId}`);
  }

  async createChannel(data: { team_id: number; name: string; topic?: string }): Promise<Channel> {
    return this.request<Channel>('/chat/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMessages(channelId: number): Promise<Message[]> {
    return this.request<Message[]>(`/chat/channels/${channelId}/messages`);
  }

  async sendMessage(channelId: number, content: string): Promise<Message> {
    return this.request<Message>(`/chat/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Documents
  async getDocuments(teamId: number): Promise<Document[]> {
    return this.request<Document[]>(`/docs/team/${teamId}`);
  }

  async createDocument(data: { team_id: number; title: string; content?: string }): Promise<Document> {
    return this.request<Document>('/docs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDocument(docId: number, data: { title?: string; content?: string }): Promise<Document> {
    return this.request<Document>(`/docs/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Workload & Activities
  async getTeamWorkload(teamId: number): Promise<WorkloadMemberStats[]> {
    return this.request<WorkloadMemberStats[]>(`/workload/team/${teamId}`);
  }

  async getActivity(teamId: number): Promise<ActivityLog[]> {
    return this.request<ActivityLog[]>(`/workload/team/${teamId}/activity`);
  }

  async getNotifications(): Promise<NotificationItem[]> {
    return this.request<NotificationItem[]>('/workload/notifications');
  }

  async markNotificationRead(id: number): Promise<void> {
    await this.request(`/workload/notifications/${id}/read`, { method: 'PATCH' });
  }
}

export const api = new ApiService();
