import api from "@/lib/api";

export type IssueStatus = "open" | "closed";
export type IssueType = "bug" | "feature" | "task" | "enhancement" | "research" | "documentation";
export type IssuePriority = "low" | "medium" | "high" | "critical";

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface User {
  id: string;
  username: string;
  full_name?: string;
}

export interface IssueComment {
  id: string;
  issue_id: string;
  parent_comment_id: string | null;
  author: User;
  content: string;
  replies: IssueComment[];
  created_at: string;
}

export interface Issue {
  id: string;
  repository_id: string;
  task_id: string | null;
  number: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  type: IssueType;
  priority: IssuePriority;
  assigned_to: string | null;
  milestone_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface IssueDetail extends Issue {
  labels: Label[];
  comments: IssueComment[];
}

export interface CreateIssuePayload {
  title: string;
  description?: string;
  type: IssueType;
  priority?: IssuePriority;
  assigned_to?: string;
  milestone_id?: string;
  task_id?: string;
}

export interface UpdateIssuePayload {
  title?: string;
  description?: string;
  status?: IssueStatus;
  type?: IssueType;
  priority?: IssuePriority;
  assigned_to?: string | null;
  milestone_id?: string | null;
  task_id?: string | null;
}

export interface CreateCommentPayload {
  content: string;
  parent_comment_id?: string | null;
}

export interface IssueListResponse {
  items: Issue[];
  total: number;
  page: number;
  page_size: number;
}

export const issuesApi = {
  create: async (repositoryId: string, payload: CreateIssuePayload): Promise<Issue> => {
    const { data } = await api.post(`/repositories/${repositoryId}/issues`, payload);
    return data;
  },

  list: async (repositoryId: string, page = 1, pageSize = 20): Promise<IssueListResponse> => {
    const { data } = await api.get(`/repositories/${repositoryId}/issues`, {
      params: { page, page_size: pageSize },
    });
    return data;
  },

  get: async (issueId: string): Promise<IssueDetail> => {
    const { data } = await api.get(`/issues/${issueId}`);
    return data;
  },

  update: async (issueId: string, payload: UpdateIssuePayload): Promise<Issue> => {
    const { data } = await api.patch(`/issues/${issueId}`, payload);
    return data;
  },

  delete: async (issueId: string): Promise<void> => {
    await api.delete(`/issues/${issueId}`);
  },

  addLabel: async (issueId: string, labelId: string): Promise<IssueDetail> => {
    const { data } = await api.post(`/issues/${issueId}/labels`, { label_id: labelId });
    return data;
  },

  removeLabel: async (issueId: string, labelId: string): Promise<IssueDetail> => {
    const { data } = await api.delete(`/issues/${issueId}/labels/${labelId}`);
    return data;
  },

  addComment: async (issueId: string, payload: CreateCommentPayload): Promise<IssueComment> => {
    const { data } = await api.post(`/issues/${issueId}/comments`, payload);
    return data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/issue_comments/${commentId}`);
  },
};
