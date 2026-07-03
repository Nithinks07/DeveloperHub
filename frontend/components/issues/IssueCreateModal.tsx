"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi, type CreateIssuePayload, type IssueType, type IssuePriority } from "@/services/issues";

export default function IssueCreateModal({
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
  const [type, setType] = useState<IssueType>("bug");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CreateIssuePayload) => issuesApi.create(repoId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues", repoId] });
      setTitle("");
      setDescription("");
      setType("bug");
      setPriority("medium");
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to create issue.");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-full">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-white">Create new issue</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          
          <form id="create-issue-form" onSubmit={(e) => { e.preventDefault(); mutation.mutate({ title, description, type, priority }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Title <span className="text-red-400">*</span></label>
              <input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Login fails on Firefox..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as IssueType)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/60 transition-all appearance-none">
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="task">Task</option>
                  <option value="enhancement">Enhancement</option>
                  <option value="documentation">Documentation</option>
                  <option value="research">Research</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as IssuePriority)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500/60 transition-all appearance-none">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Description</label>
              <textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Steps to reproduce..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-all resize-none" />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3 shrink-0 bg-[#0f1117] rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all">Cancel</button>
          <button type="submit" form="create-issue-form" disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending && <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            Create issue
          </button>
        </div>
      </div>
    </div>
  );
}
