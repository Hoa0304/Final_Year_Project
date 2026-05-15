# Low-Code/No-Code Game Builder System Design

## Overview
A system that allows admins to create custom games/tasks for users to complete, without requiring programming knowledge.

## Core Components

### 1. Game Template System
**Purpose**: Pre-built game templates that admins can customize

**Templates**:
- **Quiz Game**: Multiple choice questions, true/false
- **Memory Match**: Card matching game
- **Puzzle Game**: Drag and drop, jigsaw puzzles
- **Trivia Game**: Question-answer format
- **Mini Adventure**: Story-based choices
- **TicTacToe**: Already implemented
- **Word Game**: Word search, crossword, hangman

### 2. Game Builder UI (Admin Panel)
**Features**:
- Visual drag-and-drop interface
- Form-based configuration
- Live preview
- Template selection
- Asset upload (images, sounds)

### 3. Game Configuration Schema
**Database Structure**:
```sql
-- Game Templates
CREATE TABLE game_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'quiz', 'memory', 'puzzle', etc.
    description TEXT,
    config_schema JSONB, -- JSON schema for configuration
    default_config JSONB, -- Default configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game Instances (created by admin)
CREATE TABLE game_instances (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES game_templates(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL, -- Game-specific configuration
    reward_amount DECIMAL(10, 2) DEFAULT 0,
    max_plays_per_day INTEGER DEFAULT 10,
    difficulty_level VARCHAR(20), -- 'easy', 'medium', 'hard'
    estimated_duration INTEGER, -- in seconds
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Game Assets (images, sounds, etc.)
CREATE TABLE game_assets (
    id UUID PRIMARY KEY,
    game_instance_id UUID REFERENCES game_instances(id),
    asset_type VARCHAR(50), -- 'image', 'sound', 'video'
    asset_url VARCHAR(500),
    metadata JSONB, -- Additional metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game Questions/Content (for quiz, trivia, etc.)
CREATE TABLE game_content (
    id UUID PRIMARY KEY,
    game_instance_id UUID REFERENCES game_instances(id),
    content_type VARCHAR(50), -- 'question', 'card', 'puzzle_piece'
    content_data JSONB NOT NULL, -- Flexible content structure
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Game Engine (Runtime)
**Components**:
- **Game Loader**: Loads game configuration and assets
- **Game Renderer**: Renders game UI based on template
- **Game Logic**: Executes game rules
- **Score Calculator**: Calculates scores/rewards
- **Progress Tracker**: Tracks user progress

### 5. Configuration Examples

#### Quiz Game Configuration
```json
{
  "type": "quiz",
  "settings": {
    "timeLimit": 60,
    "questionsPerGame": 10,
    "shuffleQuestions": true,
    "showCorrectAnswer": true
  },
  "questions": [
    {
      "id": 1,
      "question": "What is the capital of France?",
      "type": "multiple_choice",
      "options": ["London", "Berlin", "Paris", "Madrid"],
      "correctAnswer": 2,
      "points": 10
    }
  ],
  "scoring": {
    "correctAnswer": 10,
    "wrongAnswer": 0,
    "timeBonus": true
  }
}
```

#### Memory Match Configuration
```json
{
  "type": "memory_match",
  "settings": {
    "gridSize": "4x4",
    "timeLimit": 120,
    "flipDelay": 1000
  },
  "cards": [
    {
      "id": 1,
      "frontImage": "url1",
      "backImage": "url2",
      "pairId": 1
    }
  ],
  "scoring": {
    "matchFound": 5,
    "timeBonus": true
  }
}
```

## Implementation Phases

### Phase 1: Foundation
1. **Database Schema**
   - Create `game_templates` table
   - Create `game_instances` table
   - Create `game_assets` table
   - Create `game_content` table

2. **Backend API**
   - CRUD for game templates
   - CRUD for game instances
   - Game configuration validation
   - Asset upload endpoints

3. **Admin UI - Basic**
   - List game templates
   - Create game instance from template
   - Basic form-based configuration
   - Preview game

### Phase 2: Game Templates
1. **Implement Core Templates**
   - Quiz Game
   - Memory Match
   - Trivia Game

2. **Game Engine**
   - Template loader
   - Configuration parser
   - Game state management
   - Score calculation

3. **Frontend Game Renderer**
   - Dynamic game component loader
   - Template-specific renderers
   - Game interaction handlers

### Phase 3: Advanced Features
1. **Visual Builder**
   - Drag-and-drop interface
   - Live preview
   - Asset library
   - Theme customization

2. **Advanced Templates**
   - Puzzle games
   - Word games
   - Story-based games

3. **Analytics**
   - Game performance metrics
   - User engagement stats
   - Completion rates

### Phase 4: No-Code Features
1. **Conditional Logic Builder**
   - Visual flow builder
   - If-then-else conditions
   - Variable management

2. **Custom Actions**
   - Reward configuration
   - Unlock conditions
   - Achievement system

3. **Integration**
   - External API calls
   - Webhook support
   - Third-party services

## Technical Stack

### Backend
- **Node.js + Express**: API server
- **PostgreSQL (Supabase)**: Database
- **JSON Schema**: Configuration validation
- **File Storage**: Asset management (Supabase Storage)

### Frontend
- **React Native**: Mobile app
- **React**: Admin panel (web)
- **Game Libraries**:
  - `react-native-game-engine`: Game engine
  - `react-native-svg`: Graphics
  - `react-native-reanimated`: Animations

### Admin Panel
- **React + TypeScript**: Web interface
- **Form Builder**: `react-hook-form` + `react-jsonschema-form`
- **Drag & Drop**: `react-beautiful-dnd` or `@dnd-kit/core`
- **Code Editor**: `monaco-editor` (for advanced users)

## Key Features to Implement

### 1. Template System
- Pre-built game templates
- Template marketplace
- Custom template creation (for advanced admins)

### 2. Configuration UI
- **Form Builder**: Dynamic forms based on template schema
- **Visual Editor**: Drag-and-drop for layout
- **Code Editor**: JSON editor for advanced configuration
- **Preview Mode**: Real-time preview

### 3. Content Management
- Question bank
- Asset library
- Media upload
- Content versioning

### 4. Game Logic Engine
- Rule engine
- Scoring system
- Progress tracking
- State management

### 5. Analytics & Reporting
- Game performance
- User engagement
- Completion rates
- Reward distribution

## Database Schema Details

### game_templates
```sql
CREATE TABLE game_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    config_schema JSONB NOT NULL, -- JSON Schema for validation
    default_config JSONB NOT NULL,
    ui_config JSONB, -- UI configuration for builder
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### game_instances
```sql
CREATE TABLE game_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES game_templates(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    reward_amount DECIMAL(10, 2) DEFAULT 0,
    max_plays_per_day INTEGER DEFAULT 10,
    difficulty_level VARCHAR(20),
    estimated_duration INTEGER,
    category VARCHAR(100),
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### game_content
```sql
CREATE TABLE game_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_instance_id UUID REFERENCES game_instances(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    content_data JSONB NOT NULL,
    order_index INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_content_game_instance ON game_content(game_instance_id);
CREATE INDEX idx_game_content_order ON game_content(game_instance_id, order_index);
```

## API Endpoints

### Game Templates
- `GET /api/admin/game-templates` - List all templates
- `GET /api/admin/game-templates/:id` - Get template details
- `POST /api/admin/game-templates` - Create template (super admin only)
- `PUT /api/admin/game-templates/:id` - Update template
- `DELETE /api/admin/game-templates/:id` - Delete template

### Game Instances
- `GET /api/admin/games` - List all game instances
- `GET /api/admin/games/:id` - Get game instance
- `POST /api/admin/games` - Create game instance
- `PUT /api/admin/games/:id` - Update game instance
- `DELETE /api/admin/games/:id` - Delete game instance
- `POST /api/admin/games/:id/validate` - Validate configuration
- `POST /api/admin/games/:id/preview` - Generate preview data

### Game Content
- `GET /api/admin/games/:id/content` - Get game content
- `POST /api/admin/games/:id/content` - Add content item
- `PUT /api/admin/games/:id/content/:contentId` - Update content
- `DELETE /api/admin/games/:id/content/:contentId` - Delete content
- `POST /api/admin/games/:id/content/reorder` - Reorder content

### Assets
- `POST /api/admin/games/:id/assets` - Upload asset
- `GET /api/admin/games/:id/assets` - List assets
- `DELETE /api/admin/games/:id/assets/:assetId` - Delete asset

### User Game Play
- `GET /api/games` - List available games (user)
- `GET /api/games/:id` - Get game details
- `POST /api/games/:id/play` - Start game session
- `POST /api/games/:id/submit` - Submit game result
- `GET /api/games/:id/leaderboard` - Get leaderboard

## Frontend Components

### Admin Panel Components
1. **GameTemplateSelector**: Select template
2. **GameConfigForm**: Dynamic form based on schema
3. **ContentEditor**: Edit game content
4. **AssetManager**: Upload/manage assets
5. **GamePreview**: Preview game
6. **GameList**: List all games

### User Game Components
1. **GameLoader**: Load game configuration
2. **GameRenderer**: Render game based on type
3. **QuizGame**: Quiz game component
4. **MemoryMatchGame**: Memory match component
5. **TriviaGame**: Trivia component
6. **GameResult**: Show results

## Implementation Priority

### High Priority (MVP)
1. ✅ Database schema
2. ✅ Basic API endpoints
3. ✅ Quiz game template
4. ✅ Admin UI for creating quiz games
5. ✅ User game play interface

### Medium Priority
1. Memory match template
2. Trivia template
3. Asset management
4. Game preview
5. Analytics dashboard

### Low Priority
1. Visual builder
2. Advanced templates
3. Custom logic builder
4. Template marketplace
5. Advanced analytics

## Example: Quiz Game Implementation

### Template Configuration
```json
{
  "type": "quiz",
  "name": "Quiz Game",
  "configSchema": {
    "type": "object",
    "properties": {
      "timeLimit": {
        "type": "number",
        "title": "Time Limit (seconds)",
        "default": 60
      },
      "questionsPerGame": {
        "type": "number",
        "title": "Questions Per Game",
        "default": 10
      },
      "shuffleQuestions": {
        "type": "boolean",
        "title": "Shuffle Questions",
        "default": true
      }
    }
  }
}
```

### Game Instance Configuration
```json
{
  "templateId": "quiz-template-id",
  "name": "Math Quiz",
  "config": {
    "timeLimit": 120,
    "questionsPerGame": 15,
    "shuffleQuestions": true
  },
  "rewardAmount": 50,
  "maxPlaysPerDay": 5
}
```

## Next Steps

1. **Design Database Schema**: Create migration files
2. **Implement Backend APIs**: CRUD operations
3. **Create Admin UI**: Game builder interface
4. **Implement Game Engine**: Runtime execution
5. **Build Game Templates**: Start with Quiz
6. **User Interface**: Game play screens
7. **Testing**: Comprehensive testing
8. **Documentation**: User guides

## Considerations

### Security
- Validate all game configurations
- Sanitize user inputs
- Rate limiting for game plays
- Prevent cheating

### Performance
- Cache game configurations
- Optimize asset loading
- Lazy load game components
- Database indexing

### Scalability
- Support multiple game types
- Extensible template system
- Plugin architecture
- API versioning

### User Experience
- Intuitive admin interface
- Smooth game play
- Clear instructions
- Progress feedback

