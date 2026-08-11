import React, { useEffect, useState } from "react";
import {
  OfflineSyncService,
  QueuedStudy,
} from "../services/OfflineSyncService";
import {
  CloudOff,
  CloudSun,
  CheckCircle2,
  Database,
  Trash2,
  Play,
  ChevronDown,
  X,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const SyncStatusBadge: React.FC = () => {
  const [queue, setQueue] = useState<QueuedStudy[]>([]);
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showQueue, setShowQueue] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);

  const refreshQueue = async () => {
    const q = await OfflineSyncService.getQueue();
    const est = await OfflineSyncService.getStorageEstimate();
    setQueue(q);
    setEstimate(est);
  };

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatusChange);
    window.addEventListener("offline", handleStatusChange);
    const interval = setInterval(refreshQueue, 5000);
    refreshQueue();
    return () => {
      window.removeEventListener("online", handleStatusChange);
      window.removeEventListener("offline", handleStatusChange);
      clearInterval(interval);
    };
  }, []);

  const handleDelete = async (id: string, patientName: string) => {
    setDeletingId(id);
    try {
      await OfflineSyncService.removeFromQueue(id);
      await refreshQueue();
      toast.success(`Removed ${patientName} from queue`);
    } catch {
      toast.error("Failed to remove from queue");
    } finally {
      setDeletingId(null);
    }
  };

  const handleResume = async (item: QueuedStudy) => {
    if (!isOnline) {
      toast.error("No network connection");
      return;
    }
    setResumingId(item.id);
    try {
      await OfflineSyncService.triggerSync();
      toast.success(`Resuming upload for ${item.metadata.patientName}`);
      setTimeout(refreshQueue, 2000);
    } catch {
      toast.error("Failed to trigger sync");
    } finally {
      setResumingId(null);
    }
  };

  const handleClearAll = async () => {
    for (const item of queue) {
      await OfflineSyncService.removeFromQueue(item.id);
    }
    await refreshQueue();
    toast.success("Queue cleared");
  };

  const storageUsagePercent =
    estimate?.usage && estimate?.quota
      ? (estimate.usage / estimate.quota) * 100
      : 0;
  const isStorageLow = storageUsagePercent > 80;
  const hasPending = queue.length > 0;

  return (
    <>
      {/* Main card content */}
      <div className="flex flex-col justify-between h-full gap-3 w-full">
        {/* Network + Sync row */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                isOnline ? "bg-green-500 animate-pulse" : "bg-red-500",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.16em]",
                isOnline ? "text-muted-foreground" : "text-red-500",
              )}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {hasPending && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600">
              <CloudSun
                className="w-2.5 h-2.5 animate-spin"
                style={{ animationDuration: "3s" }}
              />
              <span className="text-[9px] font-bold uppercase tracking-[0.08em]">
                {queue.length} pending
              </span>
            </div>
          )}
        </div>

        {/* Sync status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300",
              hasPending
                ? "bg-amber-500/15 text-amber-500"
                : "bg-green-500/15 text-green-500",
            )}
          >
            {hasPending ? (
              <CloudSun className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-foreground truncate">
              {hasPending ? `Syncing ${queue.length} studies` : "All synced"}
            </p>
            <p className="text-[9px] text-muted-foreground leading-tight">
              {hasPending ? "Uploading in background" : "Nothing pending"}
            </p>
          </div>
        </div>

        {/* Storage bar */}
        <div className="space-y-1 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              <Database className="w-2.5 h-2.5" />
              <span>Storage</span>
            </div>
            <span
              className={cn(
                "text-[9px] font-bold",
                isStorageLow ? "text-red-500" : "text-muted-foreground",
              )}
            >
              {Math.round(storageUsagePercent)}%
            </span>
          </div>
          <Progress
            value={storageUsagePercent}
            className={cn("h-1", isStorageLow && "[&>div]:bg-red-500")}
          />
        </div>

        {/* Offline warning */}
        {!isOnline && hasPending && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-500/8 border border-red-500/15">
            <CloudOff className="w-2.5 h-2.5 text-red-500 shrink-0" />
            <p className="text-[9px] font-semibold text-red-600 leading-tight">
              Paused — resumes when online
            </p>
          </div>
        )}

        {/* View Queue Button */}
        {hasPending && (
          <button
            onClick={() => setShowQueue(true)}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-all duration-150 group"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground group-hover:text-foreground transition-colors">
              View Queue
            </span>
            <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        )}
      </div>

      {/* Queue Drawer / Modal */}
      {showQueue && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowQueue(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md mx-4 bg-background border border-border rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Sync Queue
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {queue.length} studies pending upload
                </p>
              </div>
              <div className="flex items-center gap-2">
                {queue.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[9px] font-bold uppercase tracking-[0.08em] text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowQueue(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Queue List */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-border/50">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                  <p className="text-xs font-semibold">Queue is empty</p>
                </div>
              ) : (
                ([...queue]
                  .sort((a, b) => {
                    if (a.priority === "urgent" && b.priority !== "urgent")
                      return -1;
                    if (a.priority !== "urgent" && b.priority === "urgent")
                      return 1;
                    return (a.timestamp || 0) - (b.timestamp || 0);
                  })
                  .map((item) => {
                    if (!item) return null;
                    const isDeleting = deletingId === item.id;
                    const isResuming = resumingId === item.id;
                    const timestamp = item.timestamp || Date.now();
                    const queuedAt = new Date(timestamp);
                    const timeAgo = Math.round(
                      (Date.now() - timestamp) / 60000
                    );
                    const fileCount = item.encryptedFiles?.length || 0;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 px-5 py-3.5 transition-all duration-200",
                          isDeleting && "opacity-40 scale-95"
                        )}
                      >
                        {/* Priority indicator */}
                        <div
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                            item.priority === "urgent"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-amber-500/10 text-amber-500"
                          )}
                        >
                          {item.priority === "urgent" ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <CloudSun className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Study info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-[11px] font-bold text-foreground truncate">
                              {item.metadata?.patientName ?? "Unknown Patient"}
                            </p>
                            <span
                              className={cn(
                                "text-[8px] font-bold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-full shrink-0",
                                item.priority === "urgent"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-amber-500/10 text-amber-600"
                              )}
                            >
                              {item.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                            <div className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{timeAgo}m ago</span>
                            </div>
                            <span>·</span>
                            <span>
                              {fileCount} file
                              {fileCount !== 1 ? "s" : ""}
                            </span>
                            {item.retryCount > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-red-500">
                                  {item.retryCount} retries
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleResume(item)}
                            disabled={!isOnline || isResuming || isDeleting}
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                              isOnline
                                ? "hover:bg-green-500/10 text-green-500 hover:text-green-600"
                                : "text-muted-foreground/30 cursor-not-allowed"
                            )}
                            title={isOnline ? "Resume upload" : "No connection"}
                          >
                            {isResuming ? (
                              <div className="w-3 h-3 border-[1.5px] border-green-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(
                                item.id,
                                item.metadata?.patientName ?? "study"
                              )
                            }
                            disabled={isDeleting || isResuming}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                            title="Remove from queue"
                          >
                            {isDeleting ? (
                              <div className="w-3 h-3 border-[1.5px] border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  }))
              )}
            </div>

            {/* Footer */}
            {queue.length > 0 && (
              <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Storage {Math.round(storageUsagePercent)}% used
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await OfflineSyncService.triggerSync();
                    toast.success("Sync triggered");
                    setTimeout(refreshQueue, 2000);
                  }}
                  disabled={!isOnline}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-[0.1em] transition-all",
                    isOnline
                      ? "bg-foreground text-background hover:opacity-80"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  <Play className="w-2.5 h-2.5" />
                  Sync All
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
