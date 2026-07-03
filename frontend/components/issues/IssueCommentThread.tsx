"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi, type IssueComment } from "@/services/issues";

function CommentNode({
  comment,
  issueId,
  level = 0,
}: {
  comment: IssueComment;
  issueId: string;
  level?: number;
}) {
  const queryClient = useQueryClient();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const replyMutation = useMutation({
    mutationFn: () => issuesApi.addComment(issueId, { content: replyContent, parent_comment_id: comment.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      setIsReplying(false);
      setReplyContent("");
    },
  });

  return (
    <div className={`pt-4 ${level > 0 ? "ml-6 pl-4 border-l border-white/10 mt-2" : "mt-6 border-t border-white/10"}`}>
      <div className="flex items-start gap-3">
        <div className="size-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
          {comment.author.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-[#151822] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-xs">
              <span className="font-semibold text-white/80">{comment.author.username}</span>
              <span className="text-white/40">{new Date(comment.created_at).toLocaleString()}</span>
            </div>
            <div className="p-4 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
              {comment.content}
            </div>
            <div className="px-4 py-2 flex items-center gap-4 border-t border-white/5">
              <button onClick={() => setIsReplying(!isReplying)}
                className="text-xs font-medium text-white/40 hover:text-white transition-colors flex items-center gap-1.5">
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Reply
              </button>
            </div>
          </div>

          {isReplying && (
            <div className="mt-3 ml-4">
              <textarea autoFocus rows={3} value={replyContent} onChange={e => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-all resize-none" />
              <div className="flex gap-2 mt-2 justify-end">
                <button onClick={() => setIsReplying(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white transition-all">Cancel</button>
                <button onClick={() => replyMutation.mutate()} disabled={replyMutation.isPending || !replyContent.trim()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all disabled:opacity-50">
                  {replyMutation.isPending ? "Posting..." : "Post reply"}
                </button>
              </div>
            </div>
          )}

          {comment.replies?.length > 0 && (
            <div className="mt-2">
              {comment.replies.map(reply => (
                <CommentNode key={reply.id} comment={reply} issueId={issueId} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IssueCommentThread({
  comments,
  issueId,
}: {
  comments: IssueComment[];
  issueId: string;
}) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  
  const mutation = useMutation({
    mutationFn: () => issuesApi.addComment(issueId, { content: newComment, parent_comment_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      setNewComment("");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        {comments.map(c => (
          <CommentNode key={c.id} comment={c} issueId={issueId} />
        ))}
      </div>

      <div className="pt-6 border-t border-white/10">
        <h3 className="text-sm font-semibold text-white mb-3">Add a comment</h3>
        <textarea rows={4} value={newComment} onChange={e => setNewComment(e.target.value)}
          placeholder="Leave a comment..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-[#151822] transition-all resize-none" />
        <div className="flex justify-end mt-3">
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !newComment.trim()}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20">
            {mutation.isPending ? "Commenting..." : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
