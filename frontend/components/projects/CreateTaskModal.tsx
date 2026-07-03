"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, type TaskPriority, type CreateTaskPayload } from "@/services/projects";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "text-slate-400 border-slate-500/30 bg-slate-500/10" },
  { value: "medium", label: "Medium", color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  { value: "high", label: "High", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { value: "critical", label: "Critical", color: "text-red-400 border-red-500/30 bg-red-500/10" },
];

export function CreateTaskModal({ isOpen, onClose, projectId }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.create(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to create task.");
    },
  });

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/50">
        <div className="px-6 pt-6 pb-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">New task</h2>
          <button onClick={handleClose} className="text-white/40 hover:text-white/80 p-1 rounded-lg hover:bg-white/5 transition-all">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate({ title, description: description || undefined, priority }); }}
          className="px-6 py-5 space-y-4"
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Title <span className="text-red-400">*</span></label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    priority === p.value ? p.color : "border-white/8 text-white/40 hover:border-white/15 hover:text-white/60"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={handleClose} disabled={mutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm font-medium transition-all disabled:opacity-50"
            >Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending && <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {mutation.isPending ? "Creating…" : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
