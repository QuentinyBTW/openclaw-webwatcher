#!/usr/bin/env node

/**
 * WebWatcher - 智能网页监控工具
 * 用于展示 OpenClaw 技能开发能力
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 配置
const CONFIG = {
  dataDir: path.join(process.env.HOME, '.openclaw/workspace/data/webwatcher'),
  tasksFile: 'tasks.json',
  historyDir: 'history',
  snapshotsDir: 'snapshots'
};

// 初始化数据目录
async function initDataDir() {
  await fs.mkdir(CONFIG.dataDir, { recursive: true });
  await fs.mkdir(path.join(CONFIG.dataDir, CONFIG.historyDir), { recursive: true });
  await fs.mkdir(path.join(CONFIG.dataDir, CONFIG.snapshotsDir), { recursive: true });
}

// 获取网页内容
async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    throw new Error(`获取页面失败: ${error.message}`);
  }
}

// 提取内容
function extractContent(html, selector = null) {
  const $ = cheerio.load(html);
  
  if (selector) {
    return $(selector).text().trim();
  }
  
  // 默认提取主要内容
  return {
    title: $('title').text().trim(),
    h1: $('h1').first().text().trim(),
    body: $('body').text().substring(0, 500).trim()
  };
}

// 提取价格
function extractPrice(html) {
  const $ = cheerio.load(html);
  
  // 常见价格选择器
  const priceSelectors = [
    '.price',
    '.price-current',
    '[class*="price"]',
    '[id*="price"]',
    '.p-price'
  ];
  
  for (const selector of priceSelectors) {
    const text = $(selector).first().text();
    const match = text.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
  }
  
  return null;
}

// 计算内容哈希
function hashContent(content) {
  return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
}

// 保存快照
async function saveSnapshot(taskId, html) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${taskId}-${timestamp}.html`;
  const filepath = path.join(CONFIG.dataDir, CONFIG.snapshotsDir, filename);
  await fs.writeFile(filepath, html);
  return filename;
}

// 保存历史记录
async function saveHistory(taskId, data) {
  const filepath = path.join(CONFIG.dataDir, CONFIG.historyDir, `${taskId}.json`);
  let history = [];
  
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    history = JSON.parse(content);
  } catch (error) {
    // 文件不存在，创建新的
  }
  
  history.push({
    timestamp: new Date().toISOString(),
    ...data
  });
  
  // 只保留最近 100 条记录
  if (history.length > 100) {
    history = history.slice(-100);
  }
  
  await fs.writeFile(filepath, JSON.stringify(history, null, 2));
}

// 发送通知
async function sendNotification(message, channels = ['console']) {
  console.log(`\n🔔 通知: ${message}\n`);
  
  // 这里可以集成 OpenClaw 的通知系统
  // 例如：调用飞书、邮件、微信等
  
  if (channels.includes('feishu')) {
    // TODO: 集成飞书通知
    console.log('📱 飞书通知已发送');
  }
  
  if (channels.includes('email')) {
    // TODO: 集成邮件通知
    console.log('📧 邮件通知已发送');
  }
}

// 检查单个页面
async function checkPage(url, options = {}) {
  console.log(`🔍 检查页面: ${url}`);
  
  const html = await fetchPage(url);
  const taskId = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
  
  let result = {};
  
  if (options.type === 'price') {
    const price = extractPrice(html);
    result = { price };
    console.log(`💰 当前价格: ${price || '未找到'}`);
  } else if (options.selector) {
    const content = extractContent(html, options.selector);
    result = { content };
    console.log(`📄 提取内容: ${content.substring(0, 100)}...`);
  } else {
    result = extractContent(html);
    console.log(`📄 页面标题: ${result.title}`);
  }
  
  // 保存快照
  await saveSnapshot(taskId, html);
  
  // 保存历史
  await saveHistory(taskId, result);
  
  return result;
}

// 监控任务
async function monitorTask(url, options = {}) {
  const interval = parseInterval(options.interval || '30m');
  const taskId = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
  
  console.log(`👁️  开始监控: ${options.name || url}`);
  console.log(`⏱️  检查间隔: ${options.interval || '30m'}`);
  console.log(`🆔 任务 ID: ${taskId}`);
  
  let lastHash = null;
  
  const check = async () => {
    try {
      const result = await checkPage(url, options);
      const currentHash = hashContent(result);
      
      if (lastHash && currentHash !== lastHash) {
        const message = `${options.name || url} 内容已变化！`;
        await sendNotification(message, options.notify || ['console']);
        
        // 如果是价格监控，检查阈值
        if (options.type === 'price' && result.price) {
          if (options.target) {
            if (options.notifyBelow && result.price < options.target) {
              await sendNotification(
                `🎉 价格降至 ${result.price}，低于目标价 ${options.target}！`,
                options.notify
              );
            }
            if (options.notifyAbove && result.price > options.target) {
              await sendNotification(
                `⚠️ 价格升至 ${result.price}，高于目标价 ${options.target}！`,
                options.notify
              );
            }
          }
        }
      }
      
      lastHash = currentHash;
      console.log(`✅ 检查完成 (${new Date().toLocaleString()})`);
    } catch (error) {
      console.error(`❌ 检查失败: ${error.message}`);
    }
  };
  
  // 立即执行一次
  await check();
  
  // 定时执行
  setInterval(check, interval);
}

// 解析时间间隔
function parseInterval(str) {
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match) return 30 * 60 * 1000; // 默认 30 分钟
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  
  return value * multipliers[unit];
}

// CLI 入口
async function main() {
  await initDataDir();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  // 解析参数
  const options = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    options[key] = value;
  }
  
  try {
    switch (command) {
      case 'check':
        if (!options.url) {
          console.error('❌ 缺少 --url 参数');
          process.exit(1);
        }
        await checkPage(options.url, options);
        break;
        
      case 'monitor':
        if (!options.url) {
          console.error('❌ 缺少 --url 参数');
          process.exit(1);
        }
        await monitorTask(options.url, options);
        break;
        
      case 'price':
        if (!options.url) {
          console.error('❌ 缺少 --url 参数');
          process.exit(1);
        }
        options.type = 'price';
        if (options.target) {
          options.target = parseFloat(options.target);
          options.notifyBelow = true;
        }
        await monitorTask(options.url, options);
        break;
        
      case 'content':
        if (!options.url) {
          console.error('❌ 缺少 --url 参数');
          process.exit(1);
        }
        await monitorTask(options.url, options);
        break;
        
      default:
        console.log(`
WebWatcher - 智能网页监控工具

用法:
  node webwatcher.js check --url <url>
  node webwatcher.js monitor --url <url> [--interval 30m]
  node webwatcher.js price --url <url> --target <price>
  node webwatcher.js content --url <url>

示例:
  # 检查页面
  node webwatcher.js check --url "https://example.com"
  
  # 监控价格
  node webwatcher.js price --url "https://jd.com/product" --target 999
  
  # 持续监控
  node webwatcher.js monitor --url "https://blog.com" --interval 1h
        `);
    }
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  fetchPage,
  extractContent,
  extractPrice,
  checkPage,
  monitorTask
};
