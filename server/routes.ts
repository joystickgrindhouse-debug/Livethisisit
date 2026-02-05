import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { nanoid } from "nanoid";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth Setup
  await setupAuth(app);
  registerAuthRoutes(app);

  // === REST API ===

  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const input = api.rooms.create.input.parse(req.body);
      
      const code = nanoid(6).toUpperCase(); // Short code
      
      const room = await storage.createRoom({
        code,
        hostId: req.user ? (req.user as any).claims.sub : input.hostName, // Use User ID or Guest Name as Host ID
        isPublic: input.isPublic,
        settings: input.settings,
        status: 'lobby',
        gameState: null,
      });

      // Create Host Player
      const sessionId = nanoid();
      const player = await storage.addPlayer({
        roomCode: code,
        name: req.user ? ((req.user as any).claims.first_name || 'Host') : input.hostName,
        userId: req.user ? (req.user as any).claims.sub : null,
        sessionId,
        isHost: true,
        ready: true, // Host is implicitly ready? Maybe not.
      });

      const players = [player];
      // Attach sessionId as token for the creator
      // We wrap the response to include the token, matching the schema if we had one for this specific structure
      // But the route definition says 201 returns Room & { players }. 
      // The join route returns the token. 
      // Ideally create also returns a token so the host can "join" via WS.
      // Let's modify the response or just rely on the frontend to call "join" immediately?
      // Better: Create returns room, then frontend calls join? No, that's 2 calls.
      // Let's return the token in a header or cookies? Or just include it in response and cast type.
      
      // Hack for simplicity: Host joins automatically on client side?
      // Actually, frontend will need `sessionId` to connect WS.
      // Let's send it in the response body, even if schema doesn't strictly explicitly say it (Zod `custom` allows extras if not strict)
      // Or better, let's stick to the flow: Create Room -> Success -> Join Room (via Socket/API).
      // But we just created the player record! We shouldn't create it again.
      // So Create Room endpoint *should* return the session token.
      
      res.status(201).json({ ...room, players, token: sessionId }); 
    } catch (err) {
        console.error(err);
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.post(api.rooms.join.path, async (req, res) => {
    try {
      const input = api.rooms.join.input.parse(req.body);
      const room = await storage.getRoom(input.code);
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Check if user already exists (re-join) via Auth or Session?
      // For now, always create new player unless we implement sophisticated re-join logic.
      // Or check if name exists in room?
      
      const sessionId = nanoid();
      const player = await storage.addPlayer({
        roomCode: room.code,
        name: req.user ? ((req.user as any).claims.first_name || 'Player') : input.playerName,
        userId: req.user ? (req.user as any).claims.sub : null,
        sessionId,
        isHost: false
      });

      res.json({
        room,
        player,
        token: sessionId
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const room = await storage.getRoom(req.params.code);
    if (!room) return res.status(404).json({ message: "Room not found" });
    
    const players = await storage.getRoomPlayers(room.code);
    res.json({ ...room, players });
  });

  app.get(api.rooms.listPublic.path, async (req, res) => {
    const rooms = await storage.listPublicRooms();
    res.json(rooms);
  });


  // === WEBSOCKET SERVER ===
  
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Map<RoomCode, Set<WebSocket>>
  const roomsMap = new Map<string, Set<WebSocket>>();

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const roomCode = url.searchParams.get('roomCode');
    const sessionId = url.searchParams.get('sessionId');

    if (!roomCode || !sessionId) {
      ws.close(1008, 'Missing parameters');
      return;
    }

    // Verify player
    const player = await storage.getPlayerBySession(sessionId);
    if (!player || player.roomCode !== roomCode) {
      ws.close(1008, 'Invalid session');
      return;
    }

    // Join Room
    if (!roomsMap.has(roomCode)) {
      roomsMap.set(roomCode, new Set());
    }
    const clients = roomsMap.get(roomCode)!;
    clients.add(ws);

    // Helper to broadcast
    const broadcast = (msg: any) => {
      const data = JSON.stringify(msg);
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    };

    // Notify others of join
    broadcast({ 
      type: 'JOIN_ROOM', 
      payload: { roomCode, playerId: player.id } 
    });

    // Send full sync to new connector
    const room = await storage.getRoom(roomCode);
    const players = await storage.getRoomPlayers(roomCode);
    if (room) {
      ws.send(JSON.stringify({
        type: 'SYNC_ROOM',
        payload: { ...room, players }
      }));
    }

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle Game State Updates (From Host)
        if (message.type === 'UPDATE_STATE') {
          // Ideally verify ws belongs to host, but for lite build we trust the client logic (Host only sends this)
          // Broadcast to all
          broadcast(message);
          
          // Persist strictly periodically or on critical events (Start/End)
          // For now, we rely on broadcast for real-time.
        }
        
        // Handle Player Updates (Ready, Score)
        if (message.type === 'UPDATE_PLAYER') {
          // Update DB
          const updates = message.payload;
          const pid = updates.id;
          if (pid) {
             await storage.updatePlayer(pid, updates);
             // Broadcast
             broadcast(message);
          }
        }
        
        // Handle Start Game
        if (message.type === 'START_GAME') {
            await storage.updateRoomStatus(roomCode, 'in-game');
            // Init game state? Host does it and sends UPDATE_STATE.
            broadcast(message);
        }
        
        // Handle End Game
         if (message.type === 'END_GAME') {
            await storage.updateRoomStatus(roomCode, 'finished');
            broadcast(message);
        }

      } catch (err) {
        console.error('WS Message Error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      if (clients.size === 0) {
        roomsMap.delete(roomCode);
      }
      // Optionally mark player as offline/disconnected in DB?
    });
  });

  return httpServer;
}
