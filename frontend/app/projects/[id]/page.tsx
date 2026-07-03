"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  projectsApi,
  tasksApi,
  TASK_STATUSES,
  STATUS_LABELS,
  PRIORITY_COLORS,
  type Task,
  type TaskStatus,
  type ProjectDetail,
  type PatchTaskPayload,
} from "@/services/projects";
import { CreateTaskModal } from "@/components/projects/CreateTaskModal";

// ---------------------------------------------------------------------------
// Column colour accents
// ---------------------------------------------------------------------------
const COLUMN_STYLES: Record<TaskStatus, { dot: string; header: string; bg: string; border: string }> = {
  backlog:     { dot: "bg-slate-500",   header: "text-slate-300",   bg: "bg-slate-500/5",    border: "border-slate-500/15" },
  todo:        { dot: "bg-sky-500",     header: "text-sky-300",     bg: "bg-sky-500/5",      border: "border-sky-500/15" },
  in_progress: { dot: "bg-indigo-500",  header: "text-indigo-300",  bg: "bg-indigo-500/5",   border: "border-indigo-500/15" },
  review:      { dot: "bg-purple-500",  header: "text-purple-300",  bg: "bg-purple-500/5",   border: "border-purple-500/15" },
  testing:     { dot: "bg-amber-500",   header: "text-amber-300",   bg: "bg-amber-500/5",    border: "border-amber-500/15" },
  completed:   { dot: "bg-emerald-500", header: "text-emerald-300", bg: "bg-emerald-500/5",  border: "border-emerald-500/15" },
};

const PRIORITY_DOTS: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-sky-400",
  high: "bg-amber-400",
  critical: "bg-red-400",
};

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
interface Toast { id: number; message: string; type: "error" | "success" }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (message: string, type: "error" | "success" = "error") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  };
  return { toasts, add };
}

