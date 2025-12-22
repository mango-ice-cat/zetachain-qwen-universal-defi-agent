#!/bin/bash

# Quick API Test Script
# This script tests the backend API endpoints to verify they're working

BASE_URL="http://localhost:3000"
TEST_ADDRESS="0x1234567890123456789012345678901234567890"

echo "🧪 Testing Backend API Endpoints..."
echo ""

# Test 1: Health Check
echo "1️⃣ Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed: $BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    exit 1
fi
echo ""

# Test 2: Assets Endpoint
echo "2️⃣ Testing /api/assets/:address endpoint..."
ASSETS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/api/assets/$TEST_ADDRESS")
HTTP_CODE=$(echo "$ASSETS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$ASSETS_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Assets endpoint passed"
    echo "   Response preview: $(echo "$BODY" | head -c 100)..."
else
    echo "❌ Assets endpoint failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 3: Protocols Endpoint
echo "3️⃣ Testing /api/protocols endpoint..."
PROTOCOLS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL/api/protocols")
HTTP_CODE=$(echo "$PROTOCOLS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$PROTOCOLS_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Protocols endpoint passed"
    echo "   Response preview: $(echo "$BODY" | head -c 100)..."
else
    echo "❌ Protocols endpoint failed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: Strategy Endpoint (with timeout check)
echo "4️⃣ Testing /api/chat/strategy endpoint..."
echo "   Sending request (this may take up to 30 seconds)..."
START_TIME=$(date +%s)
STRATEGY_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"input\":\"I want low risk stable yield\",\"address\":\"$TEST_ADDRESS\"}" \
    --max-time 35 \
    "$BASE_URL/api/chat/strategy")
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
HTTP_CODE=$(echo "$STRATEGY_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$STRATEGY_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Strategy endpoint passed (took ${ELAPSED}s)"
    echo "   Response preview: $(echo "$BODY" | head -c 150)..."
elif [ "$HTTP_CODE" = "504" ]; then
    echo "⚠️  Strategy endpoint timed out (HTTP 504) - this is expected if AI service is slow"
else
    echo "❌ Strategy endpoint failed (HTTP $HTTP_CODE)"
    echo "   Response: $BODY"
fi
echo ""

# Test 5: Debug AI Endpoint
echo "5️⃣ Testing /api/debug/test-ai endpoint..."
DEBUG_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"input\":\"test\"}" \
    --max-time 20 \
    "$BASE_URL/api/debug/test-ai")
HTTP_CODE=$(echo "$DEBUG_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$DEBUG_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Debug AI endpoint passed"
    echo "   Response: $BODY"
else
    echo "⚠️  Debug AI endpoint returned HTTP $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

echo "🎉 API Testing Complete!"
echo ""
echo "💡 Tips:"
echo "   - If strategy endpoint times out, check DASHSCOPE_API_KEY in .env"
echo "   - Check backend logs for detailed error messages"
echo "   - Make sure backend is running: npm run dev in backend directory"






