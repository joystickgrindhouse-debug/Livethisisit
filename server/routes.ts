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
      
      let room;
      if (input.isPublic) {
        // Find existing public lobby with same focus area
        const publicRooms = await storage.listPublicRooms();
        room = publicRooms.find(r => r.settings.focusArea === input.settings.focusArea);
      }

      if (!room) {
        const code = nanoid(6).toUpperCase();
        room = await storage.createRoom({
          code,
          hostId: req.user ? (req.user as any).claims.sub : input.hostName,
          isPublic: input.isPublic,
          settings: input.settings,
          status: 'lobby',
          gameState: null,
        });
      }

      // Create Player
      const sessionId = nanoid();
      const player = await storage.addPlayer({
        roomCode: room.code,
        name: input.hostName,
        userId: null,
        sessionId,
        isHost: true,
        ready: true,
      });

      const players = await storage.getRoomPlayers(room.code);
      res.status(201).json({ ...room, players, token: sessionId }); 
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.post(api.rooms.join.path, async (req, res) => {
    try {
      const input = api.rooms.join.input.parse(req.body);
      const room = await storage.getRoom(input.code);
      
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Create Player
      const sessionId = nanoid();
      const player = await storage.addPlayer({
        roomCode: room.code,
        name: input.playerName,
        userId: null,
        sessionId,
        isHost: false,
        ready: false
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
        
        // Auto-fill bots if not enough players (Humanized Bot logic)
        const playersCount = (roomsMap.get(roomCode)?.size || 0);
        if (playersCount < 2) {
           // Simple delay before adding a bot
           setTimeout(async () => {
             const currentPlayers = await storage.getRoomPlayers(roomCode);
             if (currentPlayers.length < 2) {
                const botNames = ['CyberJock', 'RepReaper', 'CardioKing', 'GlitchFit', 'NeonStrider'];
                const botName = botNames[Math.floor(Math.random() * botNames.length)];
                await storage.addPlayer({
                  roomCode,
                  name: botName,
                  sessionId: 'bot-' + nanoid(4),
                  isBot: true,
                  ready: true,
                  isHost: false
                });
                // Full sync to everyone
                const updatedPlayers = await storage.getRoomPlayers(roomCode);
                const room = await storage.getRoom(roomCode);
                broadcast({ type: 'SYNC_ROOM', payload: { ...room, players: updatedPlayers } });
             }
           }, 5000);
        }

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
