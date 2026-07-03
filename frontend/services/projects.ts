/**
 * projects.ts
 * TypeScript types and API functions for Projects, Tasks, Labels, and Milestones.
 */

import api from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "testing" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type ProjectStatus = "active" | "archived";
export type MilestoneStatus = "open" | "closed";

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "testing",
  "completed",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  testing: "Testing",
  completed: "Completed",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "text-slate-400",
  medium: "text-sky-400",
  high: "text-amber-400",
  critical: "text-red-400",
};

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  status: MilestoneStatus;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  order: number;
  created_by: string;
  created_at: string;
}

export interface Project {
  id: string;
  repository_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
}

export interface ProjectDetail extends Project {
  tasks_by_status: Record<TaskStatus, Task[]>;
  labels: Label[];
  milestones: Milestone[];
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Request payload types
// ---------------------------------------------------------------------------

export interface CreateProjectPayload {
  name: string;
  description?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigned_to?: string;
}

export interface PatchTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string | null;
  order?: number;
}

export interface CreateLabelPayload {
  name: string;
  color: string;
}

export interface CreateMilestonePayload {
  name: string;
  description?: string;
  due_date?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export const projectsApi = {
  list: async (repoId: string, page = 1, page_size = 20): Promise<ProjectListResponse> => {
    const { data } = await api.get(`/repositories/${repoId}/projects`, { params: { page, page_size } });
    return data;
  },

  get: async (projectId: string): Promise<ProjectDetail> => {
    const { data } = await api.get(`/projects/${projectId}`);
    return data;
  },

  create: async (repoId: string, payload: CreateProjectPayload): Promise<Project> => {
    const { data } = await api.post(`/repositories/${repoId}/projects`, payload);
    return data;
  },

  update: async (projectId: string, payload: UpdateProjectPayload): Promise<Project> => {
    const { data } = await api.put(`/projects/${projectId}`, payload);
    return data;
  },

  delete: async (projectId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}`);
  },
};

export const tasksApi = {
  create: async (projectId: string, payload: CreateTaskPayload): Promise<Task> => {
    const { data } = await api.post(`/projects/${projectId}/tasks`, payload);
    return data;
  },

  patch: async (taskId: string, payload: PatchTaskPayload): Promise<Task> => {
    const { data } = await api.patch(`/tasks/${taskId}`, payload);
    return data;
  },

  delete: async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  },
};

export const labelsApi = {
  create: async (projectId: string, payload: CreateLabelPayload): Promise<Label> => {
    const { data } = await api.post(`/projects/${projectId}/labels`, payload);
    return data;
  },
};

export const milestonesApi = {
  create: async (projectId: string, payload: CreateMilestonePayload): Promise<Milestone> => {
    const { data } = await api.post(`/projects/${projectId}/milestones`, payload);
    return data;
  },
};
