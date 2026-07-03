"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  repositoriesApi,
  type Repository,
  type CreateRepositoryPayload,
  type UpdateRepositoryPayload,
} from "@/services/repositories";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  /** Pass an existing repo to enter edit mode */
  editRepo?: Repository;
}

export function CreateRepoModal({ isOpen, onClose, orgId, editRepo }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(editRepo);

  const [name, setName] = useState(editRepo?.name ?? "");
  const [description, setDescription] = useState(editRepo?.description ?? "");
  const [isPrivate, setIsPrivate] = useState(editRepo?.is_private ?? false);
  const [readme, setReadme] = useState(editRepo?.readme ?? "");
  const [error, setError] = useState<string | null>(null);
  const [readmeTab, setReadmeTab] = useState<"edit" | "preview">("edit");

  const createMutation = useMutation({
    mutationFn: (payload: CreateRepositoryPayload) =>
      repositoriesApi.create(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories", orgId] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to create repository.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateRepositoryPayload) =>
      repositoriesApi.update(editRepo!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories", orgId] });
      queryClient.invalidateQueries({ queryKey: ["repository", editRepo!.id] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to update repository.");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleClose = () => {
    setError(null);
    if (!isEdit) {
      setName("");
      setDescription("");
      setIsPrivate(false);
      setReadme("");
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isEdit) {
      updateMutation.mutate({
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        is_private: isPrivate,
        readme: readme || undefined,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        is_private: isPrivate,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? "Edit repository" : "Create repository"}
              </h2>
              <p className="mt-0.5 text-sm text-white/50">
                {isEdit ? "Update repository settings." : "Set up a new repository in this organization."}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white/40 hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <svg className="size-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Repository name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-repo"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description…"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Visibility toggle */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Public */}
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  !isPrivate
                    ? "border-indigo-500/50 bg-indigo-500/10"
                    : "border-white/8 hover:border-white/15 hover:bg-white/3"
                }`}
              >
                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                  !isPrivate ? "bg-indigo-500/20" : "bg-white/5"
                }`}>
                  <svg className={`size-4 ${!isPrivate ? "text-indigo-400" : "text-white/30"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className={`text-sm font-medium ${!isPrivate ? "text-indigo-300" : "text-white/60"}`}>Public</div>
                  <div className="text-xs text-white/30">Anyone can see this</div>
                </div>
              </button>

              {/* Private */}
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  isPrivate
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-white/8 hover:border-white/15 hover:bg-white/3"
                }`}
              >
                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isPrivate ? "bg-amber-500/20" : "bg-white/5"
                }`}>
                  <svg className={`size-4 ${isPrivate ? "text-amber-400" : "text-white/30"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <div className={`text-sm font-medium ${isPrivate ? "text-amber-300" : "text-white/60"}`}>Private</div>
                  <div className="text-xs text-white/30">Only members can see</div>
                </div>
              </button>
            </div>
          </div>

          {/* README editor (edit mode only) */}
          {isEdit && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-white/70">README</label>
                <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setReadmeTab("edit")}
                    className={`px-3 py-1 transition-colors ${readmeTab === "edit" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadmeTab("preview")}
                    className={`px-3 py-1 transition-colors ${readmeTab === "preview" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
                  >
                    Preview
                  </button>
                </div>
              </div>
              {readmeTab === "edit" ? (
                <textarea
                  rows={8}
                  value={readme}
                  onChange={(e) => setReadme(e.target.value)}
                  placeholder="# My Repository&#10;&#10;Welcome to my project..."
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm font-mono focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                />
              ) : (
                <div className="min-h-[10rem] px-3 py-2 bg-white/3 border border-white/8 rounded-lg text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-mono">
                  {readme || <span className="text-white/20 italic">No content</span>}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5 text-sm font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending && (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create repository"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
