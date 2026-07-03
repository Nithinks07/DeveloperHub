"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pullRequestsApi, type ReviewStatus, type CreatePRReviewPayload } from "@/services/pull_requests";

export default function PRReviewModal({
  isOpen,
  onClose,
  prId,
}: {
  isOpen: boolean;
  onClose: () => void;
  prId: string;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReviewStatus>("commented");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: CreatePRReviewPayload) => pullRequestsApi.submitReview(prId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pull_request", prId] });
      setStatus("commented");
      setComment("");
      setError(null);
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? "Failed to submit review.");
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-full">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-white">Submit a review</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          
          <form id="submit-review-form" onSubmit={(e) => { 
            e.preventDefault(); 
            mutation.mutate({ status, comment: comment.trim() || undefined }); 
          }} className="space-y-6">
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer transition-colors has-[:checked]:bg-emerald-500/10 has-[:checked]:border-emerald-500/30">
                <input type="radio" name="status" value="approved" checked={status === "approved"} onChange={(e) => setStatus(e.target.value as ReviewStatus)} className="mt-1" />
                <div>
                  <div className="font-medium text-white">Approve</div>
                  <div className="text-sm text-white/50">Submit feedback and approve merging these changes.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer transition-colors has-[:checked]:bg-orange-500/10 has-[:checked]:border-orange-500/30">
                <input type="radio" name="status" value="changes_requested" checked={status === "changes_requested"} onChange={(e) => setStatus(e.target.value as ReviewStatus)} className="mt-1" />
                <div>
                  <div className="font-medium text-white">Request changes</div>
                  <div className="text-sm text-white/50">Submit feedback that must be addressed before merging.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer transition-colors has-[:checked]:bg-white/10 has-[:checked]:border-white/20">
                <input type="radio" name="status" value="commented" checked={status === "commented"} onChange={(e) => setStatus(e.target.value as ReviewStatus)} className="mt-1" />
                <div>
                  <div className="font-medium text-white">Comment</div>
                  <div className="text-sm text-white/50">Submit general feedback without explicit approval.</div>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Review Comment (Optional)</label>
              <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave your feedback..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-all resize-none" />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3 shrink-0 bg-[#0f1117] rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all">Cancel</button>
          <button type="submit" form="submit-review-form" disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending ? "Submitting..." : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}
