import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { SourceType } from "@/lib/types";
import { getTtlMs } from "@/lib/data-loader";

const SOURCE_TYPES: SourceType[] = ["rss", "linuxdo", "hackernews", "github"];

export async function GET() {
  try {
    const store = await getDataStore();
    const statuses = store.getSourceStatuses();

    const statusMap: Record<
      SourceType,
      {
        lastSuccessAt: string | null;
        lastAttemptAt: string | null;
        lastError: string | null;
        itemCount: number;
      }
    > = {
      rss: { lastSuccessAt: null, lastAttemptAt: null, lastError: null, itemCount: 0 },
      linuxdo: { lastSuccessAt: null, lastAttemptAt: null, lastError: null, itemCount: 0 },
      hackernews: { lastSuccessAt: null, lastAttemptAt: null, lastError: null, itemCount: 0 },
      github: { lastSuccessAt: null, lastAttemptAt: null, lastError: null, itemCount: 0 },
    };

    for (const status of statuses) {
      statusMap[status.source_type] = {
        lastSuccessAt: status.last_success_at,
        lastAttemptAt: status.last_attempt_at,
        lastError: status.last_error,
        itemCount: status.item_count,
      };
    }

    const counts: Record<SourceType, number> = {
      rss: 0,
      linuxdo: 0,
      hackernews: 0,
      github: 0,
    };

    for (const source of SOURCE_TYPES) {
      counts[source] = store.getArticleCount(source);
    }

    return NextResponse.json({
      statuses: statusMap,
      counts,
      totalCount: Object.values(counts).reduce((a, b) => a + b, 0),
      dataSource: store.getDataSource(),
      note: `数据自动从 GitHub main 分支获取，缓存 ${Math.round(getTtlMs() / 1000)} 秒。Actions 定时更新数据，无需重新部署。`,
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
