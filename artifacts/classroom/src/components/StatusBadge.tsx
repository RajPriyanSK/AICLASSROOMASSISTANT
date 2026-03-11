import { LectureStatus, TaskStatus } from "@workspace/api-client-react";
import { Loader2, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

type StatusType = LectureStatus | TaskStatus | "completed";

export function StatusBadge({ status }: { status: StatusType | string }) {
  const configs: Record<string, { color: string, icon: React.ReactNode, label: string }> = {
    pending: { color: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="w-3 h-3" />, label: "Pending" },
    processing: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Loader2 className="w-3 h-3 animate-spin" />, label: "Processing" },
    done: { color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" />, label: "Done" },
    error: { color: "bg-red-100 text-red-800 border-red-200", icon: <AlertCircle className="w-3 h-3" />, label: "Error" },
    approved: { color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" />, label: "Approved" },
    rejected: { color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="w-3 h-3" />, label: "Rejected" },
    completed: { color: "bg-gray-100 text-gray-700 border-gray-200", icon: <CheckCircle2 className="w-3 h-3" />, label: "Completed" },
  };

  const config = configs[status as string] || { color: "bg-gray-100 text-gray-800", icon: null, label: status };

  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", config.color)}>
      {config.icon}
      <span className="capitalize">{config.label}</span>
    </span>
  );
}
