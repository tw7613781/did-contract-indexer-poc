# 快速开始指南

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

复制配置示例并修改：

```bash
cp config.example.env .env
```

编辑 `.env` 文件，填入你的配置：

```env
RPC_URL=https://your-rpc-endpoint.com
CONTRACT_ADDRESS=0xYourContractAddress
BATCH_SIZE=500
CONCURRENCY=5
RETRY_ATTEMPTS=3
OUTPUT_FILE=domains.json
```

## 3. 运行 Indexer

```bash
npm run index
```

## 4. 查看结果

索引完成后，查看输出文件：

```bash
cat domains.json
```

## 预期性能

- **4000 个 domains**：约 10-15 秒
- **RPC 调用次数**：约 25 次（相比原始方案的 12000 次）
- **优化率**：99.8%

## 调优建议

### 如果遇到 RPC 限流：
```env
BATCH_SIZE=250  # 减小批次大小
CONCURRENCY=2   # 减少并发数
```

### 如果想要更快速度：
```env
BATCH_SIZE=1000  # 增大批次大小
CONCURRENCY=10   # 增加并发数
```

### 如果网络不稳定：
```env
RETRY_ATTEMPTS=5  # 增加重试次数
```

## 输出数据结构

```json
{
  "timestamp": "2025-11-04T...",
  "statistics": {
    "total": 4000,
    "topLevel": 3500,
    "subdomains": 500,
    "withDID": 3800,
    "allowingSubdomains": 2000
  },
  "duration": 12.34,
  "domains": [
    {
      "id": "123",
      "name": "example.com",
      "did": "did:...",
      "note": "...",
      "allowSubdomain": true,
      "owner": "0x...",
      "subdomains": ["sub.example.com"]
    }
  ]
}
```

## 疑难解答

### 问题：连接超时
**解决**：检查 RPC_URL 是否正确，网络是否畅通

### 问题：内存不足
**解决**：减小 BATCH_SIZE，或分批处理

### 问题：数据不完整
**解决**：增加 RETRY_ATTEMPTS，检查合约地址是否正确

## 开发模式

如果需要修改代码并测试：

```bash
# 方式 1：直接运行 TypeScript
npm run index

# 方式 2：编译后运行
npm run build
node dist/indexer.js
```

## 下一步

- 查看 `README.md` 了解详细文档
- 修改 `src/DIDIndexer.ts` 自定义索引逻辑
- 修改 `src/indexer.ts` 自定义输出格式

