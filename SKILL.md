---
name: webwatcher
description: 智能网页监控与通知。监控指定网页内容变化，自动提取关键信息，支持价格、库存、文章更新等场景，多渠道通知（飞书/微信/邮件）。适用于电商价格监控、招聘信息跟踪、新闻更新提醒等。
metadata:
  openclaw:
    emoji: 👁️
    requires:
      bins: ["node"]
---

# WebWatcher - 智能网页监控技能

自动监控网页变化，智能提取关键信息，及时通知你重要更新。

## 快速开始

### 基础监控
```bash
# 监控网页并在变化时通知
node webwatcher.js monitor --url "https://example.com/product" --interval 30m

# 监控特定元素
node webwatcher.js monitor --url "https://example.com" --selector ".price" --name "商品价格"

# 一次性检查
node webwatcher.js check --url "https://example.com/jobs"
```

### 价格监控
```bash
# 监控价格变化，低于目标价时通知
node webwatcher.js price --url "https://jd.com/product/123" --target 999 --notify-below

# 监控多个商品
node webwatcher.js price --config prices.json
```

### 内容监控
```bash
# 监控博客更新
node webwatcher.js content --url "https://blog.example.com" --type article

# 监控招聘页面
node webwatcher.js content --url "https://company.com/careers" --type job
```

## 配置文件示例

### 单个监控任务 (monitor.json)
```json
{
  "url": "https://example.com/product",
  "name": "iPhone 15 Pro",
  "type": "price",
  "selector": ".price-current",
  "interval": "30m",
  "notify": {
    "channels": ["feishu", "email"],
    "threshold": 6999
  }
}
```

### 批量监控 (watchers.json)
```json
{
  "watchers": [
    {
      "name": "京东 iPhone",
      "url": "https://item.jd.com/100012345678.html",
      "type": "price",
      "target": 6999
    },
    {
      "name": "公司招聘",
      "url": "https://company.com/careers",
      "type": "content",
      "keywords": ["高级工程师", "架构师"]
    }
  ]
}
```

## 命令参考

### monitor - 持续监控
```bash
node webwatcher.js monitor [options]

选项：
  --url <url>           目标网页 URL
  --selector <css>      CSS 选择器（可选）
  --interval <time>     检查间隔（默认：30m）
  --name <name>         监控任务名称
  --notify <channels>   通知渠道（feishu,email,wechat）
```

### check - 单次检查
```bash
node webwatcher.js check --url <url> [--selector <css>]
```

### price - 价格监控
```bash
node webwatcher.js price [options]

选项：
  --url <url>           商品页面 URL
  --target <price>      目标价格
  --notify-below        低于目标价时通知
  --notify-above        高于目标价时通知
```

### list - 列出所有监控任务
```bash
node webwatcher.js list
```

### stop - 停止监控任务
```bash
node webwatcher.js stop <task-id>
node webwatcher.js stop --all
```

## 使用场景

### 1. 电商价格监控
```bash
# 监控京东商品价格
node webwatcher.js price \
  --url "https://item.jd.com/100012345678.html" \
  --target 6999 \
  --notify-below \
  --interval 1h

# 当价格低于 6999 时，自动发送飞书通知
```

### 2. 招聘信息监控
```bash
# 监控公司招聘页面
node webwatcher.js content \
  --url "https://company.com/careers" \
  --type job \
  --keywords "高级工程师,架构师" \
  --interval 6h

# 发现匹配职位时立即通知
```

### 3. 博客/新闻更新
```bash
# 监控技术博客更新
node webwatcher.js content \
  --url "https://blog.example.com" \
  --type article \
  --interval 12h

# 有新文章发布时通知
```

### 4. 库存监控
```bash
# 监控商品库存状态
node webwatcher.js monitor \
  --url "https://store.com/product" \
  --selector ".stock-status" \
  --interval 5m \
  --alert-on-change

# 库存状态变化时立即通知（抢购利器）
```

## 通知配置

### 飞书通知
在 OpenClaw 配置中设置飞书 webhook 或使用内置飞书集成。

### 邮件通知
```json
{
  "email": {
    "to": "your@email.com",
    "subject": "WebWatcher 监控通知"
  }
}
```

### 微信通知
通过 Server酱 或企业微信 webhook。

## 数据存储

监控历史保存在：
```
~/.openclaw/workspace/data/webwatcher/
  ├── tasks.json          # 监控任务列表
  ├── history/            # 变化历史
  │   ├── task-1.json
  │   └── task-2.json
  └── snapshots/          # 页面快照
      ├── task-1-20260307.html
      └── task-2-20260307.html
```

## 高级功能

### 自定义提取规则
```javascript
// custom-extractor.js
module.exports = {
  extract: (html, $) => {
    return {
      price: $('.price').text().replace(/[^0-9.]/g, ''),
      stock: $('.stock').text().includes('有货'),
      title: $('h1').text()
    };
  }
};
```

### Webhook 集成
```bash
# 变化时调用自定义 webhook
node webwatcher.js monitor \
  --url "https://example.com" \
  --webhook "https://your-api.com/notify"
```

## 注意事项

1. **频率限制**：避免过于频繁的请求，建议间隔 ≥ 5 分钟
2. **反爬虫**：某些网站有反爬虫机制，可能需要配置 User-Agent 或代理
3. **资源消耗**：监控任务过多会占用系统资源，建议合理规划
4. **法律合规**：仅用于个人合法用途，遵守网站 robots.txt

## 技术栈

- Node.js
- Cheerio (HTML 解析)
- Axios (HTTP 请求)
- Node-cron (定时任务)
- OpenClaw 通知系统

## 扩展开发

可以基于此技能扩展：
- 支持更多电商平台
- AI 智能内容分析
- 价格趋势图表
- 多人协作监控
- 移动端 App

---

**作者**：[你的名字]  
**版本**：1.0.0  
**许可**：MIT  
**支持**：[你的联系方式]
