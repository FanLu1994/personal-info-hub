export interface RssFeed {
  url: string;
  category: string;
  name?: string;
}

export const RSS_FEEDS: RssFeed[] = [
  // ========== 国内模型厂商 ==========
  { url: "https://qwenlm.github.io/blog/index.xml", category: "国内模型厂商", name: "通义千问" },
  { url: "https://wechat2rss.bestblogs.dev/feed/1709da4f538d4ce4fb6d7a8ba1a5a1c297919601.xml", category: "国内模型厂商", name: "DeepSeek" },
  { url: "https://wechat2rss.bestblogs.dev/feed/433d2134dca54d80804daf32e8be546155be3300.xml", category: "国内模型厂商", name: "智谱" },
  { url: "https://wechat2rss.bestblogs.dev/feed/c5c43d4bc17bae656763859ed0903bb6314ec6fe.xml", category: "国内模型厂商", name: "Kimi" },
  { url: "https://wechat2rss.bestblogs.dev/feed/00306b171f754d463b28cf83f3ba086ad009b430.xml", category: "国内模型厂商", name: "MiniMax" },
  { url: "https://wechat2rss.bestblogs.dev/feed/4ebee6222ae08705b8aabc9116f0defbcb6b17c6.xml", category: "国内模型厂商", name: "通义实验室" },
  { url: "https://wechat2rss.bestblogs.dev/feed/d0767d885e6ba213344fb0c0408c51331e23a994.xml", category: "国内模型厂商", name: "百度文心" },
  { url: "https://wechat2rss.bestblogs.dev/feed/306ce19a1ca590c9c2df781789e828d1acfa1356.xml", category: "国内模型厂商", name: "腾讯混元" },
  { url: "https://wechat2rss.bestblogs.dev/feed/3e2714d06aa36142e8ed6b3f4e5cf9090a069dd2.xml", category: "国内模型厂商", name: "阶跃星辰" },
  { url: "https://wechat2rss.bestblogs.dev/feed/6efd40bb335d2037f365d284cb5e00f0843e737e.xml", category: "国内模型厂商", name: "字节 Seed" },
  { url: "https://wechat2rss.bestblogs.dev/feed/d993a885260f96057b9a4c96212cb2c95bb5054b.xml", category: "国内模型厂商", name: "魔搭" },

  // ========== 国外模型厂商 ==========
  { url: "https://openai.com/news/rss.xml", category: "国外模型厂商", name: "OpenAI" },
  { url: "https://deepmind.google/blog/rss.xml", category: "国外模型厂商", name: "DeepMind" },
  { url: "https://blog.google/rss/", category: "国外模型厂商", name: "Google Blog" },
  { url: "https://blog.google/technology/ai/rss/", category: "国外模型厂商", name: "Google AI" },
  { url: "https://research.google/blog/rss/", category: "国外模型厂商", name: "Google Research" },
  { url: "https://huggingface.co/blog/feed.xml", category: "国外模型厂商", name: "Hugging Face" },
  { url: "https://mistral.ai/news/rss", category: "国外模型厂商", name: "Mistral" },
  { url: "https://blogs.nvidia.com/feed/", category: "国外模型厂商", name: "NVIDIA Blog" },
  { url: "https://developer.nvidia.com/blog/feed", category: "国外模型厂商", name: "NVIDIA Dev" },
  { url: "https://aws.amazon.com/blogs/machine-learning/feed/", category: "国外模型厂商", name: "AWS ML" },
  { url: "https://machinelearning.apple.com/rss.xml", category: "国外模型厂商", name: "Apple ML" },
  { url: "https://devblogs.microsoft.com/foundry/feed/", category: "国外模型厂商", name: "MS Foundry" },
  { url: "https://www.microsoft.com/en-us/research/blog/feed/", category: "国外模型厂商", name: "MS Research" },
  { url: "https://www.databricks.com/feed", category: "国外模型厂商", name: "Databricks" },
  { url: "https://stability.ai/news-updates?format=rss", category: "国外模型厂商", name: "Stability AI" },
  { url: "https://ollama.com/blog/rss.xml", category: "国外模型厂商", name: "Ollama" },
  { url: "https://thinkingmachines.ai/blog/index.xml", category: "国外模型厂商", name: "Thinking Machines" },
  { url: "https://research.facebook.com/feed/", category: "国外模型厂商", name: "Meta Research" },
  { url: "https://rsshub.bestblogs.dev/anthropic/news", category: "国外模型厂商", name: "Anthropic" },

  // ========== 海外科技媒体 ==========
  { url: "https://feeds.arstechnica.com/arstechnica/index", category: "海外科技媒体", name: "Ars Technica" },
  { url: "https://www.theverge.com/rss/index.xml", category: "海外科技媒体", name: "The Verge" },
  { url: "https://www.wired.com/feed/rss", category: "海外科技媒体", name: "WIRED" },
  { url: "https://www.technologyreview.com/feed/", category: "海外科技媒体", name: "MIT Tech Review" },
  { url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/", category: "海外科技媒体", name: "MIT Tech Review AI" },
  { url: "https://www.theregister.com/headlines.atom", category: "海外科技媒体", name: "The Register" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", category: "海外科技媒体", name: "NYTimes Tech" },
  { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "海外科技媒体", name: "BBC Tech" },
  { url: "https://techcrunch.com/feed/", category: "海外科技媒体", name: "TechCrunch" },
  { url: "https://feeds.bloomberg.com/technology/news.rss", category: "海外科技媒体", name: "Bloomberg Tech" },
  { url: "https://www.ft.com/technology?format=rss", category: "海外科技媒体", name: "FT Tech" },
  { url: "https://feeds.content.dowjones.io/public/rss/RSSWSJD", category: "海外科技媒体", name: "WSJ Tech" },
  { url: "https://www.404media.co/rss/", category: "海外科技媒体", name: "404 Media" },
  { url: "https://themarkup.org/feeds/rss.xml", category: "海外科技媒体", name: "The Markup" },
  { url: "https://www.platformer.news/rss/", category: "海外科技媒体", name: "Platformer" },
  { url: "https://www.techmeme.com/feed.xml", category: "海外科技媒体", name: "Techmeme" },
  { url: "https://www.theguardian.com/technology/rss", category: "海外科技媒体", name: "Guardian Tech" },

  // ========== 中文技术博客 ==========
  { url: "https://echosoar.github.io/weekly/atom.xml", category: "中文技术博客" },
  { url: "http://frankorz.com/atom.xml", category: "中文技术博客" },
  { url: "https://atjason.com/atom.xml", category: "中文技术博客" },
  { url: "https://blog.amamiyayuuko.com/index.xml", category: "中文技术博客" },
  { url: "https://blog.codingnow.com/atom.xml", category: "中文技术博客", name: "云风" },
  { url: "https://blog.gotocoding.com/feed", category: "中文技术博客" },
  { url: "https://blog.imzy.ink/feed/", category: "中文技术博客" },
  { url: "https://blog.k8s.li/atom.xml", category: "中文技术博客" },
  { url: "https://blog.mikeoperfect.com/atom.xml", category: "中文技术博客" },
  { url: "https://blog.mute-g.com/index.xml", category: "中文技术博客" },
  { url: "https://blog.star7th.com/feed", category: "中文技术博客" },
  { url: "https://blog.uwa4d.com/feed/", category: "中文技术博客", name: "UWA" },
  { url: "https://blog.zhheo.com/rss.xml", category: "中文技术博客" },
  { url: "https://catbro666.github.io/atom.xml", category: "中文技术博客" },
  { url: "https://catcoding.me/atom.xml", category: "中文技术博客" },
  { url: "https://coolshell.cn/feed", category: "中文技术博客", name: "酷壳" },
  { url: "https://ddadaal.me/rss.xml", category: "中文技术博客" },
  { url: "https://feed.cnblogs.com/blog/u/567504/rss/", category: "中文技术博客" },
  { url: "https://feed.cnblogs.com/blog/u/91739/rss/", category: "中文技术博客" },
  { url: "https://idealclover.top/feed/category/blog/", category: "中文技术博客" },
  { url: "https://luyuhuang.tech/feed.xml", category: "中文技术博客" },
  { url: "https://moeyua.com/atom.xml", category: "中文技术博客" },
  { url: "https://markonreview.com/rss/", category: "中文技术博客" },
  { url: "https://networm.me/tags/unity/index.xml", category: "中文技术博客" },
  { url: "https://paugram.com/feed/", category: "中文技术博客" },
  { url: "https://scottyeung.top/atom.xml", category: "中文技术博客" },
  { url: "https://ssshooter.com/rss.xml", category: "中文技术博客" },
  { url: "https://tech.kujiale.com/rss/", category: "中文技术博客", name: "酷家乐" },
  { url: "https://tech.meituan.com/feed/", category: "中文技术博客", name: "美团技术" },
  { url: "https://tonybai.com/feed/", category: "中文技术博客", name: "Tony Bai" },
  { url: "https://tumutanzi.com/feed", category: "中文技术博客" },
  { url: "https://tw93.fun/feed.xml", category: "中文技术博客", name: "Tw93" },
  { url: "https://wechat2rss.xlab.app/feed/18cb4f6ce17f4be6e5062dfb47a6036fe9c36a25.xml", category: "中文技术博客" },
  { url: "https://weekly.tw93.fun/rss.xml", category: "中文技术博客", name: "潮流周刊" },
  { url: "https://www.dongwm.com/atom.xml", category: "中文技术博客" },
  { url: "https://www.iyouhun.com/rss.php", category: "中文技术博客" },
  { url: "https://www.leavesongs.com/feed/", category: "中文技术博客", name: "离别歌" },
  { url: "https://www.liwenzhou.com/index.xml", category: "中文技术博客" },
  { url: "https://www.luozhiyun.com/feed", category: "中文技术博客" },
  { url: "https://www.maxieewong.com/atom.xml", category: "中文技术博客" },
  { url: "https://www.physixfan.com/feed/", category: "中文技术博客" },
  { url: "https://www.velasx.com/feed", category: "中文技术博客" },
  { url: "https://www.xiejingyang.com/feed/", category: "中文技术博客" },
  { url: "https://www.xuanyusong.com/feed", category: "中文技术博客" },
  { url: "https://www.zhangxinxu.com/wordpress/feed/", category: "中文技术博客", name: "张鑫旭" },
  { url: "https://wzyboy.im/feed.xml", category: "中文技术博客" },
  { url: "https://z.arlmy.me/atom.xml", category: "中文技术博客" },
  { url: "https://diygod.cc/feed", category: "中文技术博客", name: "DIYgod" },
  { url: "https://song.al/feed.xml", category: "中文技术博客" },
  { url: "https://www.owenyoung.com/atom.xml", category: "中文技术博客", name: "Owen Young" },
  { url: "https://decohack.com/feed/", category: "中文技术博客" },
  { url: "https://sugarat.top/weekly.rss", category: "中文技术博客", name: "粥里有勺糖" },
  { url: "https://pythoncat.substack.com/feed", category: "中文技术博客", name: "Python猫" },
  { url: "https://kill-the-newsletter.com/feeds/xcn3ldknjdme7yv7.xml", category: "中文技术博客" },
  { url: "https://blog.lilydjwg.me/feed?code=c6f56c4214621ab98b86acbcae6b4405", category: "中文技术博客" },
  { url: "https://anotherdayu.com/feed/", category: "中文技术博客" },
  { url: "https://v2ex-create.nexmm.com/rss.xml", category: "中文技术博客", name: "V2EX Create" },
  { url: "https://mantyke.icu/weekly/index.xml", category: "中文技术博客" },
  { url: "https://elmagnifico.tech/feed.xml", category: "中文技术博客" },
  { url: "http://pandaqr.github.io/feed.xml", category: "中文技术博客" },
  { url: "https://meowshiba.com/feed", category: "中文技术博客" },
  { url: "https://hiwannz.com/feed", category: "中文技术博客" },
  { url: "https://wiki.eryajf.net/rss.xml", category: "中文技术博客", name: "二丫讲梵" },
  { url: "https://flandre-scarlet.moe/blog/feed/", category: "中文技术博客" },
  { url: "https://cbvivi.today/feed.xml", category: "中文技术博客" },
  { url: "https://czyt.tech/index.xml", category: "中文技术博客" },
  { url: "https://www.pseudoyu.com/feed.xml", category: "中文技术博客", name: "pseudoyu" },
  { url: "https://blog.sakoamc.com/atom.xml", category: "中文技术博客" },
  { url: "https://veryjack.com/feed/", category: "中文技术博客" },
  { url: "https://ameow.xyz/feed/categories/weekly.xml", category: "中文技术博客" },
  { url: "https://justlovemaki.github.io/CloudFlare-AI-Insight-Daily/rss.xml", category: "中文技术博客" },
  { url: "https://bigeagle.me/index.xml", category: "中文技术博客" },
  { url: "https://v2ex-share.nexmm.com/rss.xml", category: "中文技术博客", name: "V2EX Share" },
  { url: "https://feeds.feedburner.com/ruanyifeng", category: "中文技术博客", name: "阮一峰" },
  { url: "https://onevcat.com/feed.xml", category: "中文技术博客", name: "OneV's Den" },
  { url: "https://cn.thelynan.com/feed.xml", category: "中文技术博客" },
  { url: "https://blog.laoda.de/rss.xml", category: "中文技术博客" },
  { url: "https://vrast.cn/atom.xml", category: "中文技术博客" },
  { url: "https://wechat2rss.bestblogs.dev/feed/ff621c3e98d6ae6fceb3397e57441ffc6ea3c17f.xml", category: "中文技术博客" },
  { url: "https://wechat2rss.bestblogs.dev/feed/484d4199ae6c0b72ea01e7e0597a1f74933dfb62.xml", category: "中文技术博客" },
  { url: "https://ramsayleung.github.io/zh/index.xml", category: "中文技术博客" },
  { url: "https://yuanchaofa.com/rss.xml", category: "中文技术博客" },
  { url: "https://aigc-weekly.agi.li/rss.xml", category: "中文技术博客", name: "AIGC周刊" },
  { url: "https://colobu.com/atom.xml", category: "中文技术博客", name: "鸟窝" },

  // ========== 英文技术博客 ==========
  { url: "https://krebsonsecurity.com/feed/", category: "英文技术博客", name: "Krebs Security" },
  { url: "https://daringfireball.net/feeds/main", category: "英文技术博客", name: "Daring Fireball" },
  { url: "https://idiallo.com/feed.rss", category: "英文技术博客" },
  { url: "https://shkspr.mobi/blog/feed/", category: "英文技术博客" },
  { url: "https://lcamtuf.substack.com/feed", category: "英文技术博客", name: "lcamtuf" },
  { url: "https://mitchellh.com/feed.xml", category: "英文技术博客", name: "Mitchell Hashimoto" },
  { url: "https://dynomight.net/feed.xml", category: "英文技术博客", name: "Dynomight" },
];

export const ALLOWED_RSS_DOMAINS = new Set(
  RSS_FEEDS.map((feed) => {
    try {
      return new URL(feed.url).hostname;
    } catch {
      return null;
    }
  }).filter(Boolean) as string[]
);

export function isAllowedRssUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_RSS_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}
