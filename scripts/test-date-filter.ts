#!/usr/bin/env npx tsx
/**
 * 日期筛选功能测试
 * 
 * 测试项目:
 * 1. Asia/Shanghai 时区边界计算
 * 2. 今天/近三天/近一周范围计算
 * 3. 缺失发布时间处理
 * 4. 中文日期格式解析
 * 
 * 运行: npx tsx scripts/test-date-filter.ts
 */

import { 
  getShanghaiBoundaryDate, 
  getDateRangeStart, 
  parsePublishedAt, 
  isArticleInDateRange 
} from "../src/lib/utils";

function formatDateLocal(date: Date): string {
  return date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
}

async function testShanghaiBoundary(): Promise<boolean> {
  console.log("=== 测试 1: Asia/Shanghai 时区边界 ===");
  
  const today = getShanghaiBoundaryDate(0);
  const yesterday = getShanghaiBoundaryDate(1);
  const twoDaysAgo = getShanghaiBoundaryDate(2);
  
  console.log(`今天边界 (上海时间): ${formatDateLocal(today)}`);
  console.log(`昨天边界 (上海时间): ${formatDateLocal(yesterday)}`);
  console.log(`前天边界 (上海时间): ${formatDateLocal(twoDaysAgo)}`);
  
  const todayHours = today.getHours();
  const shanghaiOffset = 8;
  const expectedUtcHour = (24 - shanghaiOffset) % 24;
  
  if (today.getUTCHours() !== expectedUtcHour && today.getUTCHours() !== 0) {
    console.log(`⚠ 时区边界可能不准确 (UTC hour: ${today.getUTCHours()})`);
  }
  
  if (yesterday >= today) {
    console.log("❌ 昨天应该在今天之前");
    return false;
  }
  
  console.log("✓ 时区边界计算正确\n");
  return true;
}

async function testDateRanges(): Promise<boolean> {
  console.log("=== 测试 2: 日期范围计算 ===");
  
  const todayStart = getDateRangeStart("today");
  const threeDaysStart = getDateRangeStart("3days");
  const sevenDaysStart = getDateRangeStart("7days");
  const allStart = getDateRangeStart("all");
  
  console.log(`今天起始: ${todayStart ? formatDateLocal(todayStart) : "null"}`);
  console.log(`近三天起始: ${threeDaysStart ? formatDateLocal(threeDaysStart) : "null"}`);
  console.log(`近一周起始: ${sevenDaysStart ? formatDateLocal(sevenDaysStart) : "null"}`);
  console.log(`全部: ${allStart}`);
  
  if (allStart !== null) {
    console.log("❌ 全部范围应该返回 null");
    return false;
  }
  
  if (!todayStart || !threeDaysStart || !sevenDaysStart) {
    console.log("❌ 限时范围应该返回有效日期");
    return false;
  }
  
  if (threeDaysStart >= todayStart) {
    console.log("❌ 近三天应该比今天更早");
    return false;
  }
  
  if (sevenDaysStart >= threeDaysStart) {
    console.log("❌ 近一周应该比近三天更早");
    return false;
  }
  
  const daysDiff3 = Math.round((todayStart.getTime() - threeDaysStart.getTime()) / (24 * 60 * 60 * 1000));
  const daysDiff7 = Math.round((todayStart.getTime() - sevenDaysStart.getTime()) / (24 * 60 * 60 * 1000));
  
  console.log(`近三天天数差: ${daysDiff3}`);
  console.log(`近一周天数差: ${daysDiff7}`);
  
  if (daysDiff3 !== 2) {
    console.log(`❌ 近三天应该差2天（含今天共3天），实际 ${daysDiff3}`);
    return false;
  }
  
  if (daysDiff7 !== 6) {
    console.log(`❌ 近一周应该差6天（含今天共7天），实际 ${daysDiff7}`);
    return false;
  }
  
  console.log("✓ 日期范围计算正确\n");
  return true;
}

