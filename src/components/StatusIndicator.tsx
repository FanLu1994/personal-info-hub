"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SourceType } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

interface SourceStatus {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  itemCount: number;
}

interface StatusIndicatorProps {
  statuses: Record<SourceType, SourceStatus>;
  dataSource?: string;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "从未";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: SourceStatus): string {
  if (status.lastError && !status.lastSuccessAt) {
    return "text-[var(--color-error-text)]";
  }
  if (status.lastError) {
    return "text-amber-500";
  }
  if (status.lastSuccessAt) {
    return "text-green-500";
  }
  return "text-[var(--color-text-tertiary)]";
}

export function StatusIndicator({ statuses, dataSource }: StatusIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  const sources: SourceType[] = ["rss", "linuxdo", "hackernews", "github"];
  
  const hasErrors = sources.some(s => statuses[s]?.lastError);
  const totalItems = sources.reduce((sum, s) => sum + (statuses[s]?.itemCount || 0), 0);

  return (
    <div className="border-b border-[var(--color-border-secondary)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-3">
          {hasErrors ? (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <span className="text-xs text-[var(--color-text-secondary)]">
            {dataSource === "static-seed" ? "静态数据" : "数据状态"}
            {hasErrors && " · 部分来源异常"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {totalItems.toLocaleString()} 篇
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {sources.map(source => {
            const status = statuses[source];
            if (!status) return null;

            return (
              <div
                key={source}
                className="flex items-start gap-3 p-2 rounded-md bg-[var(--color-bg-secondary)]"
              >
                <div className={cn("mt-0.5", getStatusColor(status))}>
                  {status.lastError ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {SOURCE_LABELS[source]}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
                      {status.itemCount} 篇
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-text-tertiary)]">
                    <Clock className="h-3 w-3" />
                    <span>
                      成功：{formatTime(status.lastSuccessAt)}
                    </span>
                  </div>
                  {status.lastError && (
                    <p className="mt-1 text-xs text-[var(--color-error-text)] bg-[var(--color-error-bg)] px-2 py-1 rounded">
                      {status.lastError}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex items-start gap-2 p-2 rounded-md bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
            <Info className="h-4 w-4 text-[var(--color-warning-text)] shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--color-warning-text)]">
              所有内容均为原始抓取，直接来自公开 Feed/API，非 AI 生成摘要。
              Linux.do 受 Cloudflare 保护，可能返回 403。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
