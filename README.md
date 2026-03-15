# AI Diary

A shared diary chat application where friends write diaries together through real-time conversation, with AI participation.

## Architecture

```
Browser (Next.js)
  |
  |-- HTTP -------> Next.js API Routes -------> Supabase (DB)
  |                 (Room CRUD, Messages,
  |                  AI Diary Generation)
  |
  |-- WebSocket --> Socket.IO Server (port 4000) --> Supabase (DB)
                    (Real-time messaging,
                     Typing indicators,
                     Online presence,
                     AI responses)
```

### Why this architecture?

- **Next.js API Routes** handle request-response patterns (room CRUD, message history, diary generation). These are stateless and cacheable.
- **Separate Socket.IO server** handles real-time events (messaging, typing, presence). Decoupled from Next.js to allow independent scaling and avoid serverless cold start issues with WebSocket connections.
- **Supabase** serves as the single source of truth. Both servers write to it, ensuring messages persist even if the socket server restarts.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | Server components, API routes, file-based routing |
| Auth | NextAuth v5 | Google/GitHub OAuth with JWT strategy |
| Database | Supabase (PostgreSQL) | Real-time subscriptions, row-level security, managed hosting |
| Real-time | Socket.IO | Automatic reconnection, room-based broadcasting, fallback to polling |
| State | React Query + Zustand | React Query for server state (caching, invalidation), Zustand for UI state |
| AI | OpenAI GPT-4o-mini | Cost-effective for chat responses and diary summarization |
| Styling | CSS Modules + SCSS | Scoped styles, no runtime overhead |
| Testing | Vitest | Fast, Vite-native, ESM support |

### Key Technical Decisions

**React Query over SWR**: Chose React Query for its `setQueryData` (optimistic cache updates from socket events), `useMutation` with `onSuccess`/`onError`, and `invalidateQueries` for cache coordination between REST and WebSocket data flows.

**Socket.IO over native WebSocket**: Socket.IO provides automatic reconnection with exponential backoff, room-based broadcasting (essential for chat rooms), and transparent fallback to HTTP long-polling when WebSocket is unavailable.

**Separate API layer (`services/chatService.ts`)**: All fetch calls are centralized with shared error handling, typed responses, and a single `request<T>()` wrapper. Components never call `fetch` directly.

## Features

| Feature | Description |
|---------|-------------|
| Chat Rooms | Create date-based diary rooms, invite friends via shareable link |
| Real-time Messaging | Instant message delivery via WebSocket |
| Typing Indicator | Throttled (1s) to minimize socket events, auto-clears after 2s |
| Online Presence | Live user list with online/offline status |
| AI Chat | Mention `@ai` to get contextual AI responses based on recent conversation |
| Diary Generation | AI summarizes chat conversation into a personal diary entry |
| Auth | Google/GitHub OAuth with persistent user ID across sessions |

## Project Structure

```
src/
  app/
    api/chat/
      rooms/              # Room CRUD API
      rooms/[roomId]/     # Room detail + messages API
      rooms/join/         # Invite code join API
      summarize/          # AI diary generation API
    diary/
      chat/               # Chat room list page
      chat/[roomId]/      # Chat room page
      chat/join/          # Invite link landing page
  components/Chat/
    ChatRoom.tsx          # Layout (header + messages + input)
    ChatMessage.tsx       # Message bubble (user/AI/system variants)
    ChatInput.tsx         # Input with Enter-to-send
    TypingIndicator.tsx   # "X is typing" with dot animation
    OnlineUsers.tsx       # Horizontal avatar list
  hooks/
    useSocket.ts          # Socket.IO connection + event management
    __tests__/
      useSocket.test.ts   # Unit tests with mocked socket
  services/
    chatService.ts        # API layer (typed fetch wrapper)
  types/
    chat.ts               # Shared types (ChatMessage, OnlineUser, ChatRoomData)
  lib/
    chat.ts               # Server-side Supabase queries
    diary.ts              # Server-side diary CRUD
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Supabase project
- Google/GitHub OAuth credentials
- OpenAI API key

### 1. Clone and install

```bash
git clone https://github.com/jarangseo/ai-diary-next.git
cd ai-diary-next
pnpm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
# Fill in your credentials
```

### 3. Run the Socket.IO server

```bash
git clone https://github.com/jarangseo/ai-diary-chat-server.git
cd ai-diary-chat-server
pnpm install
pnpm dev  # runs on port 4000
```

### 4. Run the Next.js app

```bash
pnpm dev  # runs on port 3000
```

### 5. Run tests

```bash
pnpm test        # watch mode
pnpm test:run    # single run
```

## Database Schema

```sql
-- Chat rooms (one per diary date)
chat_rooms (id, owner_id, date, invite_code, created_at)

-- Room membership (composite key prevents duplicates)
room_members (room_id, user_id, joined_at)

-- Messages with type discrimination
chat_messages (id, room_id, user_id, content, type['user'|'ai'|'system'], created_at)

-- Diary entries
diaries (id, user_id, date, content, is_record_only, emotion_*, created_at, updated_at)
```

## Testing Strategy

**Unit tests** (`vitest`): Core hooks and services are tested with mocked dependencies.

- `useSocket` hook: Connection lifecycle, event callbacks, message sending, typing throttle, cleanup on unmount
- Socket mock (`mockSocket.ts`): Simulates Socket.IO server events without a real connection

```bash
pnpm test:run

# Test Files  1 passed (1)
#      Tests  8 passed (8)
```
