# 前端网络问题诊断指南

## 问题现象
从前端访问后端API一直加载，没有反应。

## 快速诊断步骤

### 1. 检查浏览器控制台
打开浏览器开发者工具（F12），查看：
- **Console标签**：查看JavaScript错误
- **Network标签**：查看API请求状态
  - 请求是否发送？
  - 请求状态码是什么？（200/404/500/504/timeout）
  - 请求URL是否正确？

### 2. 检查后端是否收到请求
```bash
cd backend
tail -f logs/app-*.log | grep -E "Received|POST|error"
```
如果后端没有日志，说明请求没有到达后端。

### 3. 测试前端代理
在浏览器中直接访问：
- `http://localhost:8080/api/health` - 应该返回 `{"status":"ok",...}`
- `http://localhost:8080/api/protocols` - 应该返回协议列表

如果这些都无法访问，说明前端代理有问题。

### 4. 检查浏览器代理设置
- Chrome/Edge: 设置 → 系统 → 打开计算机的代理设置
- 确保 `localhost` 和 `127.0.0.1` 不在代理列表中
- 或者配置代理绕过本地地址

### 5. 常见问题

#### 问题1: 请求一直pending
**原因**: 
- 后端服务未运行
- 前端代理配置错误
- 浏览器代理阻塞

**解决**:
1. 确认后端运行：`curl http://localhost:3000/health`
2. 检查前端vite.config.ts中的proxy配置
3. 检查浏览器代理设置

#### 问题2: CORS错误
**原因**: 跨域请求被阻止

**解决**: 后端已配置 `app.use(cors())`，应该不会有CORS问题

#### 问题3: 504 Gateway Timeout
**原因**: 后端处理超时（AI服务响应慢）

**解决**: 
- 检查后端日志
- AI服务可能超时，会使用fallback

#### 问题4: 网络错误
**原因**: 无法连接到服务器

**解决**:
- 检查后端是否运行
- 检查防火墙设置
- 检查端口是否被占用

## 测试命令

### 测试后端直接访问
```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/chat/strategy \
  -H "Content-Type: application/json" \
  -d '{"input":"test","address":"0x123"}'
```

### 测试前端代理
```bash
# 需要先启动前端服务
curl http://localhost:8080/api/health
```

## 调试技巧

1. **查看浏览器Network标签**：
   - 找到 `/api/chat/strategy` 请求
   - 查看Request Headers和Response
   - 查看Timing信息

2. **查看后端日志**：
   ```bash
   tail -f backend/logs/app-*.log
   ```

3. **前端添加详细日志**：
   在浏览器Console中查看：
   - `[API]` 开头的日志（如果配置了拦截器）
   - 错误堆栈信息

## 如果问题仍然存在

请提供以下信息：
1. 浏览器控制台的完整错误信息
2. Network标签中请求的详细信息（Headers, Response, Timing）
3. 后端日志中的相关错误
4. 浏览器类型和版本




