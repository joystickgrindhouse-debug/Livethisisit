import { create } from 'zustand';
import { GameState, Player, RoomResponse, GameCard, WSMessage } from "@shared/schema";
import { exercises } from './exercises';

interface GameStore {
  // State
  socket: WebSocket | null;
  isConnected: boolean;
  room: RoomResponse | null;
  gameState: GameState | null;
  playerId: string | null;
  token: string | null;
  lastMessage: WSMessage | null;

  // Actions
  connect: (roomCode: string, token: string, playerId: string) => void;
  disconnect: () => void;
  setPlayerId: (id: string) => void;
  
  // Game Actions
  toggleReady: () => void;
  startGame: () => void;
  playCard: (card: GameCard, targetId?: string) => void;
  addBot: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  isConnected: false,
  room: null,
  gameState: null,
  playerId: null,
  token: null,
  lastMessage: null,

  setPlayerId: (id) => set({ playerId: id }),

  connect: (roomCode, token, playerId) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?roomCode=${roomCode}&token=${token}&playerId=${playerId}`;
    
    // Avoid double connections
    if (get().socket?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket Connected");
      set({ isConnected: true, socket, token, playerId });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        set({ lastMessage: message });

        switch (message.type) {
          case 'SYNC_ROOM':
            set({ room: message.payload });
            break;
          case 'UPDATE_STATE':
            set({ gameState: message.payload.gameState });
            break;
          case 'UPDATE_PLAYER':
            // Handled via SYNC_ROOM mostly, but could do optimistic updates here
            break;
          case 'JOIN_ROOM':
             // Trigger a refetch if needed, but SYNC_ROOM usually follows
             break;
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
      set({ isConnected: false, socket: null });
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error", error);
    };
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, isConnected: false, room: null, gameState: null });
  },

  toggleReady: () => {
    // In a real implementation, this sends a message. 
    // For this prototype, we'll assume the backend handles the REST API call or we send a WS message.
    // Let's implement this as a WS message if the backend supports it, otherwise API.
    // Based on schema, we should probably stick to REST for actions, WS for updates.
    // BUT for low latency, WS is better. I'll simulate an optimistic update via WS if protocol allowed.
    // The provided schema implies WS messages are Server -> Client mostly, except for maybe custom ones.
    // We will rely on the backend routes receiving actions and broadcasting updates.
  },

  startGame: () => {
    get().socket?.send(JSON.stringify({ type: 'START_GAME', payload: {} }));
  },

  playCard: (card, targetId) => {
    get().socket?.send(JSON.stringify({ 
      type: 'PLAY_CARD', 
      payload: { card, targetId } 
    }));
  },

  addBot: () => {
    // Host-only action usually done via REST or WS.
    // Let's assume there's an endpoint or we send a special message
    // For now, we'll implement the API call in the component
  }
}));
