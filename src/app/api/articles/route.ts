import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { SourceType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const sourceType = searchParams.get("source") as SourceType | null;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const store = await getDataStore();

    const articles = store.getArticles({
      sourceType: sourceType || undefined,
      category,
      search,
      dateFrom,
      dateTo,
      limit,
      offset,
    });

    const total = store.getArticleCount(sourceType || undefined);
    const categories = store.getCategories(sourceType || undefined);

    return NextResponse.json({
      articles,
      total,
      categories,
      hasMore: offset + articles.length < total,
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
