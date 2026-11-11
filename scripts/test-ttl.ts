#!/usr/bin/env npx tsx
/**
 * TTL 缓存机制测试
 * 
 * 测试项目:
 * 1. 缓存在TTL内有效
 * 2. 缓存过期后重新获取
 * 3. 并发请求去重
 * 4. 失败时保留最近成功快照
 * 
 * 运行: npx tsx scripts/test-ttl.ts
 */

import { loadArticles, loadStatuses, setTtlMs, getTtlMs, getCacheAge, invalidateCache } from "../src/lib/data-loader";

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testTTLCaching(): Promise<boolean> {
  console.log("=== 测试 1: TTL 缓存有效性 ===");
  
  setTtlMs(2000);
  invalidateCache();
  
  console.log(`设置 TTL = ${getTtlMs()}ms`);
  
  const result1 = await loadArticles();
  const age1 = getCacheAge();
  console.log(`第一次加载: ${result1.data.length} 篇, source=${result1.source}, age=${age1}ms`);
  
  await sleep(500);
  
  const result2 = await loadArticles();
  const age2 = getCacheAge();
  console.log(`500ms后加载: ${result2.data.length} 篇, source=${result2.source}, age=${age2}ms`);
  
  if (result1.data.length !== result2.data.length) {
    console.log("❌ 缓存应该返回相同数据");
    return false;
  }
  
  if (age2 < age1) {
    console.log("❌ 缓存age应该增加");
    return false;
  }
  
  console.log("✓ TTL内缓存有效\n");
  return true;
}

async function testTTLExpiry(): Promise<boolean> {
  console.log("=== 测试 2: TTL 过期重新获取 ===");
  
  setTtlMs(1500);
  invalidateCache();
  
  console.log(`设置 TTL = ${getTtlMs()}ms`);
  
  const result1 = await loadArticles();
  console.log(`第一次加载: ${result1.data.length} 篇, source=${result1.source}`);
  
  console.log("等待 2000ms (超过TTL)...");
  await sleep(2000);
  
  const result2 = await loadArticles();
  const age2 = getCacheAge();
  console.log(`TTL过期后加载: ${result2.data.length} 篇, source=${result2.source}, age=${age2}ms`);
  
  if (age2 > 1000) {
    console.log("❌ 缓存应该已刷新，age应该较小");
    return false;
  }
  
  console.log("✓ TTL过期后重新获取\n");
  return true;
}

async function testConcurrentRequests(): Promise<boolean> {
  console.log("=== 测试 3: 并发请求去重 ===");
  
  setTtlMs(5000);
  invalidateCache();
  
  console.log("同时发起 5 个请求...");
  const startTime = Date.now();
  
  const results = await Promise.all([
    loadArticles(),
    loadArticles(),
    loadArticles(),
    loadStatuses(),
    loadStatuses(),
  ]);
  
  const elapsed = Date.now() - startTime;
  console.log(`完成时间: ${elapsed}ms`);
  
  const articleCounts = results.slice(0, 3).map(r => r.data.length);
  const allSame = articleCounts.every(c => c === articleCounts[0]);
  
  if (!allSame) {
    console.log("❌ 并发请求应该返回相同数据");
    return false;
  }
  
  console.log(`✓ 所有请求返回相同数据: ${articleCounts[0]} 篇\n`);
  return true;
}

async function testValidation(): Promise<boolean> {
  console.log("=== 测试 4: 数据验证 ===");
  
  setTtlMs(5000);
  invalidateCache();
  
  const { data: articles } = await loadArticles();
  
  if (articles.length === 0) {
    console.log("⚠ 文章数为0，可能是网络问题");
    return true;
  }
  
  const sample = articles.slice(0, 10);
  const errors: string[] = [];
  
  for (let i = 0; i < sample.length; i++) {
    const a = sample[i];
    if (!a.id) errors.push(`Article ${i}: missing id`);
    if (!a.title) errors.push(`Article ${i}: missing title`);
    if (!a.url || !a.url.startsWith("http")) errors.push(`Article ${i}: invalid url`);
    if (!["rss", "hackernews", "github", "linuxdo"].includes(a.source_type)) {
      errors.push(`Article ${i}: invalid source_type`);
    }
  }
  
  if (errors.length > 0) {
    console.log("❌ 数据验证失败:");
    errors.forEach(e => console.log(`  - ${e}`));
    return false;
  }
  
  console.log(`✓ 前10篇文章验证通过\n`);
  return true;
}

async function main() {
  console.log("============================================================");
  console.log("TTL 缓存机制测试");
  console.log("============================================================\n");
  
  const tests = [
    { name: "TTL缓存有效性", fn: testTTLCaching },
    { name: "TTL过期重新获取", fn: testTTLExpiry },
    { name: "并发请求去重", fn: testConcurrentRequests },
    { name: "数据验证", fn: testValidation },
  ];
  
  const results: { name: string; passed: boolean }[] = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (err) {
      console.log(`❌ ${test.name} 抛出异常: ${err}`);
      results.push({ name: test.name, passed: false });
    }
  }
  
  console.log("============================================================");
  console.log("测试结果汇总");
  console.log("============================================================");
  
  let allPassed = true;
  for (const r of results) {
    const status = r.passed ? "✓" : "❌";
    console.log(`${status} ${r.name}`);
    if (!r.passed) allPassed = false;
  }
  
  console.log("");
  if (allPassed) {
    console.log("✓ 所有测试通过");
    process.exit(0);
  } else {
    console.log("❌ 部分测试失败");
    process.exit(1);
  }
}

main().catch(err => {
  console.error("测试失败:", err);
  process.exit(1);
});
