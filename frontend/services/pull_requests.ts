import api from "@/lib/api";

export type PRStatus = "open" | "merged" | "closed";
export type ReviewStatus = "pending" | "approved" | "changes_requested" | "commented";

export interface User {
  id: string;
  username: string;
  full_name?: string;
}

export interface PRComment {
  id: string;
  pull_request_id: string;
  parent_comment_id: string | null;
  author: User;
  content: string;
  replies: PRComment[];
  created_at: string;
}

export interface PRReview {
  id: string;
  reviewer: User;
  status: ReviewStatus;
  comment: string | null;
  created_at: string;
}

export interface PullRequest {
  id: string;
  repository_id: string;
  issue_id: string | null;
  number: number;
  title: string;
  description: string | null;
  status: PRStatus;
  source_branch: string;
  target_branch: string;
  author_id: string;
  created_at: string;
  merged_at: string | null;
  merged_by: string | null;
}

export interface PullRequestDetail extends PullRequest {
  author: User;
  comments: PRComment[];
  reviews: PRReview[];
}

export interface CreatePRPayload {
  title: string;
  description?: string;
  source_branch: string;
  target_branch: string;
  issue_id?: string;
}

export interface CreatePRReviewPayload {
  status: ReviewStatus;
  comment?: string;
}

export interface CreatePRCommentPayload {
  content: string;
  parent_comment_id?: string | null;
}

export interface PRListResponse {
  items: PullRequest[];
  total: number;
  page: number;
  page_size: number;
}

export const pullRequestsApi = {
  create: async (repositoryId: string, payload: CreatePRPayload): Promise<PullRequest> => {
    const { data } = await api.post(`/repositories/${repositoryId}/pull_requests`, payload);
    return data;
  },

  list: async (repositoryId: string, page = 1, pageSize = 20): Promise<PRListResponse> => {
    const { data } = await api.get(`/repositories/${repositoryId}/pull_requests`, {
      params: { page, page_size: pageSize },
    });
    return data;
  },

  get: async (prId: string): Promise<PullRequestDetail> => {
    const { data } = await api.get(`/pull_requests/${prId}`);
    return data;
  },

  submitReview: async (prId: string, payload: CreatePRReviewPayload): Promise<PRReview> => {
    const { data } = await api.post(`/pull_requests/${prId}/reviews`, payload);
    return data;
  },

  merge: async (prId: string): Promise<{ status: string; merged_at: string; merged_by: string }> => {
    const { data } = await api.post(`/pull_requests/${prId}/merge`);
    return data;
  },

  addComment: async (prId: string, payload: CreatePRCommentPayload): Promise<PRComment> => {
    const { data } = await api.post(`/pull_requests/${prId}/comments`, payload);
    return data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await api.delete(`/pr_comments/${commentId}`);
  },
};
