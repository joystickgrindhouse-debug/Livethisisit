import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { 
  rooms, players, 
  type Room, type Player, type InsertRoom, type InsertPlayer,
  type GameState, type GameSettings
} from "@shared/schema";
import { authStorage } from "./replit_integrations/auth/storage"; // Integrate Replit Auth

export interface IStorage {
  // Auth
  getUser: typeof authStorage.getUser;
  upsertUser: typeof authStorage.upsertUser;

  // Rooms
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(code: string): Promise<Room | undefined>;
  listPublicRooms(): Promise<(Room & { playerCount: number })[]>;
  updateRoomStatus(code: string, status: 'lobby' | 'in-game' | 'finished'): Promise<void>;
  updateGameState(code: string, state: GameState): Promise<void>;
  
  // Players
  addPlayer(player: InsertPlayer): Promise<Player>;
  getPlayer(id: number): Promise<Player | undefined>;
  getPlayerBySession(sessionId: string): Promise<Player | undefined>;
  getRoomPlayers(roomCode: string): Promise<Player[]>;
  updatePlayer(id: number, updates: Partial<Player>): Promise<Player>;
  removePlayer(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  getUser = authStorage.getUser.bind(authStorage);
  upsertUser = authStorage.upsertUser.bind(authStorage);

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room as any).returning();
    return newRoom;
  }

  async getRoom(code: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  async listPublicRooms(): Promise<(Room & { playerCount: number })[]> {
    // Ideally this uses a count join, but for simplicity we'll fetch and map
    // or just list rooms and fetch counts separately if needed.
    // Given low volume, we can just return rooms and frontend can fetch details
    // OR we can do a proper join. Let's do a join.
    // Actually, Drizzle relations are nice but manual join is robust here.
    
    const publicRooms = await db.select().from(rooms)
      .where(and(eq(rooms.isPublic, true), eq(rooms.status, 'lobby')));
      
    // Fetch counts - simple but N+1ish. Good enough for lite.
    const results = [];
    for (const r of publicRooms) {
      const pCount = await db.select().from(players).where(eq(players.roomCode, r.code));
      results.push({ ...r, playerCount: pCount.length });
    }
    
    return results;
  }

  async updateRoomStatus(code: string, status: 'lobby' | 'in-game' | 'finished'): Promise<void> {
    await db.update(rooms)
      .set({ status })
      .where(eq(rooms.code, code));
  }

  async updateGameState(code: string, state: GameState): Promise<void> {
    await db.update(rooms)
      .set({ gameState: state })
      .where(eq(rooms.code, code));
  }

  async addPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players).values(player).returning();
    return newPlayer;
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async getPlayerBySession(sessionId: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.sessionId, sessionId));
    return player;
  }

  async getRoomPlayers(roomCode: string): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.roomCode, roomCode));
  }

  async updatePlayer(id: number, updates: Partial<Player>): Promise<Player> {
    const [updated] = await db.update(players)
      .set(updates)
      .where(eq(players.id, id))
      .returning();
    return updated;
  }

  async removePlayer(id: number): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }
}

export const storage = new DatabaseStorage();
