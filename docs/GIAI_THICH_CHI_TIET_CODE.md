# GIẢI THÍCH CHI TIẾT TẤT CẢ CÁC FILE CODE VÀ CÔNG DỤNG TRONG PROJECT HMall

## MỤC LỤC
1. [Tổng quan về cấu trúc project](#tổng-quan-về-cấu-trúc-project)
2. [Backend Module](#backend-module)
3. [Frontend Module](#frontend-module)
4. [AI Service Module](#ai-service-module)
5. [Database Migrations](#database-migrations)
6. [Scripts và Utilities](#scripts-và-utilities)
7. [Configuration Files](#configuration-files)

---

## TỔNG QUAN VỀ CẤU TRÚC PROJECT

Project HMall được tổ chức theo kiến trúc **3-tier architecture** với các module chính:

- **Backend** (`backend/`): RESTful API server sử dụng Node.js/Express
- **Frontend** (`frontend/`): Mobile app sử dụng React Native/Expo
- **AI Service** (`ai-service/`): Microservice xử lý AI/ML recommendations
- **Database** (`supabase/`): PostgreSQL database với Supabase
- **Scripts** (`scripts/`): Utility scripts cho automation
- **Docs** (`docs/`): Tài liệu và diagrams

---

## BACKEND MODULE

### 📁 Cấu trúc thư mục
```
backend/
├── src/
│   ├── index.ts                    # Entry point của backend server
│   ├── config/                     # Configuration files
│   ├── controllers/                # Request handlers (25 files)
│   ├── routes/                     # API route definitions (24 files)
│   ├── services/                   # Business logic (10 files)
│   ├── middleware/                 # Express middleware (2 files)
│   └── utils/                      # Utility functions (5 files)
├── dist/                           # Compiled JavaScript (TypeScript output)
├── scripts/                        # Setup scripts
└── package.json                    # Dependencies và scripts
```

### 🔧 File chính

#### **`backend/src/index.ts`**
**Công dụng**: Entry point của backend server, khởi tạo Express app và cấu hình tất cả routes.

**Chức năng chính**:
- Import và load environment variables từ `config/env.ts`
- Khởi tạo Express app với CORS, JSON parsing middleware
- Đăng ký tất cả API routes (auth, users, products, tasks, stocks, games, etc.)
- Khởi động stock price update service (cập nhật giá cổ phiếu mỗi 10 giây)
- Error handling middleware và 404 handler
- Graceful shutdown handlers (SIGTERM, SIGINT)

**Routes được đăng ký**:
- `/api/auth` - Authentication
- `/api/users` - User management
- `/api/products` - Product management
- `/api/tasks` - Task management
- `/api/stocks` - Stock trading
- `/api/games` - Game management
- `/api/admin` - Admin operations
- `/api/vendor` - Vendor operations
- `/api/recommendations` - AI recommendations
- `/api/cart` - Shopping cart
- `/api/vouchers` - Voucher system
- `/api/budgets` - Budget management
- `/api/chat` - AI chat
- `/api/social` - Social features
- `/api/messaging` - Direct messaging
- Và nhiều routes khác...

#### **`backend/src/config/env.ts`**
**Công dụng**: Quản lý environment variables và configuration.

**Chức năng**:
- Load `.env` file từ backend directory
- Export typed environment variables với default values
- Validate required environment variables (SUPABASE_SERVICE_ROLE_KEY)
- Cung cấp fallback paths nếu không tìm thấy .env file

**Environment variables**:
- `PORT`: Server port (default: 3002)
- `NODE_ENV`: Environment mode (development/production)
- `SUPABASE_URL`: Supabase database URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (required)
- `JWT_SECRET`: Secret key cho JWT tokens
- `JWT_EXPIRES_IN`: JWT expiration time (default: 7d)
- `AI_SERVICE_URL`: URL của AI service (default: http://localhost:3003)
- `CORS_ORIGIN`: Allowed CORS origins
- `CLOUDINARY_*`: Cloudinary configuration cho image upload
- `GROQ_API_KEY`: API key cho Groq AI service

### 📂 Controllers (25 files)

Controllers xử lý HTTP requests và responses, validate input, gọi services để xử lý business logic.

#### **Authentication & User Management**

**`auth.controller.ts`**
- `register()`: Đăng ký user mới, hash password, tạo JWT token
- `login()`: Xác thực user, trả về JWT token
- `refreshToken()`: Refresh JWT token khi hết hạn

**`user.controller.ts`**
- `getProfile()`: Lấy thông tin profile của user
- `updateProfile()`: Cập nhật profile (avatar, phone, bio, address, date_of_birth)
- `getUserById()`: Lấy thông tin user theo ID
- `getAllUsers()`: Lấy danh sách tất cả users (admin only)

#### **Product Management**

**`product.controller.ts`**
- `getProducts()`: Lấy danh sách products với pagination, filtering, sorting
- `getProductById()`: Lấy chi tiết product
- `createProduct()`: Tạo product mới (vendor/admin)
- `updateProduct()`: Cập nhật product (vendor/admin)
- `deleteProduct()`: Xóa product (vendor/admin)
- `searchProducts()`: Tìm kiếm products
- `getProductsByVendor()`: Lấy products của vendor
- `getRatings()`: Lấy ratings của product
- `createRating()`: Tạo rating cho product

**`vendor.controller.ts`**
- `getVendorProducts()`: Lấy products của vendor hiện tại
- `createVendorProduct()`: Tạo product mới
- `updateVendorProduct()`: Cập nhật product
- `deleteVendorProduct()`: Xóa product
- `getVendorStats()`: Thống kê vendor (sales, revenue, etc.)

**`vendor-public.controller.ts`**
- `getVendors()`: Lấy danh sách vendors (public)
- `getVendorById()`: Lấy thông tin vendor (public)
- `getVendorProducts()`: Lấy products của vendor (public)

#### **Shopping & Transactions**

**`shopping-cart.controller.ts`**
- `getCart()`: Lấy shopping cart của user
- `addToCart()`: Thêm product vào cart
- `updateCartItem()`: Cập nhật số lượng trong cart
- `removeFromCart()`: Xóa item khỏi cart
- `clearCart()`: Xóa toàn bộ cart
- `checkout()`: Thanh toán cart, tạo transaction

**`purchase-history.controller.ts`**
- `getPurchaseHistory()`: Lấy lịch sử mua hàng của user
- `getPurchaseById()`: Lấy chi tiết purchase
- `getUserPurchaseHistory()`: Lấy purchase history của user cụ thể

**`transaction-label.controller.ts`**
- `getTransactionLabels()`: Lấy danh sách transaction labels
- `createTransactionLabel()`: Tạo label mới
- `updateTransactionLabel()`: Cập nhật label
- `deleteTransactionLabel()`: Xóa label
- `autoLabelTransaction()`: Tự động gán label cho transaction

#### **Stock Trading**

**`stock.controller.ts`**
- `getStocks()`: Lấy danh sách stocks với current prices
- `getStockById()`: Lấy chi tiết stock
- `getStockHistory()`: Lấy lịch sử giá stock
- `buyStock()`: Mua stock
- `sellStock()`: Bán stock
- `getPortfolio()`: Lấy portfolio của user
- `getStockStats()`: Thống kê stock performance

#### **Task Management**

**`task.controller.ts`**
- `getTasks()`: Lấy danh sách tasks
- `getTaskById()`: Lấy chi tiết task
- `createTask()`: Tạo task mới (admin)
- `updateTask()`: Cập nhật task (admin)
- `deleteTask()`: Xóa task (admin)
- `claimTask()`: User nhận task
- `completeTask()`: User hoàn thành task
- `getUserTasks()`: Lấy tasks của user

#### **Game Management**

**`game.controller.ts`**
- `getGames()`: Lấy danh sách games
- `getGameById()`: Lấy chi tiết game
- `playGame()`: Bắt đầu chơi game
- `getUserGamePlays()`: Lấy lịch sử chơi game của user
- `getGameLeaderboard()`: Lấy leaderboard của game

**`game-template.controller.ts`**
- `getGameTemplates()`: Lấy danh sách game templates (admin)
- `createGameTemplate()`: Tạo game template mới (admin)
- `updateGameTemplate()`: Cập nhật game template (admin)
- `deleteGameTemplate()`: Xóa game template (admin)

**`game-instance.controller.ts`**
- `getGameInstances()`: Lấy danh sách game instances (admin)
- `createGameInstance()`: Tạo game instance từ template (admin)
- `updateGameInstance()`: Cập nhật game instance (admin)
- `deleteGameInstance()`: Xóa game instance (admin)

**`game-content.controller.ts`**
- `getGameContent()`: Lấy content của game (questions, answers, etc.)
- `createGameContent()`: Tạo game content (admin)
- `updateGameContent()`: Cập nhật game content (admin)
- `deleteGameContent()`: Xóa game content (admin)

#### **AI & Recommendations**

**`recommendation.controller.ts`**
- `getRecommendations()`: Lấy product recommendations từ AI service
- `getSpendingRecommendations()`: Lấy spending recommendations
- `getInvestingRecommendations()`: Lấy investing recommendations

**`ai-suggestions.controller.ts`**
- `getSuggestions()`: Lấy AI suggestions (items, categories, etc.)
- `categorizeTransaction()`: Phân loại transaction bằng AI
- `getExpenseInsights()`: Lấy insights về chi tiêu

**`chat.controller.ts`**
- `sendMessage()`: Gửi message đến AI chat assistant
- `getChatHistory()`: Lấy lịch sử chat
- `clearChatHistory()`: Xóa lịch sử chat

#### **Social Features**

**`social.controller.ts`**
- `getDiscussions()`: Lấy danh sách discussions
- `createDiscussion()`: Tạo discussion mới
- `getDiscussionById()`: Lấy chi tiết discussion
- `addComment()`: Thêm comment vào discussion
- `likeDiscussion()`: Like/unlike discussion
- `deleteDiscussion()`: Xóa discussion

**`messaging.controller.ts`**
- `getConversations()`: Lấy danh sách conversations
- `getConversation()`: Lấy conversation với user cụ thể
- `sendMessage()`: Gửi direct message
- `markAsRead()`: Đánh dấu message đã đọc
- `deleteConversation()`: Xóa conversation

#### **Notifications**

**`notification.controller.ts`**
- `getNotifications()`: Lấy danh sách notifications
- `markAsRead()`: Đánh dấu notification đã đọc
- `markAllAsRead()`: Đánh dấu tất cả đã đọc
- `deleteNotification()`: Xóa notification
- `getNotificationPreferences()`: Lấy notification preferences
- `updateNotificationPreferences()`: Cập nhật preferences

#### **Budget Management**

**`budget.controller.ts`**
- `getBudgets()`: Lấy danh sách budgets của user
- `createBudget()`: Tạo budget mới
- `updateBudget()`: Cập nhật budget
- `deleteBudget()`: Xóa budget
- `getBudgetStats()`: Thống kê budget performance

#### **Voucher System**

**`voucher.controller.ts`**
- `getVouchers()`: Lấy danh sách vouchers
- `getVoucherById()`: Lấy chi tiết voucher
- `createVoucher()`: Tạo voucher mới (admin/vendor)
- `updateVoucher()`: Cập nhật voucher (admin/vendor)
- `deleteVoucher()`: Xóa voucher (admin/vendor)
- `claimVoucher()`: User claim voucher
- `getUserVouchers()`: Lấy vouchers của user
- `applyVoucher()`: Áp dụng voucher khi checkout

#### **Admin Operations**

**`admin.controller.ts`**
- `getDashboardStats()`: Lấy thống kê dashboard (users, products, sales, etc.)
- `getUserStats()`: Thống kê users
- `getProductStats()`: Thống kê products
- `getSalesStats()`: Thống kê sales
- `getGameStats()`: Thống kê games
- `updateUserRole()`: Cập nhật role của user
- `banUser()`: Ban user
- `unbanUser()`: Unban user

#### **File Upload**

**`upload.controller.ts`**
- `uploadImage()`: Upload image lên Cloudinary
- `uploadMultipleImages()`: Upload nhiều images
- `deleteImage()`: Xóa image từ Cloudinary

#### **Rating System**

**`rating.controller.ts`**
- `getRatings()`: Lấy ratings của product
- `createRating()`: Tạo rating mới
- `updateRating()`: Cập nhật rating
- `deleteRating()`: Xóa rating
- `getUserRatings()`: Lấy ratings của user

### 📂 Routes (24 files)

Routes định nghĩa API endpoints và map chúng đến controllers. Mỗi route file tương ứng với một controller.

**Cấu trúc route điển hình**:
```typescript
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', middleware.auth, controller.create);
router.put('/:id', middleware.auth, controller.update);
router.delete('/:id', middleware.auth, controller.delete);
```

**Các route files**:
- `auth.routes.ts` - Authentication endpoints
- `user.routes.ts` - User management endpoints
- `product.routes.ts` - Product endpoints
- `task.routes.ts` - Task endpoints
- `stock.routes.ts` - Stock trading endpoints
- `game.routes.ts` - Game endpoints
- `admin.routes.ts` - Admin endpoints
- `vendor.routes.ts` - Vendor endpoints
- `recommendation.routes.ts` - Recommendation endpoints
- `shopping-cart.routes.ts` - Shopping cart endpoints
- `purchase-history.routes.ts` - Purchase history endpoints
- `voucher.routes.ts` - Voucher endpoints
- `budget.routes.ts` - Budget endpoints
- `chat.routes.ts` - AI chat endpoints
- `social.routes.ts` - Social endpoints
- `messaging.routes.ts` - Messaging endpoints
- `notification.routes.ts` - Notification endpoints
- Và nhiều routes khác...

### 📂 Services (10 files)

Services chứa business logic, tương tác với database, và gọi external APIs.

#### **`transaction.service.ts`**
**Công dụng**: Xử lý logic cho transactions (mua hàng, giao dịch stock, etc.)

**Chức năng**:
- `createTransaction()`: Tạo transaction mới
- `updateUserBalance()`: Cập nhật số dư user
- `validateTransaction()`: Validate transaction trước khi thực hiện
- `processPurchase()`: Xử lý mua hàng
- `processStockTrade()`: Xử lý giao dịch stock
- `processTaskReward()`: Xử lý reward từ task

#### **`stock-price.service.ts`**
**Công dụng**: Quản lý giá cổ phiếu, cập nhật giá tự động.

**Chức năng**:
- `startStockPriceUpdates()`: Khởi động service cập nhật giá (mỗi 10 giây)
- `updateStockPrices()`: Cập nhật giá cho tất cả stocks
- `calculatePriceChange()`: Tính toán thay đổi giá (random fluctuation)
- `getStockPrice()`: Lấy giá hiện tại của stock

#### **`voucher.service.ts`**
**Công dụng**: Xử lý logic cho voucher system.

**Chức năng**:
- `validateVoucher()`: Validate voucher (expiry, usage limit, etc.)
- `applyVoucher()`: Áp dụng voucher vào order
- `calculateDiscount()`: Tính toán discount từ voucher
- `checkVoucherEligibility()`: Kiểm tra user có đủ điều kiện claim voucher

#### **`budget.service.ts`**
**Công dụng**: Xử lý logic cho budget management.

**Chức năng**:
- `calculateBudgetUsage()`: Tính toán budget usage
- `checkBudgetExceeded()`: Kiểm tra budget có vượt quá không
- `getBudgetStats()`: Tính toán thống kê budget

#### **`game.service.ts`**
**Công dụng**: Xử lý logic cho game system.

**Chức năng**:
- `startGame()`: Bắt đầu game session
- `endGame()`: Kết thúc game, tính điểm và reward
- `validateGameAnswer()`: Validate câu trả lời trong game
- `calculateScore()`: Tính điểm game
- `getGameLeaderboard()`: Lấy leaderboard

#### **`game-engine.service.ts`**
**Công dụng**: Game engine cho các game types (TicTacToe, Quiz, etc.)

**Chức năng**:
- `processTicTacToeMove()`: Xử lý move trong TicTacToe
- `checkTicTacToeWinner()`: Kiểm tra người thắng
- `processQuizAnswer()`: Xử lý câu trả lời quiz
- `generateQuizQuestions()`: Generate questions cho quiz

#### **`notification.service.ts`**
**Công dụng**: Xử lý logic cho notification system.

**Chức năng**:
- `createNotification()`: Tạo notification mới
- `sendNotification()`: Gửi notification (Firebase, in-app, etc.)
- `getUserNotifications()`: Lấy notifications của user
- `markAsRead()`: Đánh dấu đã đọc

#### **`social.service.ts`**
**Công dụng**: Xử lý logic cho social features.

**Chức năng**:
- `createDiscussion()`: Tạo discussion mới
- `addComment()`: Thêm comment
- `likeDiscussion()`: Like/unlike discussion
- `getDiscussions()`: Lấy discussions với pagination

#### **`messaging.service.ts`**
**Công dụng**: Xử lý logic cho direct messaging.

**Chức năng**:
- `createConversation()`: Tạo conversation mới
- `sendMessage()`: Gửi message
- `getConversation()`: Lấy conversation
- `markAsRead()`: Đánh dấu đã đọc

#### **`groq.service.ts`**
**Công dụng**: Integration với Groq AI API cho chat assistant.

**Chức năng**:
- `sendMessage()`: Gửi message đến Groq AI
- `getChatResponse()`: Lấy response từ AI
- `formatChatHistory()`: Format chat history cho AI context

### 📂 Middleware (2 files)

#### **`auth.middleware.ts`**
**Công dụng**: Xác thực JWT token cho protected routes.

**Chức năng**:
- `authenticate()`: Verify JWT token từ Authorization header
- `authorize()`: Kiểm tra user có quyền truy cập (role-based)
- `optionalAuth()`: Optional authentication (cho public routes)

#### **`upload.middleware.ts`**
**Công dụng**: Xử lý file upload với Multer.

**Chức năng**:
- `uploadImage()`: Multer middleware cho image upload
- `validateImage()`: Validate image file (type, size, etc.)

### 📂 Utils (5 files)

#### **`jwt.ts`**
**Công dụng**: JWT token utilities.

**Chức năng**:
- `generateToken()`: Tạo JWT token
- `verifyToken()`: Verify JWT token
- `decodeToken()`: Decode JWT token

#### **`password.ts`**
**Công dụng**: Password hashing utilities.

**Chức năng**:
- `hashPassword()`: Hash password với bcrypt
- `comparePassword()`: So sánh password với hash

#### **`supabase.ts`**
**Công dụng**: Supabase client initialization.

**Chức năng**:
- `getSupabaseClient()`: Tạo Supabase client với service role key
- `getSupabaseAdminClient()`: Tạo Supabase admin client

#### **`cloudinary.ts`**
**Công dụng**: Cloudinary integration cho image upload.

**Chức năng**:
- `uploadImage()`: Upload image lên Cloudinary
- `deleteImage()`: Xóa image từ Cloudinary
- `getImageUrl()`: Lấy URL của image

#### **`price.utils.ts`**
**Công dụng**: Price formatting utilities.

**Chức năng**:
- `formatPrice()`: Format price với currency symbol
- `calculateDiscount()`: Tính toán discount
- `applyVoucher()`: Áp dụng voucher discount

---

## FRONTEND MODULE

### 📁 Cấu trúc thư mục
```
frontend/
├── App.tsx                         # Root component
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Navigation configuration
│   ├── context/
│   │   └── AuthContext.tsx         # Authentication context
│   ├── config/
│   │   └── api.ts                  # API configuration
│   ├── screens/                    # Screen components (31 files)
│   │   ├── auth/                   # Auth screens (2 files)
│   │   ├── main/                   # Main screens (13 files)
│   │   ├── admin/                  # Admin screens (6 files)
│   │   ├── vendor/                 # Vendor screens (1 file)
│   │   └── detail/                 # Detail screens (9 files)
│   ├── services/                   # API services (20 files)
│   ├── components/                 # Reusable components (5 files)
│   └── utils/                      # Utility functions (1 file)
└── package.json                    # Dependencies
```

### 🔧 File chính

#### **`frontend/App.tsx`**
**Công dụng**: Root component của React Native app.

**Chức năng**:
- Khởi tạo React Query client cho data fetching
- Wrap app với `AuthProvider` để quản lý authentication state
- Render `AppNavigator` để điều hướng
- Cấu hình StatusBar

#### **`frontend/src/navigation/AppNavigator.tsx`**
**Công dụng**: Cấu hình navigation cho toàn bộ app.

**Chức năng**:
- Tạo Stack Navigator và Tab Navigator
- Định nghĩa 3 tab navigators:
  - `MainTabs`: Cho regular users (Dashboard, Marketplace, Stocks, Profile, More)
  - `AdminTabs`: Cho admin (AdminDashboard, Products, Vouchers, Tasks, Users, GameBuilder)
  - `VendorTabs`: Cho vendor (Dashboard, MyProducts, Vouchers, Marketplace, Profile)
- Định nghĩa Stack screens cho từng role
- Xử lý authentication flow (Login/Register screens khi chưa đăng nhập)

**Screens được định nghĩa**:
- Auth: Login, Register
- Main: Dashboard, Marketplace, Tasks, Stocks, Games, Profile, More, Chat, Social, Messages, Notifications, ExpenseManagement
- Admin: AdminDashboard, AdminProducts, AdminTasks, AdminUsers, AdminGameBuilder, VoucherManagement
- Vendor: VendorProducts
- Detail: ProductDetail, StockDetail, Portfolio, Transactions, PurchaseHistory, ShoppingCart, TicTacToe, QuizGame, VendorShop

#### **`frontend/src/context/AuthContext.tsx`**
**Công dụng**: React Context quản lý authentication state.

**Chức năng**:
- `loadUser()`: Load user từ AsyncStorage khi app khởi động
- `login()`: Set user state sau khi login
- `logout()`: Clear user state và AsyncStorage
- `updateUser()`: Cập nhật user state
- Provide `user`, `isLoading`, `login`, `logout`, `updateUser` cho toàn bộ app

#### **`frontend/src/config/api.ts`**
**Công dụng**: Cấu hình Axios client cho API calls.

**Chức năng**:
- Tạo Axios instance với baseURL từ `EXPO_PUBLIC_API_URL`
- Request interceptor: Thêm JWT token vào Authorization header
- Response interceptor: Xử lý errors (401 = logout, network errors, etc.)
- Logging cho debugging

### 📂 Screens (31 files)

#### **Auth Screens (2 files)**

**`LoginScreen.tsx`**
- Form đăng nhập (email, password)
- Validation
- Gọi `authService.login()`
- Navigate đến Main screens sau khi login thành công
- Link đến Register screen

**`RegisterScreen.tsx`**
- Form đăng ký (email, password, username, role)
- Validation
- Gọi `authService.register()`
- Navigate đến Login screen sau khi đăng ký thành công

#### **Main Screens (13 files)**

**`DashboardScreen.tsx`**
- Hiển thị overview: balance, recent transactions, quick stats
- Cards cho các features: Marketplace, Stocks, Tasks, Games
- Navigate đến các screens khác

**`MarketplaceScreen.tsx`**
- Danh sách products với search, filter, sort
- Product cards với image, name, price, rating
- Navigate đến ProductDetail
- Pull-to-refresh

**`TasksScreen.tsx`**
- Danh sách available tasks
- Task cards với reward, deadline, status
- Claim và complete tasks
- Filter theo status

**`StocksScreen.tsx`**
- Danh sách stocks với current prices, changes
- Real-time price updates
- Navigate đến StockDetail
- Portfolio summary

**`GamesScreen.tsx`**
- Danh sách available games
- Game cards với description, reward
- Navigate đến game screens (TicTacToe, Quiz)
- Leaderboard

**`ProfileScreen.tsx`**
- Hiển thị user profile (avatar, name, email, phone, bio, address, date_of_birth)
- Edit mode với form
- Avatar upload với ImageUploadPicker
- Date picker cho date_of_birth
- Update profile

**`MoreScreen.tsx`**
- Menu với các options: Chat, Social, Messages, Notifications, ExpenseManagement, Tasks, Games
- Navigate đến các screens tương ứng

**`ChatScreen.tsx`**
- AI chat interface
- Chat history với messages
- Input field để gửi message
- Gọi `chatService.sendMessage()` để gửi đến Groq AI
- Back button

**`SocialScreen.tsx`**
- Danh sách discussions
- Create discussion button
- Discussion cards với title, author, comments count, likes
- Navigate đến discussion detail
- Back button

**`MessagesScreen.tsx`**
- Danh sách conversations
- Conversation cards với last message, unread count
- Navigate đến conversation detail
- Back button

**`NotificationsScreen.tsx`**
- Danh sách notifications
- Notification cards với type, message, timestamp
- Mark as read
- Delete notification
- Back button

**`NotificationPreferencesScreen.tsx`**
- Settings cho notification preferences
- Toggle switches cho từng notification type
- Save preferences

**`ExpenseManagementScreen.tsx`**
- Expense analysis với charts
- Category breakdown
- Daily/weekly/monthly trends
- AI insights
- Budget overview
- Back button

#### **Admin Screens (6 files)**

**`AdminDashboardScreen.tsx`**
- Dashboard với stats: total users, products, sales, revenue
- Charts và graphs
- Quick actions

**`AdminProductsScreen.tsx`**
- Danh sách tất cả products
- Create, edit, delete products
- Approve/reject products từ vendors
- Search và filter

**`AdminTasksScreen.tsx`**
- Danh sách tất cả tasks
- Create, edit, delete tasks
- Task validation rules
- Task statistics

**`AdminUsersScreen.tsx`**
- Danh sách tất cả users
- User details
- Update user role
- Ban/unban users
- User statistics

**`AdminGameBuilderScreen.tsx`**
- Game Builder interface
- Create game templates
- Create game instances từ templates
- Manage game content (questions, answers)
- Preview games

**`VoucherManagementScreen.tsx`**
- Danh sách vouchers
- Create, edit, delete vouchers
- Voucher settings (discount, expiry, usage limit)
- Date picker cho expiry date
- Voucher statistics

#### **Vendor Screens (1 file)**

**`VendorProductsScreen.tsx`**
- Danh sách products của vendor
- Create, edit, delete products
- Product status (pending, approved, rejected)
- Product statistics

#### **Detail Screens (9 files)**

**`ProductDetailScreen.tsx`**
- Chi tiết product: images, name, description, price, rating
- Add to cart button
- Reviews và ratings
- Related products
- Apply voucher

**`StockDetailScreen.tsx`**
- Chi tiết stock: name, symbol, current price, change, chart
- Buy/Sell buttons
- Stock history chart
- Stock statistics

**`PortfolioScreen.tsx`**
- Portfolio overview: total value, profit/loss
- List of owned stocks với quantities
- Portfolio performance chart

**`TransactionsScreen.tsx`**
- Danh sách transactions
- Filter theo type, date range
- Transaction details
- Transaction labels

**`PurchaseHistoryScreen.tsx`**
- Lịch sử mua hàng
- Purchase details với products
- Filter theo date
- Reorder functionality

**`ShoppingCartScreen.tsx`**
- Shopping cart items
- Update quantities
- Remove items
- Apply vouchers
- Checkout button
- Total calculation

**`TicTacToeScreen.tsx`**
- TicTacToe game interface
- 3x3 grid
- Player vs AI
- Score tracking
- Game history

**`QuizGameScreen.tsx`**
- Quiz game interface
- Questions và answers
- Score tracking
- Timer
- Results screen

**`VendorShopScreen.tsx`**
- Vendor shop với products
- Vendor information
- Filter products
- Navigate đến product detail

### 📂 Services (20 files)

Services là các API client functions, gọi backend APIs.

**`auth.service.ts`**
- `login()`, `register()`, `logout()`
- `getCurrentUser()`, `isAuthenticated()`
- Store/retrieve JWT token từ AsyncStorage

**`user.service.ts`**
- `getProfile()`, `updateProfile()`
- `getUserById()`, `getAllUsers()`

**`product.service.ts`**
- `getProducts()`, `getProductById()`, `searchProducts()`
- `createProduct()`, `updateProduct()`, `deleteProduct()`
- `getRatings()`, `createRating()`

**`stock.service.ts`**
- `getStocks()`, `getStockById()`, `getStockHistory()`
- `buyStock()`, `sellStock()`
- `getPortfolio()`

**`task.service.ts`**
- `getTasks()`, `getTaskById()`
- `claimTask()`, `completeTask()`
- `getUserTasks()`

**`game.service.ts`**
- `getGames()`, `getGameById()`
- `playGame()`, `getUserGamePlays()`
- `getGameLeaderboard()`

**`shopping-cart.service.ts`**
- `getCart()`, `addToCart()`, `updateCartItem()`, `removeFromCart()`
- `clearCart()`, `checkout()`

**`voucher.service.ts`**
- `getVouchers()`, `getVoucherById()`
- `claimVoucher()`, `applyVoucher()`

**`budget.service.ts`**
- `getBudgets()`, `createBudget()`, `updateBudget()`, `deleteBudget()`
- `getBudgetStats()`

**`chat.service.ts`**
- `sendMessage()`, `getChatHistory()`, `clearChatHistory()`

**`social.service.ts`**
- `getDiscussions()`, `createDiscussion()`, `getDiscussionById()`
- `addComment()`, `likeDiscussion()`

**`messaging.service.ts`**
- `getConversations()`, `getConversation()`
- `sendMessage()`, `markAsRead()`

**`notification.service.ts`**
- `getNotifications()`, `markAsRead()`, `markAllAsRead()`
- `deleteNotification()`, `getNotificationPreferences()`, `updateNotificationPreferences()`

**`recommendation.service.ts`**
- `getRecommendations()`, `getSpendingRecommendations()`, `getInvestingRecommendations()`

**`ai-suggestions.service.ts`**
- `getSuggestions()`, `categorizeTransaction()`, `getExpenseInsights()`

**`purchase-history.service.ts`**
- `getPurchaseHistory()`, `getPurchaseById()`

**`transaction-label.service.ts`**
- `getTransactionLabels()`, `createTransactionLabel()`, `updateTransactionLabel()`
- `deleteTransactionLabel()`, `autoLabelTransaction()`

**`upload.service.ts`**
- `uploadImage()`, `uploadMultipleImages()`, `deleteImage()`

**`vendor.service.ts`**
- `getVendors()`, `getVendorById()`, `getVendorProducts()`
- `getVendorStats()`

**`game-builder.service.ts`**
- `getGameTemplates()`, `createGameTemplate()`, `updateGameTemplate()`
- `getGameInstances()`, `createGameInstance()`
- `getGameContent()`, `createGameContent()`

### 📂 Components (5 files)

**`ImageUploadPicker.tsx`**
- Component để upload image
- Sử dụng `expo-image-picker`
- Preview image
- Upload lên Cloudinary
- Callback với image URL

**`StarRating.tsx`**
- Star rating component
- Display rating (read-only)
- Input rating (editable)
- 5 stars với half-star support

**`NotificationItem.tsx`**
- Notification item component
- Display notification với icon, message, timestamp
- Mark as read button
- Delete button

**`NotificationToast.tsx`**
- Toast notification component
- Hiển thị notification khi có notification mới
- Auto-dismiss
- Tap để navigate đến notification

**`NotificationToastWrapper.tsx`**
- Wrapper component để listen notifications
- Subscribe đến notification events
- Render NotificationToast khi có notification mới

### 📂 Utils (1 file)

**`price.utils.ts`**
- `formatPrice()`: Format price với currency symbol (VND)
- `calculateDiscount()`: Tính discount
- `applyVoucher()`: Áp dụng voucher

---

## AI SERVICE MODULE

### 📁 Cấu trúc thư mục
```
ai-service/
├── src/
│   ├── index.ts                    # Entry point của AI service
│   ├── ml/                         # Machine Learning models (7 files)
│   └── recommendation/             # Recommendation engines (4 files)
├── models/                         # Trained model files (JSON)
└── package.json
```

### 🔧 File chính

#### **`ai-service/src/index.ts`**
**Công dụng**: Entry point của AI service, Express server cho AI endpoints.

**Chức năng**:
- Khởi tạo Express app
- Load ML models từ storage khi startup
- Định nghĩa API endpoints:
  - `/recommendations/spending` - Spending recommendations
  - `/recommendations/investing` - Investing recommendations
  - `/categorize-transaction` - Transaction categorization
  - `/suggestions/items` - Item suggestions
  - `/insights/expense` - Expense insights
  - `/ml/recommendations` - ML-based product recommendations
  - `/ml/train` - Train ML models
  - `/ml/models` - List available models
  - `/ml/models/:modelType` - Get model info
- Error handling và 404 handler

### 📂 ML Models (7 files)

#### **`ml/types.ts`**
**Công dụng**: TypeScript types cho ML models.

**Types**:
- `UserProfile`: User profile với preferences, purchase history, ratings
- `Product`: Product với features (category, price, rating, etc.)
- `Recommendation`: Recommendation result với score, reason
- `ModelState`: State của trained model
- `ModelMetadata`: Metadata của model (version, accuracy, etc.)

#### **`ml/content-based.ts`**
**Công dụng**: Content-Based Filtering model.

**Chức năng**:
- `train()`: Train model với user profiles và products
- `recommend()`: Recommend products dựa trên user preferences
- `loadState()` / `saveState()`: Load/save model state
- Sử dụng TF-IDF để tính similarity giữa products
- Cosine similarity để match user preferences với products

**Algorithm**:
1. Extract features từ products (category, price range, rating, etc.)
2. Build user profile từ purchase history và ratings
3. Calculate similarity giữa user profile và products
4. Recommend top N products với highest similarity

#### **`ml/collaborative-filtering.ts`**
**Công dụng**: Collaborative Filtering model.

**Chức năng**:
- `train()`: Train model với user-item matrix
- `recommend()`: Recommend products dựa trên similar users
- `loadState()` / `saveState()`: Load/save model state
- Sử dụng User-Item Matrix và Cosine Similarity

**Algorithm**:
1. Build User-Item Matrix từ purchase history và ratings
2. Calculate similarity giữa users (Cosine Similarity)
3. Find similar users
4. Recommend products mà similar users đã mua/rate cao

#### **`ml/hybrid-recommender.ts`**
**Công dụng**: Hybrid Recommender kết hợp Content-Based và Collaborative Filtering.

**Chức năng**:
- `train()`: Train cả 2 models và combine
- `recommend()`: Recommend với weighted combination
- `loadState()` / `saveState()`: Load/save model state
- Weighted average của 2 models (default: 60% collaborative, 40% content-based)

**Algorithm**:
1. Get recommendations từ Content-Based model
2. Get recommendations từ Collaborative Filtering model
3. Combine với weighted average
4. Return top N recommendations

#### **`ml/model-storage.ts`**
**Công dụng**: Quản lý storage cho trained models.

**Chức năng**:
- `saveModel()`: Save model state và metadata vào file JSON
- `loadLatestModel()`: Load latest model của type
- `listModels()`: List tất cả available models
- Models được lưu trong `models/` directory với format:
  - `{modelType}_{timestamp}_{date}.json`
  - `{modelType}_latest.json` (symlink đến latest)

#### **`ml/train-simple.ts`**
**Công dụng**: Training script cho ML models.

**Chức năng**:
- Fetch data từ backend API (users, products, purchases, ratings)
- Train models (content-based, collaborative, hybrid)
- Save trained models
- Log training progress và metrics

**Usage**:
```bash
npm run train                    # Train all models
npm run train:content           # Train content-based only
npm run train:collaborative     # Train collaborative only
npm run train:hybrid            # Train hybrid only
```

#### **`ml/train.ts`**
**Công dụng**: Advanced training script (có thể có thêm features).

### 📂 Recommendation Engines (4 files)

#### **`recommendation/engine.ts`**
**Công dụng**: Rule-based recommendation engine.

**Chức năng**:
- `getSpendingRecommendations()`: Recommend products/games để tiêu tiền
  - Dựa trên balance, recent transactions, available products/games
  - Recommend products trong budget
  - Recommend popular products
  - Recommend games với rewards
- `getInvestingRecommendations()`: Recommend stocks để đầu tư
  - Dựa trên balance, portfolio, stock performance
  - Recommend undervalued stocks
  - Recommend trending stocks
  - Recommend stocks phù hợp với risk profile

#### **`recommendation/categorization.ts`**
**Công dụng**: Transaction categorization engine.

**Chức năng**:
- `categorizeTransaction()`: Phân loại transaction vào category
  - Dựa trên transaction description, amount, merchant
  - Sử dụng keyword matching
  - Sử dụng user history
  - Return category và confidence score

**Categories**:
- Food & Dining
- Shopping
- Entertainment
- Transportation
- Bills & Utilities
- Education
- Health & Fitness
- Others

#### **`recommendation/suggestions.ts`**
**Công dụng**: Item suggestions engine.

**Chức năng**:
- `getItemSuggestions()`: Suggest items cho user
  - Dựa trên purchase history
  - Dựa trên transaction patterns
  - Suggest complementary products
  - Suggest popular products trong category user thích

#### **`recommendation/expense-insights.ts`**
**Công dụng**: Expense insights và predictions.

**Chức năng**:
- `getExpenseInsights()`: Generate insights về chi tiêu
  - Total spending, earnings, net amount
  - Category breakdown
  - Spending trends
  - Alerts (overspending, unusual patterns)
  - Recommendations (save money, reduce spending)
- `predictFutureSpending()`: Predict spending trong tương lai
  - Sử dụng Linear Regression
  - Dựa trên daily/weekly trends
  - Return predicted spending cho N days ahead

---

## DATABASE MIGRATIONS

### 📁 Cấu trúc
```
supabase/migrations/
├── 20250101000000_initial_schema.sql
├── 20250102000000_add_games_and_stock_history.sql
├── 20250103000000_add_vendor_role.sql
├── 20250104000000_game_builder_system.sql
├── 20250105000000_fix_user_game_plays_foreign_key.sql
├── 20250106000000_add_product_ratings.sql
├── 20250107000000_add_transaction_labeling_and_cart.sql
├── 20250108000000_add_product_discounts.sql
├── 20250109000000_add_notification_system.sql
├── 20250110000000_add_task_validation_rules.sql
├── 20250111000000_add_voucher_system.sql
├── 20250111000001_add_voucher_claimable_feature.sql
├── 20250111000002_add_voucher_featured_and_auto_hide.sql
├── 20250111000003_add_product_random_voucher_ids.sql
├── 20250112000000_add_budget_system.sql
├── 20250113000000_add_chat_system.sql
├── 20250114000000_add_social_discussion_system.sql
├── 20250115000000_add_direct_messaging_system.sql
├── 20250116000000_disable_messaging_rls.sql
└── 20250117000000_add_user_profile_fields.sql
```

### 📝 Migration Files

**`20250101000000_initial_schema.sql`**
- Tạo các tables cơ bản: users, products, tasks, stocks, transactions, etc.
- Định nghĩa primary keys, foreign keys, indexes
- Setup Row Level Security (RLS) policies

**`20250102000000_add_games_and_stock_history.sql`**
- Thêm game tables: games, user_game_plays
- Thêm stock_history table để lưu lịch sử giá
- Thêm indexes cho performance

**`20250103000000_add_vendor_role.sql`**
- Thêm vendor role vào users table
- Thêm vendor_id vào products table
- Thêm vendor-specific fields

**`20250104000000_game_builder_system.sql`**
- Thêm game_template, game_instance, game_content tables
- Support cho low-code game builder

**`20250105000000_fix_user_game_plays_foreign_key.sql`**
- Fix foreign key constraints cho user_game_plays

**`20250106000000_add_product_ratings.sql`**
- Thêm product_ratings table
- Thêm rating fields vào products table (average_rating, total_ratings)

**`20250107000000_add_transaction_labeling_and_cart.sql`**
- Thêm transaction_labels table
- Thêm shopping_cart, shopping_cart_items tables

**`20250108000000_add_product_discounts.sql`**
- Thêm discount fields vào products table
- Thêm discount_rules table

**`20250109000000_add_notification_system.sql`**
- Thêm notifications table
- Thêm notification_preferences table

**`20250110000000_add_task_validation_rules.sql`**
- Thêm task_validation_rules table
- Support cho task validation logic

**`20250111000000_add_voucher_system.sql`**
- Thêm vouchers table
- Thêm user_vouchers table (junction table)

**`20250111000001_add_voucher_claimable_feature.sql`**
- Thêm claimable fields vào vouchers

**`20250111000002_add_voucher_featured_and_auto_hide.sql`**
- Thêm featured và auto_hide fields

**`20250111000003_add_product_random_voucher_ids.sql`**
- Thêm random_voucher_ids vào products (array)

**`20250112000000_add_budget_system.sql`**
- Thêm budgets table
- Thêm budget_categories table

**`20250113000000_add_chat_system.sql`**
- Thêm chat_messages table
- Lưu lịch sử chat với AI

**`20250114000000_add_social_discussion_system.sql`**
- Thêm discussions, discussion_comments, discussion_likes tables

**`20250115000000_add_direct_messaging_system.sql`**
- Thêm conversations, messages tables
- Support cho direct messaging giữa users

**`20250116000000_disable_messaging_rls.sql`**
- Disable RLS cho messaging tables (nếu cần)

**`20250117000000_add_user_profile_fields.sql`**
- Thêm profile fields vào users: avatar_url, phone, bio, address, date_of_birth

---

## SCRIPTS VÀ UTILITIES

### 📁 Scripts Directory
```
scripts/
├── create-env.ps1                 # PowerShell script tạo .env files
├── export-diagrams.ps1            # Export Mermaid diagrams thành PNG/SVG
├── export-diagrams.sh             # Bash version của export-diagrams
├── md_to_html.py                  # Convert Markdown thành HTML
├── seed-products.sql              # Seed data cho products
├── setup.js                       # Setup script
├── test-api.ps1                   # Test API endpoints
├── test-api.sh                    # Bash version của test-api
└── test-discount.ps1              # Test discount system
```

### 📝 Script Files

**`create-env.ps1`**
- Tạo `.env` files cho backend, frontend, ai-service
- Prompt user cho các environment variables
- Validate inputs

**`export-diagrams.ps1`**
- Export Mermaid diagrams từ `SYSTEM_DESIGN.md` thành PNG/SVG
- Sử dụng `mmdc` (Mermaid CLI)
- Output vào `docs/diagrams/`

**`md_to_html.py`**
- Convert Markdown files thành HTML
- Parse Mermaid code blocks
- Generate HTML với syntax highlighting
- Output `SYSTEM_DESIGN.html`

**`seed-products.sql`**
- SQL script để seed sample products vào database
- Dùng cho development/testing

**`setup.js`**
- Setup script để initialize project
- Install dependencies
- Create .env files
- Run migrations

**`test-api.ps1` / `test-api.sh`**
- Test API endpoints
- Check health endpoints
- Validate responses

**`test-discount.ps1`**
- Test discount system
- Validate discount calculations
- Test voucher application

---

## CONFIGURATION FILES

### 📝 Root Level Files

**`package.json` (root)**
- Project metadata
- Scripts để run các services:
  - `npm run dev:backend` - Run backend
  - `npm run dev:frontend` - Run frontend
  - `npm run dev:ai` - Run AI service
  - `npm run setup` - Setup project

**`README.md`**
- Project documentation
- Setup instructions
- Usage guide

**`.env` files (không commit)**
- Environment variables cho từng service
- Secrets và API keys

### 📝 Backend Configuration

**`backend/package.json`**
- Backend dependencies:
  - `express` - Web framework
  - `@supabase/supabase-js` - Supabase client
  - `jsonwebtoken` - JWT authentication
  - `bcryptjs` - Password hashing
  - `multer` - File upload
  - `groq-sdk` - Groq AI integration
  - `firebase-admin` - Firebase notifications
  - `zod` - Schema validation

**`backend/tsconfig.json`**
- TypeScript configuration
- Compiler options
- Path aliases

**`backend/nodemon.json`**
- Nodemon configuration cho development
- Watch files, ignore patterns

### 📝 Frontend Configuration

**`frontend/package.json`**
- Frontend dependencies:
  - `expo` - Expo framework
  - `react-native` - React Native
  - `@react-navigation/*` - Navigation
  - `@tanstack/react-query` - Data fetching
  - `axios` - HTTP client
  - `expo-image-picker` - Image picker
  - `@react-native-community/datetimepicker` - Date picker
  - `firebase` - Firebase SDK
  - `react-native-chart-kit` - Charts

**`frontend/tsconfig.json`**
- TypeScript configuration
- Path aliases

**`frontend/babel.config.js`**
- Babel configuration
- Module resolver
- Expo plugins

**`frontend/app.json`**
- Expo app configuration
- App name, version, icons, splash screen

### 📝 AI Service Configuration

**`ai-service/package.json`**
- AI service dependencies:
  - `express` - Web framework
  - `ml-matrix` - Matrix operations cho ML
  - `simple-statistics` - Statistics functions
  - `natural` - NLP library (TF-IDF, tokenization)
  - `axios` - HTTP client

**`ai-service/tsconfig.json`**
- TypeScript configuration

### 📝 Supabase Configuration

**`supabase/config.toml`**
- Supabase local development configuration
- Database settings
- API settings

---

## TỔNG KẾT

### Số lượng files theo module:

**Backend**:
- Controllers: 25 files
- Routes: 24 files
- Services: 10 files
- Middleware: 2 files
- Utils: 5 files
- Config: 1 file
- **Tổng: ~67 files**

**Frontend**:
- Screens: 31 files
- Services: 20 files
- Components: 5 files
- Navigation: 1 file
- Context: 1 file
- Config: 1 file
- Utils: 1 file
- **Tổng: ~60 files**

**AI Service**:
- ML Models: 7 files
- Recommendation Engines: 4 files
- Index: 1 file
- **Tổng: ~12 files**

**Database**:
- Migrations: 21 files

**Scripts**:
- ~9 files

**Tổng cộng**: ~169 files code (không tính node_modules, dist, docs)

### Kiến trúc tổng thể:

1. **Backend** (Node.js/Express) xử lý business logic, database operations, authentication
2. **Frontend** (React Native/Expo) cung cấp UI/UX cho users
3. **AI Service** (Express) xử lý ML models và recommendations
4. **Database** (PostgreSQL/Supabase) lưu trữ data
5. **External Services**: Cloudinary (images), Groq (AI chat), Firebase (notifications)

### Data Flow:

1. User tương tác với Frontend
2. Frontend gọi Backend API qua HTTP
3. Backend xử lý request, tương tác với Database
4. Backend có thể gọi AI Service cho recommendations
5. Backend trả về response cho Frontend
6. Frontend cập nhật UI

---

**Tài liệu này cung cấp giải thích chi tiết về tất cả các file code và công dụng của chúng trong project HMall. Mỗi file đều có vai trò cụ thể trong hệ thống và góp phần tạo nên một ứng dụng hoàn chỉnh.**














