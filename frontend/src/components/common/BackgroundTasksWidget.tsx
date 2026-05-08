import { useState } from 'react';
import { useTasks } from '@/contexts/TaskContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, DownloadCloud, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export const BackgroundTasksWidget = () => {
  const { activeTasks } = useTasks();
  const [isOpen, setIsOpen] = useState(false);

  if (activeTasks.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'PACS_EXPORT': return <UploadCloud className="w-5 h-5 text-blue-400" />;
      case 'PACS_IMPORT': return <DownloadCloud className="w-5 h-5 text-green-400" />;
      default: return <Activity className="w-5 h-5 text-purple-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING': return <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Running</span>;
      case 'COMPLETED': return <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</span>;
      case 'FAILED': return <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default: return null;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative border-blue-500/30 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-all duration-300">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span>{activeTasks.length} {activeTasks.length === 1 ? 'Active Task' : 'Active Tasks'}</span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-slate-900 border-slate-800 shadow-xl overflow-hidden rounded-xl">
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <h4 className="font-semibold text-slate-200">Active Tasks</h4>
          <span className="text-xs text-slate-400">{activeTasks.length} running</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto w-full">
          {activeTasks.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No tasks currently running.
            </div>
          ) : (
            <ul className="flex flex-col">
              {activeTasks.map((task) => {
                const isUploadTask = task.type === 'LOCAL_UPLOAD';
                const percent = task.total > 0 ? Math.round((task.progress / task.total) * 100) : 0;
                return (
                  <li key={task.taskId} className="p-4 flex flex-col gap-2 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors last:border-0 relative">
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800/80 shrink-0">
                          {getIcon(task.type)}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-200 truncate w-36" title={task.metadata?.patientName || "Unknown Patient"}>
                            {task.metadata?.patientName || "Unknown Patient"}
                          </span>
                          <span className="text-xs text-slate-500 truncate w-36" title={task.metadata?.siteId || "System"}>
                            {task.metadata?.siteId || "System"}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center">
                        {getStatusBadge(task.status)}
                      </div>
                    </div>

                    <div className="w-full flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400 font-medium">{task.message}</span>
                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                          {task.progress} / {task.total}
                        </span>
                      </div>
                      <Progress
                        value={percent}
                        className="h-1.5 w-full bg-slate-800"
                        indicatorClassName={task.status === 'FAILED' ? 'bg-red-500' : 'bg-blue-500 transition-all duration-300 ease-in-out'}
                      />
                    </div>
                    {isUploadTask && task.status === 'RUNNING' && (
                      <p className="text-[10px] text-amber-500/80 mt-2 flex items-center gap-1 w-full justify-start absolute bottom-1 right-2 left-3 ">
                        <AlertCircle className="w-3 h-3" />
                        Keep tab open
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
