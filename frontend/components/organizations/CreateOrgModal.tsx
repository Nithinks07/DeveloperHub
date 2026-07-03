"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  organizationsApi,
  type Organization,
  type CreateOrganizationPayload,
  type UpdateOrganizationPayload,
} from "@/services/organizations";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Pass an existing org to switch into edit mode */
  editOrg?: Organization;
}

export function CreateOrgModal({ isOpen, onClose, editOrg }: Props) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(editOrg);

  const [name, setName] = useState(editOrg?.name ?? "");
  const [slug, setSlug] = useState(editOrg?.slug ?? "");
  const [description, setDescription] = useState(editOrg?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name when creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateOrganizationPayload) =>
      organizationsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to create organization.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateOrganizationPayload) =>
      organizationsApi.update(editOrg!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", editOrg!.id] });
      handleClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to update organization.");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleClose = () => {
    setError(null);
    if (!isEdit) {
      setName("");
      setSlug("");
      setDescription("");
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isEdit) {
      updateMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
    } else {
      createMutation.mutate({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isEdit ? "Edit Organization" : "Create Organization"}
              </h2>
              <p className="mt-0.5 text-sm text-white/50">
                {isEdit
                  ? "Update your organization's details."
                  : "Set up a new organization for your team."}
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
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
              Organization name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corp"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Slug (create only) */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Slug <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 bg-white/3 border border-r-0 border-white/10 rounded-l-lg text-white/30 text-sm select-none">
                  hub/
                </span>
                <input
                  type="text"
                  required
                  pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  title="Lowercase letters, digits, and hyphens only."
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="acme-corp"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-r-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
              <p className="mt-1 text-xs text-white/30">
                Lowercase letters, digits, and hyphens only.
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this organization do?"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
            />
          </div>

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
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
