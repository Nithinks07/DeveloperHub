/**
 * repositories.ts
 * TypeScript types and API functions for the Repositories domain.
 * All requests go through the shared `api` axios instance (with auth interceptor).
 */

import api from "@/lib/api";

// ---------------------------------------------------------------------------
// Types — mirror the API contract exactly
// ---------------------------------------------------------------------------

export interface Repository {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  readme: string | null;
  created_by: string;
  created_at: string;
}

export interface RepositoryListResponse {
  items: Repository[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Request payload types
// ---------------------------------------------------------------------------

export interface CreateRepositoryPayload {
  name: string;
  description?: string;
  is_private: boolean;
}

export interface UpdateRepositoryPayload {
  name?: string;
  description?: string;
  is_private?: boolean;
  readme?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export const repositoriesApi = {
  /** GET /organizations/{orgId}/repositories — paginated list */
  list: async (orgId: string, page = 1, page_size = 20): Promise<RepositoryListResponse> => {
    const { data } = await api.get(`/organizations/${orgId}/repositories`, {
      params: { page, page_size },
    });
    return data;
  },

  /** GET /repositories/{id} — single repository */
  get: async (id: string): Promise<Repository> => {
    const { data } = await api.get(`/repositories/${id}`);
    return data;
  },

  /** POST /organizations/{orgId}/repositories — create a new repository */
  create: async (orgId: string, payload: CreateRepositoryPayload): Promise<Repository> => {
    const { data } = await api.post(`/organizations/${orgId}/repositories`, payload);
    return data;
  },

  /** PUT /repositories/{id} — update repository */
  update: async (id: string, payload: UpdateRepositoryPayload): Promise<Repository> => {
    const { data } = await api.put(`/repositories/${id}`, payload);
    return data;
  },

  /** DELETE /repositories/{id} — delete repository */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/repositories/${id}`);
  },
};
