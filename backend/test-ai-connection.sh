#!/bin/bash

# Test AI Service Connection
# This script tests if the DashScope API is accessible

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo "🔍 Testing DashScope API Connection..."
echo ""

# Check if API key is set
if [ -z "$DASHSCOPE_API_KEY" ] || [ "$DASHSCOPE_API_KEY" = "sk-placeholder" ]; then
    echo "❌ DASHSCOPE_API_KEY not set or is placeholder"
    echo "   Please set it in backend/.env file"
    echo ""
    echo "   Example .env file:"
    echo "   DASHSCOPE_API_KEY=sk-your-actual-key-here"
    exit 1
fi

echo "✅ API Key found (length: ${#DASHSCOPE_API_KEY})"
echo ""

# Test API endpoint directly - try international endpoint first
echo "🌐 Testing DashScope API endpoints..."
echo ""

# Test 1: International endpoint
echo "1️⃣ Testing international endpoint (dashscope-intl.aliyuncs.com)..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -d '{
        "model": "qwen-turbo",
        "messages": [{"role": "user", "content": "test"}],
        "max_tokens": 10
    }' \
    --max-time 10)

HTTP_CODE_INTL=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY_INTL=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE_INTL" = "200" ]; then
    echo "✅ International endpoint is accessible!"
    echo "   Response preview: $(echo "$BODY_INTL" | head -c 200)..."
    echo ""
    echo "💡 Recommendation: Use international endpoint"
    echo "   Set in .env: DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    exit 0
elif [ "$HTTP_CODE_INTL" = "401" ]; then
    echo "❌ Authentication failed - API key may be invalid"
    echo "   Response: $BODY_INTL"
elif [ "$HTTP_CODE_INTL" = "000" ] || [ -z "$HTTP_CODE_INTL" ]; then
    echo "⚠️  Connection timeout or network issue"
else
    echo "⚠️  API returned HTTP $HTTP_CODE_INTL"
    echo "   Response: $BODY_INTL"
fi

echo ""
echo "2️⃣ Testing domestic endpoint (dashscope.aliyuncs.com)..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -X POST "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -d '{
        "model": "qwen-turbo",
        "messages": [{"role": "user", "content": "test"}],
        "max_tokens": 10
    }' \
    --max-time 10)

HTTP_CODE_DOM=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY_DOM=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE_DOM" = "200" ]; then
    echo "✅ Domestic endpoint is accessible!"
    echo "   Response preview: $(echo "$BODY_DOM" | head -c 200)..."
    echo ""
    echo "💡 Recommendation: Use domestic endpoint"
    echo "   Set in .env: DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1"
elif [ "$HTTP_CODE_DOM" = "401" ]; then
    echo "❌ Authentication failed - API key may be invalid"
    echo "   Response: $BODY_DOM"
elif [ "$HTTP_CODE_DOM" = "000" ] || [ -z "$HTTP_CODE_DOM" ]; then
    echo "⚠️  Connection timeout or network issue"
    echo "   This might be a network/firewall problem"
else
    echo "⚠️  API returned HTTP $HTTP_CODE_DOM"
    echo "   Response: $BODY_DOM"
fi

echo ""
echo "💡 If API is not accessible, the system will use fallback parser"
echo "   Fallback parser works but has limited functionality"


