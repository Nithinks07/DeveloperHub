"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { issuesApi, type IssueDetail } from "@/services/issues";
import IssueCommentThread from "@/components/issues/IssueCommentThread";

export default function IssueDetailPage() {
  const { id: issueId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: issue, isLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => issuesApi.get(issueId),
    enabled: Boolean(issueId),
  });

  const updateMutation = useMutation({
    mutationFn: (status: "open" | "closed") => issuesApi.update(issueId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["issue", issueId] }),
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#080a0f] text-white p-10 flex justify-center">
        <div className="size-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!issue) {
    return (
      <main className="min-h-screen bg-[#080a0f] text-white flex items-center justify-center">
        <p className="text-white/40 text-lg">Issue not found.</p>
      </main>
    );
  }

  const isOpen = issue.status === "open";

  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      <nav className="border-b border-white/6 bg-[#080a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-2 text-sm">
          <Link href={`/repositories/${issue.repository_id}/issues`} className="text-white/40 hover:text-white transition-colors">
            Issues
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/70 font-medium">#{issue.number}</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              {issue.title}
              <span className="text-white/30 font-normal">#{issue.number}</span>
            </h1>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className={`px-3 py-1 rounded-full border font-medium flex items-center gap-1.5 ${
                isOpen 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-purple-500/10 text-purple-400 border-purple-500/20"
              }`}>
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                {isOpen ? "Open" : "Closed"}
              </span>
              <span className="text-white/40">
                Opened {new Date(issue.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateMutation.mutate(isOpen ? "closed" : "open")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg ${
                isOpen 
                  ? "bg-white/5 border border-white/10 hover:bg-white/10 text-white" 
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
              }`}>
              {isOpen ? "Close issue" : "Reopen issue"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-[#0f1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="font-medium text-white/80">Description</h3>
              </div>
              <div className="p-5 text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
                {issue.description || <span className="italic text-white/30">No description provided.</span>}
              </div>
            </div>

            <IssueCommentThread comments={issue.comments} issueId={issue.id} />
          </div>

          <div className="space-y-6">
            <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-5 shadow-2xl">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">Details</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-white/40 mb-1">Type</div>
                  <div className="text-sm font-medium capitalize">{issue.type}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-1">Priority</div>
                  <div className="text-sm font-medium capitalize flex items-center gap-2">
                    <span className={`size-2 rounded-full ${
                      issue.priority === "critical" ? "bg-red-500" :
                      issue.priority === "high" ? "bg-orange-500" :
                      issue.priority === "medium" ? "bg-yellow-500" : "bg-emerald-500"
                    }`} />
                    {issue.priority}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-1">Assignee</div>
                  <div className="text-sm font-medium">
                    {issue.assigned_to ? "Assigned" : <span className="text-white/30 italic">Unassigned</span>}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-white/40 mb-1.5">Labels</div>
                  {issue.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {issue.labels.map(l => (
                        <span key={l.id} className="px-2 py-0.5 rounded-full text-xs font-medium border"
                          style={{ borderColor: `${l.color}40`, backgroundColor: `${l.color}15`, color: l.color }}>
                          {l.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-white/30 italic">None yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
