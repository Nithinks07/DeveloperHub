"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { repositoriesApi } from "@/services/repositories";
import { organizationsApi } from "@/services/organizations";
import { CreateRepoModal } from "@/components/repositories/CreateRepoModal";

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------
const ROLE_ORDER: Record<string, number> = {
  guest: 0, developer: 1, maintainer: 2, admin: 3, owner: 4,
};
function hasMinRole(role: string | undefined, min: string): boolean {
  if (!role) return false;
  return (ROLE_ORDER[role] ?? -1) >= (ROLE_ORDER[min] ?? 99);
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  admin: "bg-red-500/15 text-red-300 border-red-500/20",
  maintainer: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  developer: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  guest: "bg-white/8 text-white/40 border-white/10",
};

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
interface Toast { id: number; message: string; type: "error" | "success" }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (message: string, type: "error" | "success" = "error") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  };
  return { toasts, addToast };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function RepositoryDetailPage() {
  const { id: repoId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toasts, addToast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: repo, isLoading, isError } = useQuery({
    queryKey: ["repository", repoId],
    queryFn: () => repositoriesApi.get(repoId),
    enabled: Boolean(repoId),
  });

  // Fetch org detail to know current user's role
  const { data: orgDetail } = useQuery({
    queryKey: ["organization", repo?.organization_id],
    queryFn: () => organizationsApi.get(repo!.organization_id),
    enabled: Boolean(repo?.organization_id),
  });

  const currentRole = orgDetail?.members?.[0]?.role;
  const canEdit = hasMinRole(currentRole, "developer");
  const canDelete = hasMinRole(currentRole, "maintainer");

  const deleteMutation = useMutation({
    mutationFn: () => repositoriesApi.delete(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories", repo?.organization_id] });
      router.push(`/organizations/${repo?.organization_id}/repositories`);
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.detail ?? "Failed to delete repository.", "error");
      setShowDeleteConfirm(false);
    },
  });

  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium ${
              t.type === "error"
                ? "bg-red-950/90 border-red-500/30 text-red-300"
                : "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <svg className="size-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {t.type === "error"
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
            </svg>
            {t.message}
          </div>
        ))}
      </div>

      {/* Nav */}
      <nav className="border-b border-white/6 bg-[#080a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-2 text-sm">
          <Link href="/organizations" className="text-white/40 hover:text-white transition-colors">Organizations</Link>
          <span className="text-white/20">/</span>
          {orgDetail && (
            <>
              <Link href={`/organizations/${orgDetail.id}`} className="text-white/40 hover:text-white transition-colors truncate max-w-[8rem]">
                {orgDetail.name}
              </Link>
              <span className="text-white/20">/</span>
              <Link href={`/organizations/${orgDetail.id}/repositories`} className="text-white/40 hover:text-white transition-colors">
                Repositories
              </Link>
              <span className="text-white/20">/</span>
            </>
          )}
          <span className="text-white/70 font-medium font-mono truncate">{repo?.name ?? "…"}</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-6">
            <div className="h-36 rounded-2xl bg-white/4 animate-pulse" />
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
            <h3 className="text-lg font-semibold text-white mb-1">Repository not found</h3>
            <Link href="/organizations" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors mt-2">
              ← Back to organizations
            </Link>
          </div>
        )}

        {repo && (
          <div className="space-y-6">
            {/* Header card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0f1117] to-[#131825] border border-white/8 rounded-2xl p-6">
              <div className="absolute -top-8 -right-8 size-36 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />

              <div className="flex items-start gap-5">
                {/* Icon */}
                <div className="size-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                  <svg className="size-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight font-mono">{repo.name}</h1>
                    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium ${
                      repo.is_private
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    }`}>
                      {repo.is_private ? "🔒 Private" : "🌐 Public"}
                    </span>
                    {currentRole && (
                      <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize ${ROLE_COLORS[currentRole] ?? ""}`}>
                        {currentRole}
                      </span>
                    )}
                  </div>

                  {repo.description ? (
                    <p className="text-white/50 text-sm leading-relaxed mt-1 max-w-2xl">{repo.description}</p>
                  ) : (
                    <p className="text-white/20 text-sm italic mt-1">No description provided.</p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                    <span className="flex items-center gap-1.5">
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Created {new Date(repo.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {canEdit && (
                    <button
                      onClick={() => setEditOpen(true)}
                      className="px-3 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 hover:bg-white/5 text-sm transition-all flex items-center gap-1.5"
                    >
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                  {/* Delete — hidden entirely for roles below maintainer */}
                  {canDelete && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-2 rounded-xl border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/8 text-sm transition-all flex items-center gap-1.5"
                    >
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* README section */}
            <div className="bg-[#0f1117] border border-white/8 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/6 flex items-center gap-2">
                <svg className="size-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="font-semibold text-white">README.md</h2>
              </div>
              <div className="px-6 py-5">
                {repo.readme ? (
                  <pre className="text-sm text-white/70 leading-relaxed font-mono whitespace-pre-wrap">
                    {repo.readme}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="size-12 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-3">
                      <svg className="size-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-white/30 text-sm">No README file yet.</p>
                    {canEdit && (
                      <button
                        onClick={() => setEditOpen(true)}
                        className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                      >
                        Add a README →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Projects",
                  description: "Kanban boards and sprints",
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
                  color: "text-blue-400",
                  href: "#",
                },
                {
                  label: "Issues",
                  description: "Bug reports and tasks",
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
                  color: "text-amber-400",
                  href: "#",
                },
                {
                  label: "Pull Requests",
                  description: "Code review and merges",
                  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
                  color: "text-purple-400",
                  href: "#",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/3 border border-white/6 hover:border-white/12 hover:bg-white/5 transition-all cursor-default"
                >
                  <div className="size-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <svg className={`size-5 ${item.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.icon}
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    <div className="text-xs text-white/35">{item.description}</div>
                  </div>
                  <span className="ml-auto text-xs text-white/20 italic">Coming soon</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && repo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-[#0f1117] border border-red-500/20 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <svg className="size-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white">Delete repository?</h3>
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              <span className="font-mono text-white/80">{repo.name}</span> and all its projects, issues, and pull requests will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending && (
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {deleteMutation.isPending ? "Deleting…" : "Delete repository"}
              </button>
            </div>
          </div>
        </div>
      )}

      {repo && (
        <CreateRepoModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          orgId={repo.organization_id}
          editRepo={repo}
        />
      )}
    </main>
  );
}