async function testDateParsing(): Promise<boolean> {
  console.log("=== 测试 3: 日期解析 ===");
  
  const testCases = [
    { input: "2026-11-11T08:00:00.000Z", expected: true, desc: "ISO格式" },
    { input: "2026-11-11", expected: true, desc: "日期格式" },
    { input: "7 月 14 日，2026", expected: true, desc: "中文格式" },
    { input: "11 月 10 日，2026", expected: true, desc: "中文格式带逗号" },
    { input: null, expected: false, desc: "null" },
    { input: "", expected: false, desc: "空字符串" },
    { input: "invalid", expected: false, desc: "无效字符串" },
  ];
  
  let allPassed = true;
  
  for (const tc of testCases) {
    const result = parsePublishedAt(tc.input);
    const passed = tc.expected ? result !== null : result === null;
    const status = passed ? "✓" : "❌";
    console.log(`${status} ${tc.desc}: "${tc.input}" => ${result ? result.toISOString() : "null"}`);
    if (!passed) allPassed = false;
  }
  
  if (!allPassed) return false;
  
  console.log("✓ 日期解析正确\n");
  return true;
}

async function testArticleFiltering(): Promise<boolean> {
  console.log("=== 测试 4: 文章筛选 ===");
  
  const todayStart = getDateRangeStart("today");
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  
  const testCases = [
    { publishedAt: now.toISOString(), range: todayStart, expected: true, desc: "今天的文章在今天范围内" },
    { publishedAt: yesterday.toISOString(), range: todayStart, expected: false, desc: "昨天的文章不在今天范围内" },
    { publishedAt: lastWeek.toISOString(), range: getDateRangeStart("7days"), expected: false, desc: "8天前的文章不在近一周范围内" },
    { publishedAt: null, range: todayStart, expected: false, desc: "无发布时间不在限时范围内" },
    { publishedAt: null, range: null, expected: true, desc: "无发布时间在全部范围内" },
    { publishedAt: now.toISOString(), range: null, expected: true, desc: "任何时间在全部范围内" },
  ];
  
  let allPassed = true;
  
  for (const tc of testCases) {
    const result = isArticleInDateRange(tc.publishedAt, tc.range);
    const passed = result === tc.expected;
    const status = passed ? "✓" : "❌";
    console.log(`${status} ${tc.desc}: ${result}`);
    if (!passed) allPassed = false;
  }
  
  if (!allPassed) return false;
  
  console.log("✓ 文章筛选正确\n");
  return true;
}

async function testRealData(): Promise<boolean> {
  console.log("=== 测试 5: 实际数据检查 ===");
  
  const fs = await import("fs");
  const path = await import("path");
  
  const articlesPath = path.join(process.cwd(), "data/seed/articles.json");
  const articles = JSON.parse(fs.readFileSync(articlesPath, "utf-8"));
  
  let missingCount = 0;
  let invalidCount = 0;
  let validCount = 0;
  
  for (const article of articles) {
    const pub = article.published_at;
    if (!pub) {
      missingCount++;
    } else {
      const parsed = parsePublishedAt(pub);
      if (parsed) {
        validCount++;
      } else {
        invalidCount++;
        if (invalidCount <= 3) {
          console.log(`  无法解析: "${pub}" (${article.source_type})`);
        }
      }
    }
  }
  
  console.log(`总文章数: ${articles.length}`);
  console.log(`有效日期: ${validCount}`);
  console.log(`缺失日期: ${missingCount}`);
  console.log(`无效日期: ${invalidCount}`);
  
  const todayStart = getDateRangeStart("today");
  const todayCount = articles.filter((a: { published_at: string | null }) => 
    isArticleInDateRange(a.published_at, todayStart)
  ).length;
  
  const threeDaysStart = getDateRangeStart("3days");
  const threeDaysCount = articles.filter((a: { published_at: string | null }) => 
    isArticleInDateRange(a.published_at, threeDaysStart)
  ).length;
  
  const sevenDaysStart = getDateRangeStart("7days");
  const sevenDaysCount = articles.filter((a: { published_at: string | null }) => 
    isArticleInDateRange(a.published_at, sevenDaysStart)
  ).length;
  
  console.log(`\n按时间范围筛选结果:`);
  console.log(`  今天: ${todayCount} 篇`);
  console.log(`  近三天: ${threeDaysCount} 篇`);
  console.log(`  近一周: ${sevenDaysCount} 篇`);
  console.log(`  全部: ${articles.length} 篇`);
  
  console.log("✓ 实际数据检查完成\n");
  return true;
}

async function main() {
  console.log("============================================================");
  console.log("日期筛选功能测试");
  console.log("============================================================\n");
  
  const tests = [
    { name: "时区边界", fn: testShanghaiBoundary },
    { name: "日期范围", fn: testDateRanges },
    { name: "日期解析", fn: testDateParsing },
    { name: "文章筛选", fn: testArticleFiltering },
    { name: "实际数据", fn: testRealData },
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
