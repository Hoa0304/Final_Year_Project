#!/bin/bash

# HMall API Test Script
# This script tests the main API endpoints

BASE_URL="http://localhost:3002"
TEST_EMAIL="testuser$(date +%s)@example.com"
TEST_PASSWORD="password123"
ADMIN_EMAIL="admin@HMall.com"
ADMIN_PASSWORD="admin123"

echo "🧪 Starting HMall API Tests..."
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to print test result
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

# Test 1: Health Check
echo "1. Testing Health Check..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$RESPONSE" = "200" ]; then
    test_result 0 "Health check"
else
    test_result 1 "Health check (got $RESPONSE)"
fi

# Test 2: Register User
echo "2. Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"fullName\":\"Test User\"}")

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    test_result 0 "User registration"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
    test_result 1 "User registration"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

# Test 3: Login
echo "3. Testing User Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    test_result 0 "User login"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
    test_result 1 "User login"
    TOKEN=""
fi

# Test 4: Get Balance
echo "4. Testing Get Balance..."
BALANCE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/users/balance" \
    -H "Authorization: Bearer $TOKEN")

if echo "$BALANCE_RESPONSE" | grep -q "balance"; then
    test_result 0 "Get balance"
    BALANCE=$(echo "$BALANCE_RESPONSE" | grep -o '"balance":[0-9.]*' | cut -d':' -f2)
    echo "   Balance: $BALANCE coins"
else
    test_result 1 "Get balance"
fi

# Test 5: Get Products
echo "5. Testing Get Products..."
PRODUCTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/products")
PRODUCT_COUNT=$(echo "$PRODUCTS_RESPONSE" | grep -o '"id"' | wc -l)

if [ "$PRODUCT_COUNT" -gt 0 ]; then
    test_result 0 "Get products ($PRODUCT_COUNT products)"
    PRODUCT_ID=$(echo "$PRODUCTS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
else
    test_result 1 "Get products"
    PRODUCT_ID=""
fi

# Test 6: Get Tasks
echo "6. Testing Get Tasks..."
TASKS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/tasks" \
    -H "Authorization: Bearer $TOKEN")
TASK_COUNT=$(echo "$TASKS_RESPONSE" | grep -o '"id"' | wc -l)

if [ "$TASK_COUNT" -gt 0 ]; then
    test_result 0 "Get tasks ($TASK_COUNT tasks)"
    TASK_ID=$(echo "$TASKS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
else
    test_result 1 "Get tasks"
    TASK_ID=""
fi

# Test 7: Get Stocks
echo "7. Testing Get Stocks..."
STOCKS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/stocks")
STOCK_COUNT=$(echo "$STOCKS_RESPONSE" | grep -o '"id"' | wc -l)

if [ "$STOCK_COUNT" -gt 0 ]; then
    test_result 0 "Get stocks ($STOCK_COUNT stocks)"
else
    test_result 1 "Get stocks"
fi

# Test 8: Get Recommendations
echo "8. Testing Get Recommendations..."
REC_RESPONSE=$(curl -s -X GET "$BASE_URL/api/recommendations/spending" \
    -H "Authorization: Bearer $TOKEN")

if echo "$REC_RESPONSE" | grep -q "recommendations"; then
    test_result 0 "Get spending recommendations"
else
    test_result 1 "Get spending recommendations"
fi

# Test 9: Complete Task (if task available)
if [ -n "$TASK_ID" ]; then
    echo "9. Testing Complete Task..."
    COMPLETE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/tasks/$TASK_ID/complete" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$COMPLETE_RESPONSE" | grep -q "reward"; then
        test_result 0 "Complete task"
    else
        # Might fail if already completed
        if echo "$COMPLETE_RESPONSE" | grep -q "already completed"; then
            test_result 0 "Complete task (already completed - expected)"
        else
            test_result 1 "Complete task"
        fi
    fi
fi

# Test 10: Admin Login
echo "10. Testing Admin Login..."
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$ADMIN_LOGIN_RESPONSE" | grep -q "token"; then
    test_result 0 "Admin login"
    ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
    test_result 1 "Admin login (admin user might not exist)"
    ADMIN_TOKEN=""
fi

# Test 11: Admin Get Stats (if admin token available)
if [ -n "$ADMIN_TOKEN" ]; then
    echo "11. Testing Admin Get Stats..."
    STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/users/stats" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$STATS_RESPONSE" | grep -q "totalUsers"; then
        test_result 0 "Admin get stats"
    else
        test_result 1 "Admin get stats"
    fi
fi

# Summary
echo ""
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed${NC}"
    exit 1
fi



