# Low-Code/No-Code Game Builder - Architecture Diagram

## System Architecture

```mermaid
graph TB
    subgraph "Admin Panel (Web)"
        A[Game Builder UI]
        B[Template Selector]
        C[Config Form Builder]
        D[Content Editor]
        E[Asset Manager]
        F[Preview Engine]
    end

    subgraph "Backend API"
        G[Game Template API]
        H[Game Instance API]
        I[Content API]
        J[Asset API]
        K[Validation Service]
        L[Game Engine]
    end

    subgraph "Database"
        M[(game_templates)]
        N[(game_instances)]
        O[(game_content)]
        P[(game_assets)]
        Q[(game_sessions)]
    end

    subgraph "Mobile App"
        R[Game Loader]
        S[Game Renderer]
        T[Quiz Component]
        U[Memory Match Component]
        V[Trivia Component]
    end

    A --> B
    A --> C
    A --> D
    A --> E
    A --> F
    B --> G
    C --> H
    D --> I
    E --> J
    F --> L

    G --> M
    H --> N
    I --> O
    J --> P
    L --> Q

    R --> H
    R --> L
    S --> T
    S --> U
    S --> V
```

## Data Flow

### 1. Admin Creates Game
```mermaid
sequenceDiagram
    participant A as Admin
    participant UI as Builder UI
    participant API as Backend API
    participant DB as Database
    participant V as Validator

    A->>UI: Select Template
    UI->>API: GET /templates/:id
    API->>DB: Fetch template
    DB-->>API: Template + schema
    API-->>UI: Template config

    A->>UI: Fill Configuration Form
    UI->>API: POST /games (with config)
    API->>V: Validate config against schema
    V-->>API: Validation result
    
    alt Valid
        API->>DB: Create game_instance
        DB-->>API: Game created
        API-->>UI: Success + game ID
        UI->>A: Show success
    else Invalid
        API-->>UI: Validation errors
        UI->>A: Show errors
    end

    A->>UI: Add Content (Questions, Cards)
    UI->>API: POST /games/:id/content
    API->>DB: Save content
    DB-->>API: Content saved
    API-->>UI: Success

    A->>UI: Upload Assets
    UI->>API: POST /games/:id/assets
    API->>DB: Save asset metadata
    DB-->>API: Asset saved
    API-->>UI: Success

    A->>UI: Preview Game
    UI->>API: GET /games/:id/preview
    API->>DB: Fetch game + content
    DB-->>API: Game data
    API-->>UI: Preview data
    UI->>A: Show preview
```

### 2. User Plays Game
```mermaid
sequenceDiagram
    participant U as User
    participant App as Mobile App
    participant API as Backend API
    participant Engine as Game Engine
    participant DB as Database

    U->>App: Select Game
    App->>API: GET /games/:id
    API->>DB: Fetch game instance
    DB-->>API: Game config
    API->>DB: Fetch game content
    DB-->>API: Content items
    API-->>App: Game data

    App->>Engine: Load Game
    Engine->>App: Render Game UI

    U->>App: Play Game
    App->>Engine: Update Game State
    Engine->>App: Update UI

    U->>App: Complete Game
    App->>Engine: Calculate Score
    Engine->>App: Score + Result

    App->>API: POST /games/:id/submit
    API->>Engine: Validate Result
    Engine-->>API: Valid
    API->>DB: Save game session
    API->>DB: Update user balance
    DB-->>API: Success
    API-->>App: Reward + Success
    App->>U: Show Result
```

## Component Diagram

```mermaid
graph LR
    subgraph "Game Builder Components"
        A1[TemplateSelector]
        A2[ConfigForm]
        A3[ContentEditor]
        A4[AssetUploader]
        A5[GamePreview]
    end

    subgraph "Game Engine Components"
        B1[GameLoader]
        B2[ConfigParser]
        B3[StateManager]
        B4[ScoreCalculator]
        B5[RuleEngine]
    end

    subgraph "Game Renderers"
        C1[QuizRenderer]
        C2[MemoryMatchRenderer]
        C3[TriviaRenderer]
        C4[WordGameRenderer]
    end

    A1 --> B1
    A2 --> B2
    A3 --> B1
    A4 --> B1
    A5 --> B1

    B1 --> B2
    B2 --> B3
    B3 --> B4
    B3 --> B5

    B1 --> C1
    B1 --> C2
    B1 --> C3
    B1 --> C4
```

## Database ERD

```mermaid
erDiagram
    GAME_TEMPLATES ||--o{ GAME_INSTANCES : "uses"
    GAME_INSTANCES ||--o{ GAME_CONTENT : "contains"
    GAME_INSTANCES ||--o{ GAME_ASSETS : "has"
    GAME_INSTANCES ||--o{ GAME_SESSIONS : "played_in"
    USERS ||--o{ GAME_INSTANCES : "creates"
    USERS ||--o{ GAME_SESSIONS : "plays"
    GAMES ||--o{ GAME_INSTANCES : "extends"

    GAME_TEMPLATES {
        uuid id PK
        string name
        string type
        jsonb config_schema
        jsonb default_config
        jsonb ui_config
        boolean is_active
    }

    GAME_INSTANCES {
        uuid id PK
        uuid template_id FK
        string name
        jsonb config
        decimal reward_amount
        int max_plays_per_day
        string difficulty_level
        int estimated_duration
        boolean is_active
    }

    GAME_CONTENT {
        uuid id PK
        uuid game_instance_id FK
        string content_type
        jsonb content_data
        int order_index
    }

    GAME_ASSETS {
        uuid id PK
        uuid game_instance_id FK
        string asset_type
        string asset_url
        jsonb metadata
    }

    GAME_SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid game_instance_id FK
        jsonb session_data
        string status
        decimal score
        decimal reward_earned
    }
```

## Implementation Checklist

### Phase 1: Foundation ✅
- [x] Database schema design
- [ ] Migration file creation
- [ ] Backend API structure
- [ ] Basic validation service

### Phase 2: Template System
- [ ] Template CRUD APIs
- [ ] Template schema validation
- [ ] Default templates (Quiz, Memory Match)
- [ ] Template UI configuration

### Phase 3: Game Builder UI
- [ ] Template selector
- [ ] Dynamic form builder
- [ ] Content editor
- [ ] Asset uploader
- [ ] Preview component

### Phase 4: Game Engine
- [ ] Game loader
- [ ] Config parser
- [ ] State manager
- [ ] Score calculator
- [ ] Rule engine

### Phase 5: Game Renderers
- [ ] Quiz game renderer
- [ ] Memory match renderer
- [ ] Trivia renderer
- [ ] Generic renderer framework

### Phase 6: User Interface
- [ ] Game list screen
- [ ] Game detail screen
- [ ] Game play screens
- [ ] Result screen

### Phase 7: Advanced Features
- [ ] Visual builder
- [ ] Conditional logic
- [ ] Analytics dashboard
- [ ] Leaderboard