// ---------------------------------------------------------------------------
// Task card
// ---------------------------------------------------------------------------
function TaskCard({ task, index }: { task: Task; index: number }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`group p-3 rounded-xl border bg-[#0f1117] text-sm mb-2 cursor-grab active:cursor-grabbing select-none transition-all ${
            snapshot.isDragging
              ? "shadow-2xl shadow-black/60 border-indigo-500/40 scale-[1.02] rotate-1"
              : "border-white/8 hover:border-white/16"
          }`}
        >
          {/* Priority dot + title */}
          <div className="flex items-start gap-2">
            <span className={`mt-1.5 size-1.5 rounded-full shrink-0 ${PRIORITY_DOTS[task.priority] ?? "bg-slate-400"}`} />
            <span className="font-medium text-white/90 leading-snug break-words">{task.title}</span>
          </div>

          {task.description && (
            <p className="mt-1.5 ml-3.5 text-xs text-white/35 leading-relaxed line-clamp-2">{task.description}</p>
          )}

          {/* Footer */}
          <div className="mt-2.5 ml-3.5 flex items-center gap-2">
            <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[task.priority] ?? "text-white/40"}`}>
              {task.priority}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ---------------------------------------------------------------------------
// Kanban column
// ---------------------------------------------------------------------------
function KanbanColumn({
  status,
  tasks,
  onAddTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: () => void;
}) {
  const style = COLUMN_STYLES[status];

  return (
    <div className={`flex flex-col min-w-[260px] w-64 shrink-0 rounded-2xl border ${style.border} ${style.bg}`}>
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${style.dot}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${style.header}`}>
            {STATUS_LABELS[status]}
          </span>
          <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          title={`Add task to ${STATUS_LABELS[status]}`}
          className="text-white/25 hover:text-white/60 transition-colors"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 min-h-[120px] transition-colors rounded-b-2xl ${
              snapshot.isDraggingOver ? "bg-white/3" : ""
            }`}
          >
            {tasks.map((task, idx) => (
              <TaskCard key={task.id} task={task} index={idx} />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="py-4 text-center text-white/20 text-xs italic">No tasks</div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Optimistic update helpers
// ---------------------------------------------------------------------------

/** Produce a new tasks_by_status after moving a task, without hitting the API. */
function applyOptimisticMove(
  current: Record<TaskStatus, Task[]>,
  taskId: string,
  destStatus: TaskStatus,
  destIndex: number,
): Record<TaskStatus, Task[]> {
  // Find the task
  let movedTask: Task | null = null;
  const next: Record<TaskStatus, Task[]> = {} as any;

  for (const st of TASK_STATUSES) {
    next[st] = current[st].filter((t) => {
      if (t.id === taskId) { movedTask = t; return false; }
      return true;
    }).map((t, i) => ({ ...t, order: i }));
  }

  if (!movedTask) return current;

  const destCol = [...next[destStatus]];
  const updatedTask = { ...(movedTask as Task), status: destStatus, order: destIndex };
  destCol.splice(destIndex, 0, updatedTask);
  next[destStatus] = destCol.map((t, i) => ({ ...t, order: i }));

  return next;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function KanbanPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toasts, add: addToast } = useToast();

  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });

  const patchMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: PatchTaskPayload }) =>
      tasksApi.patch(taskId, payload),
    // Optimistic update
    onMutate: async ({ taskId, payload }) => {
      await queryClient.cancelQueries({ queryKey: ["project", projectId] });
      const previous = queryClient.getQueryData<ProjectDetail>(["project", projectId]);

      if (previous && payload.status !== undefined) {
        queryClient.setQueryData<ProjectDetail>(["project", projectId], {
          ...previous,
          tasks_by_status: applyOptimisticMove(
            previous.tasks_by_status,
            taskId,
            payload.status,
            payload.order ?? 0,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["project", projectId], context.previous);
      }
      addToast("Failed to move task. Rolled back.", "error");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      patchMutation.mutate({
        taskId: draggableId,
        payload: {
          status: destination.droppableId as TaskStatus,
          order: destination.index,
        },
      });
    },
    [patchMutation],
  );

  return (
    <main className="min-h-screen bg-[#080a0f] text-white flex flex-col">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium ${
            t.type === "error" ? "bg-red-950/90 border-red-500/30 text-red-300" : "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
          }`}>
            <svg className="size-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {t.type === "error"
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
            </svg>
            {t.message}
          </div>
        ))}
      </div>

      {/* Nav */}
      <nav className="border-b border-white/6 bg-[#080a0f]/80 backdrop-blur-xl sticky top-0 z-30 shrink-0">
        <div className="max-w-none px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm overflow-hidden">
            <Link href="/organizations" className="text-white/40 hover:text-white transition-colors shrink-0">Organizations</Link>
            <span className="text-white/20">/</span>
            {project && (
              <>
                <Link href={`/repositories/${project.repository_id}`} className="text-white/40 hover:text-white transition-colors shrink-0">Repository</Link>
                <span className="text-white/20">/</span>
              </>
            )}
            <span className="text-white/70 font-medium truncate">{project?.name ?? "…"}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {project && (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${
                project.status === "active"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  : "bg-white/5 text-white/40 border-white/10"
              }`}>
                {project.status}
              </span>
            )}
            <button
              onClick={() => setCreateTaskOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New task
            </button>
          </div>
        </div>
      </nav>

      {/* Board header */}
      {project && (
        <div className="px-6 py-5 border-b border-white/6 shrink-0">
          <h1 className="text-xl font-bold text-white">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-white/45">{project.description}</p>
          )}
          {/* Metadata pills */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {project.milestones.length > 0 && (
              <div className="flex items-center gap-1.5">
                {project.milestones.map((ms) => (
                  <span key={ms.id} className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                    <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H13.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    {ms.name}
                  </span>
                ))}
              </div>
            )}
            {project.labels.length > 0 && (
              <div className="flex items-center gap-1.5">
                {project.labels.map((lb) => (
                  <span
                    key={lb.id}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium border"
                    style={{ backgroundColor: `${lb.color}22`, borderColor: `${lb.color}44`, color: lb.color }}
                  >
                    {lb.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-3">
            {TASK_STATUSES.map((s) => (
              <div key={s} className="w-64 h-64 rounded-2xl bg-white/4 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
          <div className="size-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <svg className="size-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-white/50 text-sm">Failed to load project.</p>
        </div>
      )}

      {/* Kanban board — horizontal scroll */}
      {project && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-4 p-6 min-h-full" style={{ minWidth: "max-content" }}>
              {TASK_STATUSES.map((colStatus) => (
                <KanbanColumn
                  key={colStatus}
                  status={colStatus}
                  tasks={project.tasks_by_status[colStatus] ?? []}
                  onAddTask={() => setCreateTaskOpen(true)}
                />
              ))}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Create task modal */}
      {project && (
        <CreateTaskModal
          isOpen={createTaskOpen}
          onClose={() => setCreateTaskOpen(false)}
          projectId={projectId}
        />
      )}
    </main>
  );
}
