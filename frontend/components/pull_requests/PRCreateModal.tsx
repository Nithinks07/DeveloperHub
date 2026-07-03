"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pullRequestsApi, type CreatePRPayload } from "@/services/pull_requests";

export default function PRCreateModal({
  isOpen,
  onClose,
  repoId,
}: {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("main");
  const [issueId, setIssueId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CreatePRPayload) => pullRequestsApi.create(repoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pull_requests", repoId] });
      setTitle("");
      setDescription("");
      setSourceBranch("");
      setTargetBranch("main");
      setIssueId("");
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to create PR.");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-full">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-white">Open a pull request</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          
          <form id="create-pr-form" onSubmit={(e) => { 
            e.preventDefault(); 
            mutation.mutate({ 
              title, 
              description, 
              source_branch: sourceBranch, 
              target_branch: targetBranch,
              issue_id: issueId || undefined,
            }); 
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Title <span className="text-red-400">*</span></label>
              <input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Fix login for Firefox"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Source Branch <span className="text-red-400">*</span></label>
                <input required value={sourceBranch} onChange={(e) => setSourceBranch(e.target.value)} placeholder="fix/firefox-login"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Target Branch <span className="text-red-400">*</span></label>
                <input required value={targetBranch} onChange={(e) => setTargetBranch(e.target.value)} placeholder="main"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Issue ID (Optional)</label>
              <input value={issueId} onChange={(e) => setIssueId(e.target.value)} placeholder="UUID of an existing issue"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-all" />
              <p className="text-xs text-white/30 mt-1">Links this PR to an issue.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Description</label>
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your changes..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-all resize-none" />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3 shrink-0 bg-[#0f1117] rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all">Cancel</button>
          <button type="submit" form="create-pr-form" disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending && <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            Create Pull Request
          </button>
        </div>
      </div>
    </div>
  );
}
