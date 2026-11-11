import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null, showTime = false): string {
  if (!dateString) return "未知时间";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "未知时间";

    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };

    if (showTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return date.toLocaleString("zh-CN", options);
  } catch {
    return "未知时间";
  }
}

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "未知时间";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "未知时间";

    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;

    return formatDate(dateString);
  } catch {
    return "未知时间";
  }
}

export function formatShanghaiTime(dateString: string | null): string {
  if (!dateString) return "未知";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "未知";

    return date.toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "未知";
  }
}
