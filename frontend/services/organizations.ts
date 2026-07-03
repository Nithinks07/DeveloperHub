/**
 * organizations.ts
 * TypeScript types and API functions for the Organizations + Membership domain.
 * All requests go through the shared `api` axios instance (with auth interceptor).
 */

import api from "@/lib/api";

// ---------------------------------------------------------------------------
// Types — mirror the API contract exactly
// ---------------------------------------------------------------------------

export type MemberRole = "owner" | "admin" | "maintainer" | "developer" | "guest";

export interface MemberUser {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
}

export interface Member {
  id: string;
  user: MemberUser;
  role: MemberRole;
  joined_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  created_at: string;
}

export interface OrganizationDetail extends Organization {
  members: Member[];
}

export interface OrganizationListResponse {
  items: Organization[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Request payload types
// ---------------------------------------------------------------------------

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  description?: string;
}

export interface MemberInvitePayload {
  username: string;
  role: MemberRole;
}

export interface MemberUpdatePayload {
  role: MemberRole;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export const organizationsApi = {
  /** GET /organizations — list user's organizations (paginated) */
  list: async (page = 1, page_size = 20): Promise<OrganizationListResponse> => {
    const { data } = await api.get("/organizations", {
      params: { page, page_size },
    });
    return data;
  },

  /** GET /organizations/{id} — org detail with members */
  get: async (id: string): Promise<OrganizationDetail> => {
    const { data } = await api.get(`/organizations/${id}`);
    return data;
  },

  /** POST /organizations — create a new organization */
  create: async (payload: CreateOrganizationPayload): Promise<Organization> => {
    const { data } = await api.post("/organizations", payload);
    return data;
  },

  /** PUT /organizations/{id} — update name/description (owner only) */
  update: async (id: string, payload: UpdateOrganizationPayload): Promise<Organization> => {
    const { data } = await api.put(`/organizations/${id}`, payload);
    return data;
  },

  /** DELETE /organizations/{id} — delete organization (owner only) */
  delete: async (id: string): Promise<void> => {
    await api.delete(`/organizations/${id}`);
  },

  /** POST /organizations/{id}/members — invite a user */
  inviteMember: async (orgId: string, payload: MemberInvitePayload): Promise<Member> => {
    const { data } = await api.post(`/organizations/${orgId}/members`, payload);
    return data;
  },

  /** DELETE /organizations/{id}/members/{userId} — remove a member */
  removeMember: async (orgId: string, userId: string): Promise<void> => {
    await api.delete(`/organizations/${orgId}/members/${userId}`);
  },

  /** PUT /organizations/{id}/members/{userId} — update member role */
  updateMember: async (orgId: string, userId: string, payload: MemberUpdatePayload): Promise<Member> => {
    const { data } = await api.put(`/organizations/${orgId}/members/${userId}`, payload);
    return data;
  },
};
