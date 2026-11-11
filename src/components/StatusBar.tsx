"use client";

import { useMemo } from "react";
import { formatShanghaiTime } from "@/lib/utils";
import { SOURCE_LABELS, type SourceType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Database } from "lucide-react";

interface SourceStatus {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  itemCount: number;
}

interface StatusBarProps {
  statuses: Record<SourceType, SourceStatus>;
  dataSource?: string;
}

const SOURCE_TYPES: SourceType[] = ["rss", "linuxdo", "hackernews", "github"];

export function StatusBar({ statuses, dataSource }: StatusBarProps) {
  const sourceStatuses = useMemo(() => {
    return SOURCE_TYPES.map((source) => {
      const status = statuses[source];
      const hasError = Boolean(status.lastError && !status.lastSuccessAt);
      return { source, status, hasError };
    });
  }, [statuses]);

  const isStaticData = dataSource === "static-seed";

  return (
    <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
          {sourceStatuses.map(({ source, status, hasError }) => (
            <div
              key={source}
              className="flex items-center gap-2 text-xs whitespace-nowrap"
              title={
                status.lastError
                  ? `错误: ${status.lastError}`
                  : status.lastSuccessAt
                  ? `数据时间: ${formatShanghaiTime(status.lastSuccessAt)}`
                  : "未更新"
              }
            >
              {hasError ? (
                <AlertCircle className="h-3 w-3 text-red-500" />
              ) : status.lastSuccessAt ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <Clock className="h-3 w-3 text-neutral-400" />
              )}
              <span className="text-neutral-600">{SOURCE_LABELS[source]}</span>
              {status.lastSuccessAt && (
                <Badge
                  variant={hasError ? "error" : "success"}
                  className="text-[10px] px-1.5"
                >
                  {formatShanghaiTime(status.lastSuccessAt).split(" ")[1] || "已获取"}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {isStaticData && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-500 bg-neutral-100 rounded-md">
            <Database className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">构建时预生成数据</span>
          </div>
        )}
      </div>
    </div>
  );
}
