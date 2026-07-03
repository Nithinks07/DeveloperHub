"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { organizationsApi, type Member, type MemberRole } from "@/services/organizations";
import { InviteMemberModal } from "@/components/organizations/InviteMemberModal";
import { EditMemberModal } from "@/components/organizations/EditMemberModal";
import { CreateOrgModal } from "@/components/organizations/CreateOrgModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  admin: "bg-red-500/15 text-red-300 border-red-500/20",
  maintainer: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  developer: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  guest: "bg-white/8 text-white/40 border-white/10",
};

const ROLE_ORDER: Record<string, number> = {
  owner: 0,
  admin: 1,
  maintainer: 2,
  developer: 3,
  guest: 4,
};

// ---------------------------------------------------------------------------
// Toast notification (inline)
// ---------------------------------------------------------------------------
interface Toast {
  id: number;
  message: string;
  type: "error" | "success";
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (message: string, type: "error" | "success" = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };
  return { toasts, addToast };
}

// ---------------------------------------------------------------------------
// Member row component
// ---------------------------------------------------------------------------
function MemberRow({
  member,
  orgId,
  onEditRole,
  onRemove,
}: {
  member: Member;
  orgId: string;
  onEditRole: (m: Member) => void;
  onRemove: (m: Member) => void;
}) {
  const initials = (member.user.full_name ?? member.user.username)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isOwner = member.role === "owner";

  return (
    <div className="group flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors rounded-xl">
      {/* Avatar */}
      <div className="size-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
        {initials}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white text-sm truncate">
            {member.user.full_name ?? member.user.username}
          </span>
          <span className="text-xs text-white/30 font-mono truncate hidden sm:block">
            @{member.user.username}
          </span>
        </div>
        <div className="text-xs text-white/35 truncate">{member.user.email}</div>
      </div>

      {/* Role badge */}
      <span
        className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize shrink-0 ${
          ROLE_COLORS[member.role] ?? "bg-white/8 text-white/40 border-white/10"
        }`}
      >
        {member.role}
      </span>

      {/* Joined date */}
      <span className="text-xs text-white/25 shrink-0 hidden md:block">
        {new Date(member.joined_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isOwner && (
          <>
            <button
              onClick={() => onEditRole(member)}
              title="Edit role"
              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onRemove(member)}
              title="Remove member"
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
              </svg>
            </button>
          </>
        )}
        {isOwner && (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300/60 text-xs border border-amber-500/15">
            owner
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toasts, addToast } = useToast();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOrgOpen, setEditOrgOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);

  const { data: org, isLoading, isError } = useQuery({
    queryKey: ["organization", id],
    queryFn: () => organizationsApi.get(id),
    enabled: Boolean(id),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => organizationsApi.removeMember(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", id] });
    },
    onError: (err: any) => {
      const detail: string =
        err?.response?.data?.detail ?? "Failed to remove member.";
      addToast(detail, "error");
    },
  });

  const handleRemove = (member: Member) => {
    if (member.role === "owner") {
      addToast("Owner cannot be removed; transfer ownership first.", "error");
      return;
    }
    removeMutation.mutate(member.user.id);
  };

  const sortedMembers = org
    ? [...org.members].sort(
        (a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99)
      )
    : [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-in slide-in-from-right-4 ${
              t.type === "error"
                ? "bg-red-950/90 border-red-500/30 text-red-300"
                : "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
            }`}
          >
            {t.type === "error" ? (
              <svg className="size-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            ) : (
              <svg className="size-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>

      {/* Nav */}
      <nav className="border-b border-white/6 bg-[#080a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/organizations" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Organizations</span>
          </Link>
          <svg className="size-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-white/70 font-medium truncate">
            {org?.name ?? "…"}
          </span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-6">
            <div className="h-32 rounded-2xl bg-white/4 animate-pulse" />
            <div className="h-64 rounded-2xl bg-white/4 animate-pulse" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <svg className="size-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Organization not found</h3>
            <p className="text-white/40 text-sm mb-5">
              This organization doesn't exist or you don't have access.
            </p>
            <Link href="/organizations" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
              ← Back to organizations
            </Link>
          </div>
        )}

        {/* Content */}
        {org && (
          <div className="space-y-6">
            {/* Org header card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0f1117] to-[#131825] border border-white/8 rounded-2xl p-6">
              {/* Decorative glow */}
              <div className="absolute -top-10 -right-10 size-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

              <div className="flex items-start gap-5">
                {/* Avatar */}
                <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg shadow-indigo-500/20">
                  {org.name.charAt(0).toUpperCase()}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">{org.name}</h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-mono">
                      /{org.slug}
                    </span>
                  </div>
                  {org.description && (
                    <p className="text-white/50 text-sm leading-relaxed mt-1 max-w-2xl">
                      {org.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                    <span className="flex items-center gap-1.5">
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Created {new Date(org.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {org.members.length} member{org.members.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditOrgOpen(true)}
                    className="px-3 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5 text-sm transition-all flex items-center gap-1.5"
                  >
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setInviteOpen(true)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
                  >
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Invite
                  </button>
                </div>
              </div>
            </div>

            {/* Members section */}
            <div className="bg-[#0f1117] border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <svg className="size-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Members
                </h2>
                <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">
                  {org.members.length}
                </span>
              </div>

              {/* Column headers */}
              <div className="grid px-5 py-2 text-xs text-white/30 font-medium uppercase tracking-wider border-b border-white/4"
                style={{ gridTemplateColumns: "2.25rem 1fr auto auto auto" }}>
                <span />
                <span>Member</span>
                <span className="hidden sm:block">Role</span>
                <span className="hidden md:block">Joined</span>
                <span />
              </div>

              {/* Member rows */}
              <div className="divide-y divide-white/4 px-1 py-1">
                {sortedMembers.length === 0 ? (
                  <div className="py-10 text-center text-white/30 text-sm">No members yet.</div>
                ) : (
                  sortedMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      orgId={id}
                      onEditRole={setEditMember}
                      onRemove={handleRemove}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteMemberModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        orgId={id}
      />

      {org && (
        <CreateOrgModal
          isOpen={editOrgOpen}
          onClose={() => setEditOrgOpen(false)}
          editOrg={org}
        />
      )}

      {editMember && (
        <EditMemberModal
          isOpen={Boolean(editMember)}
          onClose={() => setEditMember(null)}
          orgId={id}
          member={editMember}
        />
      )}
    </main>
  );
}
