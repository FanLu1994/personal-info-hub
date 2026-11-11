import { insertArticle, updateSourceStatus } from "../db";
import type { FetchResult } from "../types";
import { safeFetch } from "./allowed-hosts";
import crypto from "crypto";

const GITHUB_TRENDING_URL = "https://github.com/trending?since=daily";

interface TrendingRepo {
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string | null;
  stars: number;
  starsToday: number;
  forks: number;
}

function generateId(repoName: string): string {
  const today = new Date().toISOString().split("T")[0];
  return crypto.createHash("md5").update(`github:${repoName}:${today}`).digest("hex");
}

function parseNumber(text: string): number {
  const cleaned = text.replace(/,/g, "").replace(/\s+/g, "").trim();
  if (cleaned.includes("k")) {
    return Math.round(parseFloat(cleaned.replace("k", "")) * 1000);
  }
  return parseInt(cleaned, 10) || 0;
}

function extractText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

async function parseTrendingPage(html: string): Promise<TrendingRepo[]> {
  const repos: TrendingRepo[] = [];

  const articleRegex = /<article class="Box-row">([\s\S]*?)<\/article>/gi;
  let match;

  while ((match = articleRegex.exec(html)) !== null) {
    const articleHtml = match[1];

    const repoLinkMatch = articleHtml.match(/href="\/([^"]+)"[^>]*class="[^"]*Link[^"]*"[^>]*>/);
    if (!repoLinkMatch) continue;

    const fullName = repoLinkMatch[1].trim();
    if (!fullName.includes("/")) continue;

    const descMatch = articleHtml.match(/<p class="[^"]*color-fg-muted[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    const description = descMatch ? extractText(descMatch[1]) : "";

    const langMatch = articleHtml.match(/<span itemprop="programmingLanguage">([^<]+)<\/span>/);
    const language = langMatch ? langMatch[1].trim() : null;

    const starsMatch = articleHtml.match(/href="\/[^"]+\/stargazers"[^>]*>[^<]*<[^>]*>[^<]*<\/[^>]*>\s*([\d,]+)/);
    const stars = starsMatch ? parseNumber(starsMatch[1]) : 0;

    const forksMatch = articleHtml.match(/href="\/[^"]+\/forks"[^>]*>[^<]*<[^>]*>[^<]*<\/[^>]*>\s*([\d,]+)/);
    const forks = forksMatch ? parseNumber(forksMatch[1]) : 0;

    const todayMatch = articleHtml.match(/([\d,]+)\s*stars?\s*today/i);
    const starsToday = todayMatch ? parseNumber(todayMatch[1]) : 0;

    repos.push({
      name: fullName.split("/")[1] || fullName,
      fullName,
      url: `https://github.com/${fullName}`,
      description,
      language,
      stars,
      starsToday,
      forks,
    });
  }

  return repos;
}

export async function fetchGitHubTrending(): Promise<FetchResult> {
  let itemsAdded = 0;

  try {
    const response = await safeFetch(GITHUB_TRENDING_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      const error = `HTTP ${response.status}`;
      updateSourceStatus("github", false, error);
      return { success: false, itemsAdded: 0, error };
    }

    const html = await response.text();
    const repos = await parseTrendingPage(html);

    if (repos.length === 0) {
      const error = "No repositories parsed from trending page";
      updateSourceStatus("github", false, error);
      return { success: false, itemsAdded: 0, error };
    }

    for (const repo of repos) {
      let summary = repo.description;
      const meta: string[] = [];

      if (repo.language) meta.push(repo.language);
      if (repo.stars) meta.push(`⭐ ${repo.stars.toLocaleString()}`);
      if (repo.starsToday) meta.push(`📈 +${repo.starsToday} today`);
      if (repo.forks) meta.push(`🍴 ${repo.forks.toLocaleString()}`);

      if (meta.length > 0) {
        summary = `[${meta.join(" · ")}] ${summary}`;
      }

      const article = {
        id: generateId(repo.fullName),
        source_type: "github" as const,
        source_name: "GitHub Trending",
        category: "今日热门",
        title: repo.fullName,
        summary: summary.slice(0, 500) || null,
        content: null,
        url: repo.url,
        author: repo.fullName.split("/")[0] || null,
        published_at: new Date().toISOString(),
        raw_data: JSON.stringify(repo),
        is_raw_headline: 1,
      };

      insertArticle(article);
      itemsAdded++;
    }

    updateSourceStatus("github", true, undefined, itemsAdded);
    return { success: true, itemsAdded };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    updateSourceStatus("github", false, error);
    return { success: false, itemsAdded: 0, error };
  }
}
