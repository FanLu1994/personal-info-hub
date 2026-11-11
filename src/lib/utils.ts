import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 解析发布时间字符串
 * 处理 ISO 格式和中文格式 (如 '7 月 14 日，2026')
 * 返回 Date 对象或 null
 */
export function parsePublishedAt(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  const chineseMatch = dateStr.match(/(\d+)\s*月\s*(\d+)\s*日[，,]?\s*(\d{4})/);
  if (chineseMatch) {
    const [, month, day, year] = chineseMatch;
    const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  return null;
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "发布时间未知";
  
  const date = parsePublishedAt(dateStr);
  if (!date) return "发布时间未知";
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} 周前`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} 个月前`;
  return `${Math.floor(diffDay / 365)} 年前`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "未知";
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "未知";
  
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "未知";
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "未知";
  
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

export function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function generateId(prefix: string, content: string): string {
  const hash = content
    .split("")
    .reduce((acc, char) => {
      const chr = char.charCodeAt(0);
      acc = ((acc << 5) - acc) + chr;
      return acc & acc;
    }, 0);
  return `${prefix}-${Math.abs(hash).toString(36)}`;
}

export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: Parameters<T>) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 获取 Asia/Shanghai 时区的当天开始时间 (00:00:00)
 */
export function getShanghaiBoundaryDate(daysAgo: number = 0): Date {
  const now = new Date();
  const shanghaiFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const shanghaiDateStr = shanghaiFormatter.format(now);
  const [year, month, day] = shanghaiDateStr.split("-").map(Number);
  
  const shanghaiMidnight = new Date(Date.UTC(year, month - 1, day - daysAgo, -8, 0, 0, 0));
  
  return shanghaiMidnight;
}

/**
 * 根据日期范围类型获取起始日期
 * 返回 Asia/Shanghai 时区的自然日边界
 * 
 * - today: 今天 00:00 (上海时间) 至今
 * - 3days: 2天前 00:00 (上海时间) 至今 (含今天共3天)
 * - 7days: 6天前 00:00 (上海时间) 至今 (含今天共7天)
 * - all: null (不限)
 */
export function getDateRangeStart(range: "all" | "today" | "3days" | "7days"): Date | null {
  switch (range) {
    case "today":
      return getShanghaiBoundaryDate(0);
    case "3days":
      return getShanghaiBoundaryDate(2);
    case "7days":
      return getShanghaiBoundaryDate(6);
    case "all":
    default:
      return null;
  }
}

/**
 * 检查文章发布时间是否在指定日期范围内
 * - 如果 rangeStart 为 null，返回 true (全部)
 * - 如果文章无有效发布时间，返回 false (限时范围不含)
 */
export function isArticleInDateRange(
  publishedAt: string | null | undefined,
  rangeStart: Date | null
): boolean {
  if (!rangeStart) return true;
  
  const pubDate = parsePublishedAt(publishedAt);
  if (!pubDate) return false;
  
  return pubDate >= rangeStart;
}
