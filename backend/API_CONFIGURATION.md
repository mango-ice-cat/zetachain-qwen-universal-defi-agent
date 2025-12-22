# DashScope API 配置说明

## API 端点配置

系统现在默认使用**国际版端点**，配置如下：

### 默认配置（国际版）
- **Base URL**: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- **完整端点**: `POST https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions`
- **模型**: `qwen-turbo`

### 备用配置（国内版）
如果需要使用国内版端点，可以在 `.env` 文件中设置：
```env
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

## 环境变量配置

在 `backend/.env` 文件中配置：

```env
# 必需：API密钥
DASHSCOPE_API_KEY=sk-your-actual-api-key-here

# 可选：API端点（默认使用国际版）
# DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## 测试API连接

运行测试脚本：
```bash
cd backend
./test-ai-connection.sh
```

这个脚本会测试两个端点：
1. 国际版端点（dashscope-intl.aliyuncs.com）
2. 国内版端点（dashscope.aliyuncs.com）

## 网络问题排查

如果遇到连接超时问题：

1. **检查网络连接**
   ```bash
   ping dashscope-intl.aliyuncs.com
   curl -I https://dashscope-intl.aliyuncs.com
   ```

2. **检查防火墙设置**
   - 确保允许访问 `dashscope-intl.aliyuncs.com`
   - 端口 443 (HTTPS) 需要开放

3. **检查代理设置**
   - 如果在企业网络，可能需要配置代理
   - 设置 `HTTP_PROXY` 或 `HTTPS_PROXY` 环境变量

4. **使用调试端点**
   ```bash
   curl -X POST http://localhost:3000/api/debug/test-ai \
     -H "Content-Type: application/json" \
     -d '{"input":"test"}'
   ```

## Fallback机制

如果API无法访问，系统会自动使用fallback解析器：
- ✅ 支持中英文关键词识别
- ✅ 能生成基本策略
- ✅ 响应速度快（无网络延迟）

## 重启服务

修改配置后，需要重启后端服务：

```bash
# 停止当前服务（Ctrl+C）
# 然后重新启动
cd backend
npm run dev
```

服务启动时会显示使用的API端点：
```
[INFO] AIStrategist initialized with DashScope API (https://dashscope-intl.aliyuncs.com/compatible-mode/v1)
```





