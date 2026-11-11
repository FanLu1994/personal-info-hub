import type { SourceType } from "./types";

export interface ArticleInput {
  id: string;
  source_type: SourceType;
  source_name: string;
  category: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  url: string;
  author: string | null;
  published_at: string | null;
  raw_data: string | null;
  is_raw_headline: number;
}

export function insertArticle(_article: ArticleInput): void {
  throw new Error(
    "insertArticle is not available in static deployment. " +
    "Data is pre-generated at build time."
  );
}

export function updateSourceStatus(
  _sourceType: SourceType,
  _success: boolean,
  _error?: string,
  _itemCount?: number
): void {
  throw new Error(
    "updateSourceStatus is not available in static deployment. " +
    "Data is pre-generated at build time."
  );
}
