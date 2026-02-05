import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

// === TYPES FROM ORIGINAL PROJECT ===
export type FocusArea = 'arms' | 'legs' | 'core' | 'total';
export type BurnoutType = 'classic' | 'pyramid' | 'sudden-death' | 'time-attack';

export interface GameSettings {
  focusArea: FocusArea;
  burnoutType: BurnoutType;
  roundTime: number;
  rounds: number;
  restTime: number;
}

export interface GameCard {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'buff';
  description: string;
  duration?: number;
  value?: number;
}

export interface Exercise {
  id: string;
  name: string;
  type: 'rep' | 'hold';
  focus: FocusArea[];
  thresholds: {
    beginner: number;
    intermediate: number;
    advanced: number;
    elite: number;
  };
}

export interface GameState {
  currentRound: number;
  currentExerciseIndex: number;
  timeRemaining: number;
  activeCard: GameCard | null;
  exercises: Exercise[];
}

// === DB TABLES ===

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostId: text("host_id").notNull(), // Can be user ID or guest ID
  status: text("status", { enum: ['lobby', 'in-game', 'finished'] }).default('lobby').notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  settings: jsonb("settings").$type<GameSettings>().notNull(),
  gameState: jsonb("game_state").$type<GameState>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull(), // Using code as FK for simplicity in URL
  userId: text("user_id"), // Nullable for guests
  sessionId: text("session_id").notNull(), // Stable ID for re-connection
  name: text("name").notNull(),
  score: integer("score").default(0).notNull(),
  ready: boolean("ready").default(false).notNull(),
  isHost: boolean("is_host").default(false).notNull(),
  isBot: boolean("is_bot").default(false).notNull(),
  status: text("status", { enum: ['idle', 'exercising', 'rest'] }).default('idle').notNull(),
});

// === SCHEMAS ===

export const insertRoomSchema = createInsertSchema(rooms).omit({ 
  id: true, 
  createdAt: true,
  gameState: true 
});

export const insertPlayerSchema = createInsertSchema(players).omit({ 
  id: true 
});

// === API CONTRACT TYPES ===

export type Room = typeof rooms.$inferSelect;
export type Player = typeof players.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

// Request types
export type CreateRoomRequest = {
  settings: GameSettings;
  isPublic: boolean;
  hostName: string; // If guest
};

export type JoinRoomRequest = {
  code: string;
  playerName: string; // If guest
};

// Response types
export interface RoomResponse extends Room {
  players: Player[];
}

// WS Message Types
export type WSMessage = 
  | { type: 'JOIN_ROOM'; payload: { roomCode: string; playerId: string } }
  | { type: 'UPDATE_STATE'; payload: { gameState: GameState } }
  | { type: 'UPDATE_PLAYER'; payload: Partial<Player> & { id: number } } // id is the DB id
  | { type: 'PLAY_CARD'; payload: { card: GameCard; targetId?: string } }
  | { type: 'START_GAME'; payload: {} }
  | { type: 'END_GAME'; payload: {} }
  | { type: 'SYNC_ROOM'; payload: RoomResponse }; // Server -> Client full sync
