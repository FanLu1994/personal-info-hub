const ALLOWED_HOSTS = new Set([
  // RSS feed domains (from rss-feeds.ts)
  "qwenlm.github.io",
  "wechat2rss.bestblogs.dev",
  "wechat2rss.xlab.app",
  "openai.com",
  "deepmind.google",
  "blog.google",
  "research.google",
  "huggingface.co",
  "mistral.ai",
  "blogs.nvidia.com",
  "developer.nvidia.com",
  "aws.amazon.com",
  "machinelearning.apple.com",
  "devblogs.microsoft.com",
  "www.microsoft.com",
  "www.databricks.com",
  "stability.ai",
  "ollama.com",
  "thinkingmachines.ai",
  "research.facebook.com",
  "rsshub.bestblogs.dev",
  "feeds.arstechnica.com",
  "www.theverge.com",
  "www.wired.com",
  "www.technologyreview.com",
  "www.theregister.com",
  "rss.nytimes.com",
  "feeds.bbci.co.uk",
  "techcrunch.com",
  "feeds.bloomberg.com",
  "www.ft.com",
  "feeds.content.dowjones.io",
  "www.404media.co",
  "themarkup.org",
  "www.platformer.news",
  "www.techmeme.com",
  "www.theguardian.com",
  // Chinese blogs
  "echosoar.github.io",
  "frankorz.com",
  "atjason.com",
  "blog.amamiyayuuko.com",
  "blog.codingnow.com",
  "blog.gotocoding.com",
  "blog.imzy.ink",
  "blog.k8s.li",
  "blog.mikeoperfect.com",
  "blog.mute-g.com",
  "blog.star7th.com",
  "blog.uwa4d.com",
  "blog.zhheo.com",
  "catbro666.github.io",
  "catcoding.me",
  "coolshell.cn",
  "ddadaal.me",
  "feed.cnblogs.com",
  "idealclover.top",
  "luyuhuang.tech",
  "moeyua.com",
  "markonreview.com",
  "networm.me",
  "paugram.com",
  "scottyeung.top",
  "ssshooter.com",
  "tech.kujiale.com",
  "tech.meituan.com",
  "tonybai.com",
  "tumutanzi.com",
  "tw93.fun",
  "weekly.tw93.fun",
  "www.dongwm.com",
  "www.iyouhun.com",
  "www.leavesongs.com",
  "www.liwenzhou.com",
  "www.luozhiyun.com",
  "www.maxieewong.com",
  "www.physixfan.com",
  "www.velasx.com",
  "www.xiejingyang.com",
  "www.xuanyusong.com",
  "www.zhangxinxu.com",
  "wzyboy.im",
  "z.arlmy.me",
  "diygod.cc",
  "song.al",
  "www.owenyoung.com",
  "decohack.com",
  "sugarat.top",
  "pythoncat.substack.com",
  "kill-the-newsletter.com",
  "blog.lilydjwg.me",
  "anotherdayu.com",
  "v2ex-create.nexmm.com",
  "mantyke.icu",
  "elmagnifico.tech",
  "pandaqr.github.io",
  "meowshiba.com",
  "hiwannz.com",
  "wiki.eryajf.net",
  "flandre-scarlet.moe",
  "cbvivi.today",
  "czyt.tech",
  "www.pseudoyu.com",
  "blog.sakoamc.com",
  "veryjack.com",
  "ameow.xyz",
  "justlovemaki.github.io",
  "bigeagle.me",
  "v2ex-share.nexmm.com",
  "feeds.feedburner.com",
  "onevcat.com",
  "cn.thelynan.com",
  "blog.laoda.de",
  "vrast.cn",
  "ramsayleung.github.io",
  "yuanchaofa.com",
  "aigc-weekly.agi.li",
  "colobu.com",
  // English blogs
  "krebsonsecurity.com",
  "daringfireball.net",
  "idiallo.com",
  "shkspr.mobi",
  "lcamtuf.substack.com",
  "mitchellh.com",
  "dynomight.net",

  // Linux.do
  "linux.do",

  // Hacker News
  "hacker-news.firebaseio.com",
  "news.ycombinator.com",

  // GitHub
  "github.com",
  "api.github.com",
  "raw.githubusercontent.com",
]);

export function isAllowedHost(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ALLOWED_HOSTS.has(parsedUrl.hostname);
  } catch {
    return false;
  }
}

export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { valid: false, error: "Only HTTP/HTTPS protocols allowed" };
    }

    if (!isAllowedHost(url)) {
      return { valid: false, error: `Host ${parsedUrl.hostname} not in allowed list` };
    }

    const ip = parsedUrl.hostname;
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|0\.|169\.254\.|::1|fc|fd|fe80)/.test(ip)) {
      return { valid: false, error: "Private/local IP addresses not allowed" };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Invalid URL: ${e}` };
  }
}

export async function safeFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(`SSRF protection: ${validation.error}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "InfoDigest/1.0 (Personal Information Aggregator)",
        ...options.headers,
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        const redirectValidation = validateUrl(new URL(location, url).href);
        if (!redirectValidation.valid) {
          throw new Error(`SSRF protection: Redirect to disallowed host`);
        }
        return safeFetch(new URL(location, url).href, options);
      }
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}
