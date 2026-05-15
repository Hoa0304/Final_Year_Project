# HMall API Test Script for PowerShell
# This script tests the main API endpoints

$BASE_URL = "http://localhost:3002"
$TEST_EMAIL = "testuser$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$TEST_PASSWORD = "password123"
$ADMIN_EMAIL = "admin@HMall.com"
$ADMIN_PASSWORD = "admin123"

Write-Host "🧪 Starting HMall API Tests..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$PASSED = 0
$FAILED = 0

function Test-Result {
    param(
        [bool]$Success,
        [string]$Message
    )
    
    if ($Success) {
        Write-Host "✅ PASS: $Message" -ForegroundColor Green
        $script:PASSED++
    } else {
        Write-Host "❌ FAIL: $Message" -ForegroundColor Red
        $script:FAILED++
    }
}

# Test 1: Health Check
Write-Host "1. Testing Health Check..."
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/health" -Method GET -UseBasicParsing
    Test-Result ($response.StatusCode -eq 200) "Health check"
} catch {
    Test-Result $false "Health check"
}

# Test 2: Register User
Write-Host "2. Testing User Registration..."
try {
    $body = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
        fullName = "Test User"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/register" -Method POST -Body $body -ContentType "application/json"
    
    if ($response.token) {
        Test-Result $true "User registration"
        $TOKEN = $response.token
    } else {
        Test-Result $false "User registration"
        exit 1
    }
} catch {
    Test-Result $false "User registration"
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Login
Write-Host "3. Testing User Login..."
try {
    $body = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $body -ContentType "application/json"
    
    if ($response.token) {
        Test-Result $true "User login"
        $TOKEN = $response.token
    } else {
        Test-Result $false "User login"
    }
} catch {
    Test-Result $false "User login"
    $TOKEN = ""
}

# Test 4: Get Balance
Write-Host "4. Testing Get Balance..."
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/users/balance" -Method GET -Headers $headers
    
    if ($response.balance) {
        Test-Result $true "Get balance"
        Write-Host "   Balance: $($response.balance) coins" -ForegroundColor Gray
        $BALANCE = $response.balance
    } else {
        Test-Result $false "Get balance"
    }
} catch {
    Test-Result $false "Get balance"
}

# Test 5: Get Products
Write-Host "5. Testing Get Products..."
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/products" -Method GET
    
    if ($response.products -and $response.products.Count -gt 0) {
        Test-Result $true "Get products ($($response.products.Count) products)"
        $PRODUCT_ID = $response.products[0].id
    } else {
        Test-Result $false "Get products"
        $PRODUCT_ID = ""
    }
} catch {
    Test-Result $false "Get products"
    $PRODUCT_ID = ""
}

# Test 6: Get Tasks
Write-Host "6. Testing Get Tasks..."
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/tasks" -Method GET -Headers $headers
    
    if ($response.tasks -and $response.tasks.Count -gt 0) {
        Test-Result $true "Get tasks ($($response.tasks.Count) tasks)"
        $TASK_ID = $response.tasks[0].id
    } else {
        Test-Result $false "Get tasks"
        $TASK_ID = ""
    }
} catch {
    Test-Result $false "Get tasks"
    $TASK_ID = ""
}

# Test 7: Get Stocks
Write-Host "7. Testing Get Stocks..."
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/stocks" -Method GET
    
    if ($response.stocks -and $response.stocks.Count -gt 0) {
        Test-Result $true "Get stocks ($($response.stocks.Count) stocks)"
    } else {
        Test-Result $false "Get stocks"
    }
} catch {
    Test-Result $false "Get stocks"
}

# Test 8: Get Recommendations
Write-Host "8. Testing Get Recommendations..."
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/recommendations/spending" -Method GET -Headers $headers
    
    if ($response.recommendations) {
        Test-Result $true "Get spending recommendations"
    } else {
        Test-Result $false "Get spending recommendations"
    }
} catch {
    Test-Result $false "Get spending recommendations"
}

# Test 9: Complete Task
if ($TASK_ID) {
    Write-Host "9. Testing Complete Task..."
    try {
        $headers = @{
            "Authorization" = "Bearer $TOKEN"
        }
        
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/tasks/$TASK_ID/complete" -Method POST -Headers $headers
        
        if ($response.reward) {
            Test-Result $true "Complete task"
        } else {
            Test-Result $false "Complete task"
        }
    } catch {
        if ($_.Exception.Response.StatusCode -eq 400) {
            Test-Result $true "Complete task (already completed - expected)"
        } else {
            Test-Result $false "Complete task"
        }
    }
}

# Test 10: Admin Login
Write-Host "10. Testing Admin Login..."
try {
    $body = @{
        email = $ADMIN_EMAIL
        password = $ADMIN_PASSWORD
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/auth/login" -Method POST -Body $body -ContentType "application/json"
    
    if ($response.token) {
        Test-Result $true "Admin login"
        $ADMIN_TOKEN = $response.token
    } else {
        Test-Result $false "Admin login (admin user might not exist)"
        $ADMIN_TOKEN = ""
    }
} catch {
    Test-Result $false "Admin login (admin user might not exist)"
    $ADMIN_TOKEN = ""
}

# Test 11: Admin Get Stats
if ($ADMIN_TOKEN) {
    Write-Host "11. Testing Admin Get Stats..."
    try {
        $headers = @{
            "Authorization" = "Bearer $ADMIN_TOKEN"
        }
        
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/admin/users/stats" -Method GET -Headers $headers
        
        if ($response.totalUsers) {
            Test-Result $true "Admin get stats"
        } else {
            Test-Result $false "Admin get stats"
        }
    } catch {
        Test-Result $false "Admin get stats"
    }
}

# Summary
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Passed: $PASSED" -ForegroundColor Green
Write-Host "Failed: $FAILED" -ForegroundColor Red
Write-Host ""

if ($FAILED -eq 0) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Some tests failed" -ForegroundColor Yellow
    exit 1
}



