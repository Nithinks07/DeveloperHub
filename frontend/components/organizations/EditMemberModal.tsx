"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  organizationsApi,
  type Member,
  type MemberRole,
} from "@/services/organizations";

const ROLES: MemberRole[] = ["admin", "maintainer", "developer", "guest"];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  member: Member;
}

export function EditMemberModal({ isOpen, onClose, orgId, member }: Props) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<MemberRole>(member.role as MemberRole);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => organizationsApi.updateMember(orgId, member.user.id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to update role.");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm mx-4 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Update role</h2>
              <p className="mt-0.5 text-sm text-white/50">
                Change role for{" "}
                <span className="text-indigo-400 font-medium">@{member.user.username}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <svg className="size-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${
                  role === r
                    ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                    : "border-white/8 text-white/50 hover:border-white/15 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5 text-sm font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => { setError(null); mutation.mutate(); }}
              disabled={mutation.isPending || role === member.role}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {mutation.isPending && (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {mutation.isPending ? "Saving…" : "Save role"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
