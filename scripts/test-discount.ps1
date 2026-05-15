# Test Script for Discount System
# Usage: .\scripts\test-discount.ps1

param(
    [string]$BaseUrl = "http://localhost:3002",
    [string]$VendorToken = "",
    [string]$ProductId = ""
)

Write-Host "🧪 Testing Discount System" -ForegroundColor Cyan
Write-Host ""

if (-not $VendorToken) {
    Write-Host "❌ Error: Vendor token is required" -ForegroundColor Red
    Write-Host "Usage: .\scripts\test-discount.ps1 -VendorToken 'YOUR_TOKEN' -ProductId 'PRODUCT_ID'" -ForegroundColor Yellow
    exit 1
}

if (-not $ProductId) {
    Write-Host "❌ Error: Product ID is required" -ForegroundColor Red
    Write-Host "Usage: .\scripts\test-discount.ps1 -VendorToken 'YOUR_TOKEN' -ProductId 'PRODUCT_ID'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $VendorToken"
}

# Test 1: Get product before discount
Write-Host "📦 Test 1: Get product (before discount)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/products/$ProductId" -Method Get
    $originalPrice = $response.product.price
    Write-Host "   ✅ Original Price: $originalPrice coins" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Set 20% discount
Write-Host ""
Write-Host "💰 Test 2: Set 20% discount..." -ForegroundColor Yellow
try {
    $body = @{
        discountPercentage = 20
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/vendor/products/$ProductId/discount" `
        -Method Put `
        -Headers $headers `
        -Body $body
    
    Write-Host "   ✅ Discount set successfully" -ForegroundColor Green
    Write-Host "   📊 Discount: $($response.product.discount_percentage)%" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Test 3: Get product with discount
Write-Host ""
Write-Host "📦 Test 3: Get product (with discount)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/products/$ProductId" -Method Get
    $product = $response.product
    
    Write-Host "   ✅ Product retrieved" -ForegroundColor Green
    Write-Host "   📊 Original Price: $($product.price) coins" -ForegroundColor Cyan
    Write-Host "   📊 Discount: $($product.discount_percentage)%" -ForegroundColor Cyan
    Write-Host "   📊 Discounted Price: $($product.discountedPrice) coins" -ForegroundColor Green
    Write-Host "   📊 Has Discount: $($product.hasDiscount)" -ForegroundColor Cyan
    
    # Verify calculation
    $expectedPrice = [math]::Round($originalPrice * (1 - 20/100), 2)
    if ([math]::Abs($product.discountedPrice - $expectedPrice) -lt 0.01) {
        Write-Host "   ✅ Price calculation correct!" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Price calculation incorrect! Expected: $expectedPrice, Got: $($product.discountedPrice)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
    exit 1
}

# Test 4: Test validation - negative discount
Write-Host ""
Write-Host "🚫 Test 4: Validation - negative discount..." -ForegroundColor Yellow
try {
    $body = @{
        discountPercentage = -10
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/vendor/products/$ProductId/discount" `
        -Method Put `
        -Headers $headers `
        -Body $body
    
    Write-Host "   ❌ Should have failed but didn't!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   ✅ Correctly rejected negative discount" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Unexpected error: $_" -ForegroundColor Yellow
    }
}

# Test 5: Test validation - discount > 100
Write-Host ""
Write-Host "🚫 Test 5: Validation - discount > 100%..." -ForegroundColor Yellow
try {
    $body = @{
        discountPercentage = 150
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/vendor/products/$ProductId/discount" `
        -Method Put `
        -Headers $headers `
        -Body $body
    
    Write-Host "   ❌ Should have failed but didn't!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   ✅ Correctly rejected discount > 100%" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Unexpected error: $_" -ForegroundColor Yellow
    }
}

# Test 6: Update discount to 50%
Write-Host ""
Write-Host "💰 Test 6: Update discount to 50%..." -ForegroundColor Yellow
try {
    $body = @{
        discountPercentage = 50
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/vendor/products/$ProductId/discount" `
        -Method Put `
        -Headers $headers `
        -Body $body
    
    Write-Host "   ✅ Discount updated to 50%" -ForegroundColor Green
    
    # Verify new price
    $productResponse = Invoke-RestMethod -Uri "$BaseUrl/api/products/$ProductId" -Method Get
    $expectedPrice = [math]::Round($originalPrice * (1 - 50/100), 2)
    if ([math]::Abs($productResponse.product.discountedPrice - $expectedPrice) -lt 0.01) {
        Write-Host "   ✅ New discounted price correct: $($productResponse.product.discountedPrice) coins" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
}

# Test 7: Remove discount
Write-Host ""
Write-Host "🗑️  Test 7: Remove discount..." -ForegroundColor Yellow
try {
    $body = @{
        discountPercentage = $null
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/vendor/products/$ProductId/discount" `
        -Method Put `
        -Headers $headers `
        -Body $body
    
    Write-Host "   ✅ Discount removed successfully" -ForegroundColor Green
    
    # Verify no discount
    $productResponse = Invoke-RestMethod -Uri "$BaseUrl/api/products/$ProductId" -Method Get
    if ($productResponse.product.discount_percentage -eq $null -and -not $productResponse.product.hasDiscount) {
        Write-Host "   ✅ Product has no discount" -ForegroundColor Green
        Write-Host "   📊 Price: $($productResponse.product.price) coins (original)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test in Frontend UI (VendorProductsScreen)" -ForegroundColor White
Write-Host "   2. Test ProductDetailScreen với discount" -ForegroundColor White
Write-Host "   3. Test Shopping Cart với discounted products" -ForegroundColor White
Write-Host "   4. Test Purchase flow với discount" -ForegroundColor White






















