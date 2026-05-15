# Hướng Dẫn Triển Khai Hệ Thống Low-Code/No-Code Game Builder

## Tổng Quan
Hệ thống cho phép Admin tạo các game/task tùy chỉnh để user hoàn thành, không cần lập trình.

## Các Thành Phần Cần Triển Khai

### 1. Database Schema (Đã tạo migration file)
**File**: `supabase/migrations/20250104000000_game_builder_system.sql`

**Các bảng cần tạo**:
- `game_templates`: Template game có sẵn (Quiz, Memory Match, etc.)
- `game_instances`: Game được admin tạo từ template
- `game_content`: Nội dung game (câu hỏi, thẻ bài, etc.)
- `game_assets`: Tài nguyên (ảnh, âm thanh)
- `game_sessions`: Theo dõi phiên chơi game

### 2. Backend API

#### 2.1 Game Template APIs
- `GET /api/admin/game-templates` - Danh sách templates
- `GET /api/admin/game-templates/:id` - Chi tiết template
- `POST /api/admin/game-templates` - Tạo template mới (super admin)
- `PUT /api/admin/game-templates/:id` - Cập nhật template
- `DELETE /api/admin/game-templates/:id` - Xóa template

#### 2.2 Game Instance APIs
- `GET /api/admin/games` - Danh sách game instances
- `GET /api/admin/games/:id` - Chi tiết game
- `POST /api/admin/games` - Tạo game mới
- `PUT /api/admin/games/:id` - Cập nhật game
- `DELETE /api/admin/games/:id` - Xóa game
- `POST /api/admin/games/:id/validate` - Validate cấu hình
- `POST /api/admin/games/:id/preview` - Preview game

#### 2.3 Game Content APIs
- `GET /api/admin/games/:id/content` - Lấy nội dung game
- `POST /api/admin/games/:id/content` - Thêm nội dung
- `PUT /api/admin/games/:id/content/:contentId` - Cập nhật nội dung
- `DELETE /api/admin/games/:id/content/:contentId` - Xóa nội dung
- `POST /api/admin/games/:id/content/reorder` - Sắp xếp lại thứ tự

#### 2.4 Asset APIs
- `POST /api/admin/games/:id/assets` - Upload asset
- `GET /api/admin/games/:id/assets` - Danh sách assets
- `DELETE /api/admin/games/:id/assets/:assetId` - Xóa asset

#### 2.5 User Game Play APIs
- `GET /api/games` - Danh sách game (user)
- `GET /api/games/:id` - Chi tiết game
- `POST /api/games/:id/play` - Bắt đầu chơi
- `POST /api/games/:id/submit` - Nộp kết quả
- `GET /api/games/:id/leaderboard` - Bảng xếp hạng

### 3. Game Engine (Runtime)

#### 3.1 Core Components
- **Game Loader**: Load cấu hình và assets
- **Config Parser**: Parse và validate config
- **State Manager**: Quản lý trạng thái game
- **Score Calculator**: Tính điểm
- **Rule Engine**: Thực thi luật chơi

#### 3.2 Game Renderers
- **QuizRenderer**: Render quiz game
- **MemoryMatchRenderer**: Render memory match
- **TriviaRenderer**: Render trivia
- **WordGameRenderer**: Render word games
- **GenericRenderer**: Renderer tổng quát

### 4. Admin UI Components

#### 4.1 Game Builder Screen
- Template selector
- Configuration form (dynamic)
- Content editor
- Asset manager
- Preview panel

#### 4.2 Components Cần Tạo
- `GameTemplateSelector.tsx` - Chọn template
- `GameConfigForm.tsx` - Form cấu hình động
- `ContentEditor.tsx` - Editor nội dung
- `AssetManager.tsx` - Quản lý assets
- `GamePreview.tsx` - Preview game

### 5. User Game Components

#### 5.1 Game Play Screens
- `GameLoader.tsx` - Load game
- `GameRenderer.tsx` - Render game động
- `QuizGameScreen.tsx` - Màn hình quiz
- `MemoryMatchScreen.tsx` - Màn hình memory match
- `GameResultScreen.tsx` - Màn hình kết quả

## Các Bước Triển Khai

### Bước 1: Database Setup
1. Chạy migration file: `20250104000000_game_builder_system.sql`
2. Verify các bảng đã được tạo
3. Test insert/select data

### Bước 2: Backend APIs
1. Tạo controllers:
   - `game-template.controller.ts`
   - `game-instance.controller.ts`
   - `game-content.controller.ts`
   - `game-asset.controller.ts`
2. Tạo routes:
   - `game-template.routes.ts`
   - `game-instance.routes.ts`
3. Tạo services:
   - `game-engine.service.ts`
   - `config-validator.service.ts`

### Bước 3: Game Engine
1. Implement game loader
2. Implement config parser
3. Implement state manager
4. Implement score calculator

### Bước 4: Admin UI
1. Tạo Game Builder screen
2. Implement template selector
3. Implement dynamic form builder
4. Implement content editor
5. Implement preview

### Bước 5: User Game UI
1. Tạo game list screen
2. Implement game loader
3. Implement game renderers
4. Implement result screen

### Bước 6: Testing
1. Test tạo game từ template
2. Test chơi game
3. Test scoring và rewards
4. Test validation

## Ví Dụ: Quiz Game

### Template Configuration
```json
{
  "type": "quiz",
  "name": "Quiz Game",
  "configSchema": {
    "timeLimit": {"type": "number", "default": 60},
    "questionsPerGame": {"type": "number", "default": 10}
  }
}
```

### Game Instance (Admin tạo)
```json
{
  "templateId": "quiz-template-id",
  "name": "Math Quiz",
  "config": {
    "timeLimit": 120,
    "questionsPerGame": 15
  },
  "rewardAmount": 50
}
```

### Game Content (Câu hỏi)
```json
[
  {
    "type": "question",
    "question": "2 + 2 = ?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": 1,
    "points": 10
  }
]
```

## Ưu Tiên Triển Khai

### MVP (Minimum Viable Product)
1. ✅ Database schema
2. ✅ Basic APIs (CRUD)
3. ✅ Quiz game template
4. ✅ Admin UI cơ bản
5. ✅ User game play

### Phase 2
1. Memory match template
2. Trivia template
3. Asset management
4. Preview feature

### Phase 3
1. Visual builder
2. Advanced templates
3. Analytics
4. Leaderboard

## Lưu Ý Kỹ Thuật

### Security
- Validate tất cả config
- Sanitize user input
- Rate limiting
- Prevent cheating

### Performance
- Cache game configs
- Lazy load components
- Optimize asset loading
- Database indexing

### Scalability
- Support nhiều game types
- Extensible architecture
- Plugin system
- API versioning

## Tài Liệu Tham Khảo
- `docs/LOWCODE_GAME_BUILDER.md` - Chi tiết thiết kế
- `docs/LOWCODE_GAME_BUILDER_ARCHITECTURE.md` - Kiến trúc và diagrams
- `supabase/migrations/20250104000000_game_builder_system.sql` - Database schema







