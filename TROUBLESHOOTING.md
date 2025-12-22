# 故障排除指南

## 前端AI对话一直加载的问题 - 已修复 ✅

### 修复内容

1. **后端超时处理** - 添加了30秒请求超时
2. **AI服务超时** - 添加了15秒AI调用超时
3. **错误处理改进** - 更详细的错误日志和用户友好的错误消息
4. **前端错误显示** - 清晰的错误提示和解决建议

### 快速诊断步骤

#### 1. 检查后端是否运行

```bash
cd backend
npm run dev
```

你应该看到：
```
Backend running on http://localhost:3000
```

#### 2. 测试健康检查端点

```bash
curl http://localhost:3000/health
```

应该返回：
```json
{"status":"ok","timestamp":"2024-..."}
```

#### 3. 测试API端点

运行测试脚本：
```bash
cd backend
./test-api.sh
```

#### 4. 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- **Console标签** - 查看是否有JavaScript错误
- **Network标签** - 查看API请求状态
  - 如果请求显示为pending，可能是后端未运行
  - 如果返回504，可能是超时（检查AI服务）
  - 如果返回500，查看后端日志

#### 5. 检查后端日志

后端控制台应该显示：
```
[INFO] Received strategy request from 0x...: "用户输入的内容"
[DEBUG] Starting parseIntent with input: "..."
```

如果没有看到这些日志，说明请求没有到达后端。

### 常见问题

#### 问题1: 请求一直pending
**原因**: 后端服务未运行或端口不匹配

**解决**:
1. 确认后端在运行：`lsof -ti:3000` 应该返回进程ID
2. 检查前端代理配置：`frontend/vite.config.ts` 中的 `target: 'http://localhost:3000'`

#### 问题2: 504 Timeout错误
**原因**: AI服务响应时间过长（超过30秒）

**解决**:
1. 检查 `DASHSCOPE_API_KEY` 是否配置正确
2. 系统会自动使用fallback解析器，应该仍能返回结果
3. 查看后端日志了解具体原因

#### 问题3: 500 Internal Server Error
**原因**: 后端处理出错

**解决**:
1. 查看后端控制台的详细错误日志
2. 检查 `.env` 文件配置
3. 确认数据库已初始化（`database.sqlite` 文件存在）

#### 问题4: 无法连接到服务器
**原因**: 网络问题或CORS配置

**解决**:
1. 确认后端CORS配置允许前端来源
2. 检查防火墙设置
3. 确认前端代理配置正确

### 调试端点

#### 测试AI服务
```bash
curl -X POST http://localhost:3000/api/debug/test-ai \
  -H "Content-Type: application/json" \
  -d '{"input":"test"}'
```

这会测试AI服务是否正常工作，返回：
- `success: true` - AI服务正常
- `hasApiKey: true/false` - 是否配置了API密钥

### 环境变量配置

创建 `backend/.env` 文件（参考 `backend/.env.example`）：

```env
PORT=3000
DASHSCOPE_API_KEY=sk-your-key-here  # 可选，不配置会使用fallback
NODE_ENV=development
```

**注意**: 即使没有 `DASHSCOPE_API_KEY`，系统也会使用fallback解析器工作，只是功能有限。

### 验证修复

修复后，你应该看到：

1. ✅ 后端立即记录请求日志
2. ✅ 即使AI失败，也会返回fallback结果
3. ✅ 前端显示清晰的错误信息
4. ✅ 请求在30秒内完成或超时

### 下一步

如果问题仍然存在：

1. 运行 `backend/test-api.sh` 脚本查看详细测试结果
2. 检查后端日志文件：`backend/logs/app-*.log`
3. 查看浏览器Network标签中的请求详情
4. 使用调试端点测试AI服务






