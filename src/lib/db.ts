/**
 * 数据库占位模块
 * 
 * 此模块为fetchers提供类型兼容的占位实现。
 * 生产环境使用静态JSON数据，不需要运行时数据库。
 * 
 * 自动更新脚本 (scripts/update-data.ts) 直接操作JSON文件，
 * 不通过此模块。
 */

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
  console.warn(
    "insertArticle is not available in static deployment. " +
    "Use scripts/update-data.ts for data updates."
  );
}

export function updateSourceStatus(
  _sourceType: SourceType,
  _success: boolean,
  _error?: string,
  _itemCount?: number
): void {
  console.warn(
    "updateSourceStatus is not available in static deployment. " +
    "Use scripts/update-data.ts for data updates."
  );
}
