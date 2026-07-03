"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { organizationsApi, type Organization } from "@/services/organizations";
import { CreateOrgModal } from "@/components/organizations/CreateOrgModal";

// ---------------------------------------------------------------------------
// Role badge colours
// ---------------------------------------------------------------------------
const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  admin: "bg-red-500/15 text-red-300 border-red-500/20",
  maintainer: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  developer: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  guest: "bg-white/8 text-white/40 border-white/10",
};

// ---------------------------------------------------------------------------
// Org Card
// ---------------------------------------------------------------------------
function OrgCard({ org, onDelete }: { org: Organization; onDelete: (id: string) => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => organizationsApi.delete(org.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  return (
    <div className="group relative flex flex-col bg-[#0f1117] border border-white/8 rounded-2xl p-5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Avatar */}
        <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shrink-0">
          {org.name.charAt(0).toUpperCase()}
        </div>
        {/* Delete button */}
        <button
          onClick={() => setShowConfirm(true)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Delete organization"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Name & slug */}
      <Link href={`/organizations/${org.id}`} className="block mb-1">
        <h3 className="font-semibold text-white hover:text-indigo-300 transition-colors leading-tight">
          {org.name}
        </h3>
      </Link>
      <p className="text-xs text-white/30 font-mono mb-3">/{org.slug}</p>

      {/* Description */}
      {org.description && (
        <p className="text-sm text-white/50 leading-relaxed mb-4 line-clamp-2">
          {org.description}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/6">
        <span className="text-xs text-white/25">
          {new Date(org.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <Link
          href={`/organizations/${org.id}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-1"
        >
          View
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Confirm delete overlay */}
      {showConfirm && (
        <div className="absolute inset-0 rounded-2xl bg-[#0f1117]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-5 border border-red-500/20">
          <div className="size-10 rounded-full bg-red-500/15 flex items-center justify-center">
            <svg className="size-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-sm text-white/80 text-center font-medium">Delete this organization?</p>
          <p className="text-xs text-white/40 text-center leading-relaxed">
            This is permanent and will remove all repositories and projects.
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white text-xs font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => { deleteMutation.mutate(); setShowConfirm(false); }}
              disabled={deleteMutation.isPending}
              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm mt-6">
      <span className="text-white/40">
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 text-white/40 text-xs">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function OrganizationsPage() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["organizations", page],
    queryFn: () => organizationsApi.list(page, 20),
  });

  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      {/* Top nav bar */}
      <nav className="border-b border-white/6 bg-[#080a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="font-semibold text-white">DeveloperHub</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold">
              U
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Organizations</h1>
            <p className="mt-1 text-white/40">
              Manage the organizations you own or are a member of.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New organization
          </button>
        </div>

        {/* Stats bar */}
        {data && (
          <div className="flex gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/4 border border-white/8">
              <div className="size-2 rounded-full bg-indigo-400" />
              <span className="text-sm text-white/60">
                <span className="font-semibold text-white">{data.total}</span> organization{data.total !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/4 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <svg className="size-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Failed to load organizations</h3>
            <p className="text-white/40 text-sm">
              {(error as any)?.response?.data?.detail ?? "Please try again."}
            </p>
          </div>
        )}

        {/* Empty state */}
        {data && data.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <svg className="size-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No organizations yet</h3>
            <p className="text-white/40 mb-6 max-w-sm">
              Create your first organization to collaborate with your team on projects.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
            >
              Create your first organization
            </button>
          </div>
        )}

        {/* Grid */}
        {data && data.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((org) => (
                <OrgCard key={org.id} org={org} onDelete={() => {}} />
              ))}
            </div>
            <Pagination
              page={page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <CreateOrgModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </main>
  );
}
