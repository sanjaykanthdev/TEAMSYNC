export type Role = 'owner' | 'admin' | 'member';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface TeamMember {
  id: number;
  user_id: number;
  role: Role;
  user: User;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
  members: TeamMember[];
}

export interface Project {
  id: number;
  team_id: number;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id?: number;
  creator_id: number;
  due_date?: string;
  estimated_hours: number;
  position: number;
  created_at: string;
  updated_at: string;
  assignee?: User;
}

export interface Channel {
  id: number;
  team_id: number;
  name: string;
  topic?: string;
  is_private: boolean;
  created_at: string;
}

export interface Message {
  id: number;
  channel_id: number;
  sender_id: number;
  content: string;
  parent_id?: number;
  created_at: string;
  sender: User;
}

export interface Document {
  id: number;
  team_id: number;
  project_id?: number;
  created_by_id: number;
  title: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorkloadMemberStats {
  user: User;
  total_assigned_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  total_estimated_hours: number;
  capacity_percentage: number;
}

export interface ActivityLog {
  id: number;
  team_id: number;
  user_id: number;
  action_type: string;
  entity_type: string;
  entity_id: number;
  metadata_json: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}
