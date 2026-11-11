import { fetchRssFeeds } from "./rss";
import { fetchLinuxdoTopics } from "./linuxdo";
import { fetchHackerNews } from "./hackernews";
import { fetchGitHubTrending } from "./github";
import type { SourceType, FetchResult } from "../types";

export async function fetchSource(sourceType: SourceType): Promise<FetchResult> {
  switch (sourceType) {
    case "rss":
      return fetchRssFeeds();
    case "linuxdo":
      return fetchLinuxdoTopics();
    case "hackernews":
      return fetchHackerNews();
    case "github":
      return fetchGitHubTrending();
    default:
      return { success: false, itemsAdded: 0, error: `Unknown source: ${sourceType}` };
  }
}

export async function fetchAllSources(): Promise<Record<SourceType, FetchResult>> {
  const [rss, linuxdo, hackernews, github] = await Promise.all([
    fetchRssFeeds(),
    fetchLinuxdoTopics(),
    fetchHackerNews(),
    fetchGitHubTrending(),
  ]);

  return { rss, linuxdo, hackernews, github };
}

export { fetchRssFeeds, fetchLinuxdoTopics, fetchHackerNews, fetchGitHubTrending };
