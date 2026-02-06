# replit.md

## Overview

Livethisisit is a multiplayer fitness gaming application that combines real-time competitive gameplay with exercise challenges. Players join rooms (public or private), compete in timed workout sessions with different exercise types, and can use game cards to affect gameplay. The app features a cyberpunk/athletic visual theme with real-time synchronization via WebSockets.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: 
  - Zustand for global game state (WebSocket connections, room/game state)
  - TanStack React Query for server state and API calls
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Animations**: Framer Motion for game element animations

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Real-time Communication**: WebSocket server (ws library) for game state synchronization
- **API Design**: REST endpoints defined in shared/routes.ts with Zod validation schemas
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage

### Data Storage
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Schema Location**: shared/schema.ts contains all table definitions
- **Tables**:
  - `users` - User profiles with scores and raffle tickets
  - `rooms` - Game rooms with settings and game state (JSONB)
  - `players` - Players in rooms with session tracking
  - `sessions` - Session storage for authentication

### Authentication
- **Primary Auth**: Replit Auth integration (OpenID Connect)
- **Fallback**: Firebase Auth for Google sign-in (legacy code present)
- **Session**: PostgreSQL-backed sessions with 1-week TTL

### Game Architecture
- **Host-driven model**: Game loop is controlled by the room host
- **Real-time sync**: WebSocket messages with typed JSON payloads `{ type: string, payload: any }`
- **Game State**: Stored in room's gameState JSONB column, includes exercises, scores, active cards, and timing

### Deployment (Vercel)
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables Required**:
  - `DATABASE_URL`: PostgreSQL connection string (Neon or similar)
  - `SESSION_SECRET`: Random string for session encryption
  - `REPL_ID`: (Only if using Replit Auth)
  - `ISSUER_URL`: (Only if using Replit Auth)
  - `FIREBASE_CONFIG`: (If using Firebase features)

### Vercel Serverless Functions
Vercel handles the API via rewrites. Ensure that the database connection pool is handled correctly for serverless environments (e.g., using `@neondatabase/serverless` if deploying to Vercel with Neon).

### Third-Party Services
- **Replit Auth**: Primary authentication via OpenID Connect (`ISSUER_URL`, `REPL_ID` environment variables)
- **Firebase**: Secondary auth and Firestore for user data sync (config in client/src/lib/firebase.ts)
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)

### Key NPM Packages
- `drizzle-orm` + `drizzle-kit`: Database ORM and migrations
- `ws`: WebSocket server implementation
- `passport` + `openid-client`: Authentication strategies
- `zod` + `drizzle-zod`: Schema validation
- `framer-motion`: Game animations
- `zustand`: Client-side state management

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `REPL_ID`: Replit environment identifier (for auth)
- `ISSUER_URL`: OpenID Connect issuer (defaults to Replit)