"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { pullRequestsApi } from "@/services/pull_requests";
import PRCommentThread from "@/components/pull_requests/PRCommentThread";
import PRReviewModal from "@/components/pull_requests/PRReviewModal";

export default function PRDetailPage() {
  const { id: prId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const { data: pr, isLoading } = useQuery({
    queryKey: ["pull_request", prId],
    queryFn: () => pullRequestsApi.get(prId),
    enabled: Boolean(prId),
  });

  const mergeMutation = useMutation({
    mutationFn: () => pullRequestsApi.merge(prId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pull_request", prId] }),
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#080a0f] text-white p-10 flex justify-center">
        <div className="size-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!pr) {
    return (
      <main className="min-h-screen bg-[#080a0f] text-white flex items-center justify-center">
        <p className="text-white/40 text-lg">Pull request not found.</p>
      </main>
    );
  }

  const isOpen = pr.status === "open";
  const isMerged = pr.status === "merged";
  const isClosed = pr.status === "closed";

  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      <nav className="border-b border-white/6 bg-[#080a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-2 text-sm">
          <Link href={`/repositories/${pr.repository_id}/pull_requests`} className="text-white/40 hover:text-white transition-colors">
            Pull Requests
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/70 font-medium">#{pr.number}</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              {pr.title}
              <span className="text-white/30 font-normal">#{pr.number}</span>
            </h1>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className={`px-3 py-1 rounded-full border font-medium flex items-center gap-1.5 ${
                isOpen ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                isMerged ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  ) : isMerged ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  )}
                </svg>
                {isOpen ? "Open" : isMerged ? "Merged" : "Closed"}
              </span>
              <span className="text-white/40">
                {pr.author.username} wants to merge into <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">{pr.target_branch}</code> from <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">{pr.source_branch}</code>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setReviewModalOpen(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white">
              Review changes
            </button>
            <div className="relative group">
              <button 
                onClick={() => mergeMutation.mutate()}
                disabled={!isOpen || mergeMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                {mergeMutation.isPending ? "Merging..." : "Merge pull request"}
              </button>
              {!isOpen && (
                <div className="absolute top-full mt-2 w-48 p-2 bg-[#1a1d24] text-xs text-white/70 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all text-center border border-white/10 z-50">
                  This PR is already {pr.status}.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-[#0f1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="font-medium text-white/80">Description</h3>
              </div>
              <div className="p-5 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
                {pr.description || <span className="italic text-white/30">No description provided.</span>}
              </div>
            </div>

            <PRCommentThread comments={pr.comments} prId={pr.id} />
          </div>

          <div className="space-y-6">
            <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-5 shadow-2xl">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Reviews</h3>
              
              {pr.reviews.length > 0 ? (
                <div className="space-y-3">
                  {pr.reviews.map(r => (
                    <div key={r.id} className="flex items-start gap-3">
                      <div className="size-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {r.reviewer.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {r.reviewer.username}
                          {r.status === "approved" && <span className="text-emerald-400 text-xs">✓ Approved</span>}
                          {r.status === "changes_requested" && <span className="text-orange-400 text-xs">✗ Changes</span>}
                          {r.status === "commented" && <span className="text-white/40 text-xs">○ Commented</span>}
                        </div>
                        {r.comment && <div className="text-xs text-white/60 mt-1">{r.comment}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/30 italic">No reviews yet.</div>
              )}
            </div>
            
            <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-5 shadow-2xl">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/40 mb-1">Linked Issue</div>
                  <div className="text-sm font-medium">
                    {pr.issue_id ? <Link href={`/issues/${pr.issue_id}`} className="text-indigo-400 hover:underline">#{pr.issue_id.slice(0,8)}</Link> : <span className="text-white/30 italic">None</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PRReviewModal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} prId={prId} />
    </main>
  );
}
