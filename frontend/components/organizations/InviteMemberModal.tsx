"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  organizationsApi,
  type MemberRole,
  type MemberInvitePayload,
} from "@/services/organizations";

const ROLES: MemberRole[] = ["admin", "maintainer", "developer", "guest"];

const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: "Full control of the organization",
  admin: "Manage members and settings",
  maintainer: "Manage repositories and projects",
  developer: "Contribute to projects",
  guest: "Read-only access",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
}

export function InviteMemberModal({ isOpen, onClose, orgId }: Props) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<MemberRole>("developer");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: MemberInvitePayload) =>
      organizationsApi.inviteMember(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to invite member.");
    },
  });

  const handleClose = () => {
    setUsername("");
    setRole("developer");
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate({ username: username.trim(), role });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Invite member</h2>
              <p className="mt-0.5 text-sm text-white/50">
                Add someone to your organization by username.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <svg className="size-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Username <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Role <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    role === r
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-white/8 hover:border-white/15 hover:bg-white/3"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="hidden"
                  />
                  <div
                    className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      role === r ? "border-indigo-400 bg-indigo-500" : "border-white/20"
                    }`}
                  >
                    {role === r && <div className="size-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white capitalize">{r}</div>
                    <div className="text-xs text-white/40">{ROLE_DESCRIPTIONS[r]}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5 text-sm font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {mutation.isPending && (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {mutation.isPending ? "Inviting…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
