"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { repositoriesApi } from "@/services/repositories";
import { issuesApi, type Issue } from "@/services/issues";
import IssueCreateModal from "@/components/issues/IssueCreateModal";

function TypeIcon({ type }: { type: Issue["type"] }) {
  switch (type) {
    case "bug": return <span className="text-red-400">●</span>;
    case "feature": return <span className="text-indigo-400">★</span>;
    case "enhancement": return <span className="text-blue-400">↑</span>;
    default: return <span className="text-white/40">○</span>;
  }
}

export default function IssuesPage() {
  const { id: repoId } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: repo } = useQuery({
    queryKey: ["repository", repoId],
    queryFn: () => repositoriesApi.get(repoId),
    enabled: Boolean(repoId),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["issues", repoId, page],
    queryFn: () => issuesApi.list(repoId, page, 20),
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
          <span className="text-white/70 font-medium">Issues</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Issues</h1>
            <p className="mt-1 text-white/40">Track bugs, features, and tasks.</p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20">
            New issue
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse border border-white/10" />
            ))}
          </div>
        ) : (
          <div className="bg-[#0f1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4 text-sm font-medium text-white/60">
                <span>{data?.total || 0} Open</span>
              </div>
            </div>
            
            <div className="divide-y divide-white/6">
              {data?.items.map(issue => (
                <div key={issue.id} className="p-5 hover:bg-white/[0.02] transition-colors flex items-start gap-4 group">
                  <div className="mt-1"><TypeIcon type={issue.type} /></div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/issues/${issue.id}`} className="text-base font-semibold text-white hover:text-indigo-400 transition-colors">
                      {issue.title}
                    </Link>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-white/40">
                      <span>#{issue.number} opened on {new Date(issue.created_at).toLocaleDateString()}</span>
                      <span className="capitalize px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
                        {issue.priority} priority
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Placeholder for assignee avatar */}
                  </div>
                </div>
              ))}
              
              {data?.items.length === 0 && (
                <div className="p-12 text-center text-white/40">
                  No issues found. Create one to get started.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <IssueCreateModal isOpen={modalOpen} onClose={() => setModalOpen(false)} repoId={repoId} />
    </main>
  );
}
