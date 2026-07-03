"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { repositoriesApi, type Repository } from "@/services/repositories";
import { organizationsApi, type MemberRole } from "@/services/organizations";
import { CreateRepoModal } from "@/components/repositories/CreateRepoModal";

// ---------------------------------------------------------------------------
// Role helpers — delete requires maintainer+, create/edit requires developer+
// ---------------------------------------------------------------------------
const ROLE_ORDER: Record<string, number> = {
  guest: 0,
  developer: 1,
  maintainer: 2,
  admin: 3,
  owner: 4,
};

function hasMinRole(role: string | undefined, minRole: string): boolean {
  if (!role) return false;
  return (ROLE_ORDER[role] ?? -1) >= (ROLE_ORDER[minRole] ?? 99);
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm mt-6">
      <span className="text-white/40">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 text-white/40 text-xs">{page} / {totalPages}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Repository card
// ---------------------------------------------------------------------------
function RepoCard({
  repo,
  orgId,
  currentRole,
}: {
  repo: Repository;
  orgId: string;
  currentRole: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);

  const canDelete = hasMinRole(currentRole, "maintainer");

  const deleteMutation = useMutation({
    mutationFn: () => repositoriesApi.delete(repo.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories", orgId] });
    },
  });

  return (
    <div className="group relative flex flex-col bg-[#0f1117] border border-white/8 rounded-2xl p-5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Icon */}
        <div className="size-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/8 flex items-center justify-center shrink-0">
          <svg className="size-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>

        {/* Visibility badge + delete */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${
            repo.is_private
              ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
          }`}>
            {repo.is_private ? "Private" : "Public"}
          </span>

          {/* Delete — hidden when user lacks maintainer+ */}
          {canDelete ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Delete repository"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Name */}
      <Link href={`/repositories/${repo.id}`} className="block mb-1">
        <h3 className="font-semibold text-white hover:text-indigo-300 transition-colors leading-tight font-mono">
          {repo.name}
        </h3>
      </Link>

      {/* Description */}
      {repo.description ? (
        <p className="text-sm text-white/50 leading-relaxed mb-4 line-clamp-2">{repo.description}</p>
      ) : (
        <p className="text-sm text-white/20 italic mb-4">No description</p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/6">
        <span className="text-xs text-white/25 flex items-center gap-1">
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {new Date(repo.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <Link
          href={`/repositories/${repo.id}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-1"
        >
          Open
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Delete confirm overlay */}
      {showConfirm && (
        <div className="absolute inset-0 rounded-2xl bg-[#0f1117]/96 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-5 border border-red-500/20">
          <div className="size-10 rounded-full bg-red-500/15 flex items-center justify-center">
            <svg className="size-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-sm text-white/80 text-center font-medium">Delete this repository?</p>
          <p className="text-xs text-white/40 text-center leading-relaxed">
            All projects, tasks, issues, and PRs will be permanently deleted.
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white text-xs font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => { deleteMutation.mutate(); setShowConfirm(false); }}
              disabled={deleteMutation.isPending}
              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function RepositoriesPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch org detail to know the current user's role (from Lane A data)
  const { data: orgDetail } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => organizationsApi.get(orgId),
    enabled: Boolean(orgId),
  });

  // Derive current user's role from org membership.
  // The org detail response from Lane A includes the full member list.
  // We compare member user IDs; for now we check all members since we don't
  // have a "current user id" store — the first member whose role we need is
  // obtainable by checking the org data. In production, read from auth context.
  // For now, we surface the role-based UI based on org data presence.
  const currentRole = orgDetail?.members?.[0]?.role; // simplified; replace with auth-context user id lookup

  const canCreate = hasMinRole(currentRole, "developer");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["repositories", orgId, page],
    queryFn: () => repositoriesApi.list(orgId, page, 20),
    enabled: Boolean(orgId),
  });

  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/6 bg-[#080a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/organizations" className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-sm">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            Organizations
          </Link>
          <svg className="size-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/organizations/${orgId}`} className="text-sm text-white/50 hover:text-white transition-colors truncate max-w-[10rem]">
            {orgDetail?.name ?? "Organization"}
          </Link>
          <svg className="size-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-white/70 font-medium">Repositories</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Repositories</h1>
            <p className="mt-1 text-white/40">
              {orgDetail ? `Repositories in ${orgDetail.name}` : "Code repositories in this organization."}
            </p>
          </div>
          {/* Create button — hidden for guest/non-member, shown for developer+ */}
          {canCreate && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New repository
            </button>
          )}
        </div>

        {/* Stats */}
        {data && (
          <div className="flex gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/4 border border-white/8">
              <div className="size-2 rounded-full bg-indigo-400" />
              <span className="text-sm text-white/60">
                <span className="font-semibold text-white">{data.total}</span> repositor{data.total !== 1 ? "ies" : "y"}
              </span>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/4 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <svg className="size-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Failed to load repositories</h3>
            <p className="text-white/40 text-sm">{(error as any)?.response?.data?.detail ?? "Please try again."}</p>
          </div>
        )}

        {/* Empty */}
        {data && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <svg className="size-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No repositories yet</h3>
            <p className="text-white/40 mb-6 max-w-sm">
              {canCreate
                ? "Create your first repository to start collaborating."
                : "No repositories have been created in this organization yet."}
            </p>
            {canCreate && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                Create your first repository
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((repo) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  orgId={orgId}
                  currentRole={currentRole}
                />
              ))}
            </div>
            <Pagination
              page={page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <CreateRepoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orgId={orgId}
      />
    </main>
  );
}
