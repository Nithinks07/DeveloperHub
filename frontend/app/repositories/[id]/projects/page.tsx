"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { projectsApi, type Project, type CreateProjectPayload } from "@/services/projects";
import { repositoriesApi } from "@/services/repositories";

// ---------------------------------------------------------------------------
// Create Project Modal (inline — lightweight)
// ---------------------------------------------------------------------------
function CreateProjectModal({
  isOpen,
  onClose,
  repoId,
}: {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsApi.create(repoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", repoId] });
      setName(""); setDescription(""); setError(null);
      onClose();
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? "Failed to create project."),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl">
        <div className="px-6 pt-6 pb-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">New project</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 p-1 rounded-lg hover:bg-white/5 transition-all">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ name, description: description || undefined }); }}
          className="px-6 py-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Name <span className="text-red-400">*</span></label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3 Sprint"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description…"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={mutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {mutation.isPending && <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {mutation.isPending ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project card
// ---------------------------------------------------------------------------
function ProjectCard({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const repoId = project.repository_id;

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(project.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", repoId] }),
  });

  return (
    <div className="group relative flex flex-col bg-[#0f1117] border border-white/8 rounded-2xl p-5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-700 to-purple-800 flex items-center justify-center shrink-0">
          <svg className="size-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${
            project.status === "active"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
              : "bg-white/5 text-white/40 border-white/10"
          }`}>{project.status}</span>
          <button onClick={() => setShowConfirm(true)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <Link href={`/projects/${project.id}`} className="block mb-1">
        <h3 className="font-semibold text-white hover:text-indigo-300 transition-colors">{project.name}</h3>
      </Link>
      {project.description ? (
        <p className="text-sm text-white/50 mb-4 line-clamp-2 leading-relaxed">{project.description}</p>
      ) : (
        <p className="text-sm text-white/20 italic mb-4">No description</p>
      )}

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/6">
        <span className="text-xs text-white/25">
          {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <Link href={`/projects/${project.id}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-1">
          Open board
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
          <p className="text-sm text-white/80 text-center font-medium">Delete this project?</p>
          <p className="text-xs text-white/40 text-center">All tasks will be permanently deleted.</p>
          <div className="flex gap-2 w-full">
            <button onClick={() => setShowConfirm(false)} className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white text-xs font-medium transition-all">Cancel</button>
            <button onClick={() => { deleteMutation.mutate(); setShowConfirm(false); }} disabled={deleteMutation.isPending}
              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all disabled:opacity-50">
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
export default function ProjectsPage() {
  const { id: repoId } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: repo } = useQuery({
    queryKey: ["repository", repoId],
    queryFn: () => repositoriesApi.get(repoId),
    enabled: Boolean(repoId),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects", repoId, page],
    queryFn: () => projectsApi.list(repoId, page, 20),
    enabled: Boolean(repoId),
  });

  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      <nav className="border-b border-white/6 bg-[#080a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-2 text-sm">
          <Link href="/organizations" className="text-white/40 hover:text-white transition-colors">Organizations</Link>
          <span className="text-white/20">/</span>
          <Link href={`/repositories/${repoId}`} className="text-white/40 hover:text-white transition-colors truncate max-w-[10rem]">
            {repo?.name ?? "Repository"}
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/70 font-medium">Projects</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Projects</h1>
            <p className="mt-1 text-white/40">
              {repo ? `Kanban boards in ${repo.name}` : "Project boards in this repository."}
            </p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New project
          </button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-white/4 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-white/40">Failed to load projects.</p>
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <svg className="size-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-white/40 mb-6 max-w-sm">Create your first project to start organizing work on this repository.</p>
            <button onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
              Create your first project
            </button>
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
            {data.total > data.page_size && (
              <div className="flex items-center justify-between mt-6 text-sm">
                <span className="text-white/40">
                  Showing {(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} of {data.total}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 text-xs transition-all">← Prev</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * data.page_size >= data.total}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 text-xs transition-all">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CreateProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} repoId={repoId} />
    </main>
  );
}
