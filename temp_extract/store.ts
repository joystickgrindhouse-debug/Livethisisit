import { create } from 'zustand';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  limit, 
  getDocs,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Room, Player, GameSettings, GameState, GameCard, Exercise, FocusArea } from './types';
import { exercises } from './exercises';

// Names for anonymous/bot users
const ANIMAL_NAMES = ['Wolf', 'Hawk', 'Viper', 'Bear', 'Eagle', 'Shark', 'Lion', 'Tiger', 'Fox', 'Raven'];
const ADJECTIVES = ['Neon', 'Cyber', 'Iron', 'Steel', 'Rapid', 'Elite', 'Turbo', 'Shadow', 'Ghost', 'Rogue'];

function generateName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
}

const BOT_NAMES = ['CyberJock', 'RepReaper', 'CardioKing', 'GlitchFit', 'NeonStrider', 'PulseRider', 'Zinc', 'Chrom', 'Flux'];

interface StoreState {
  user: { id: string; name: string } | null;
  room: Room | null;
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  initializeAuth: () => () => void; // Returns unsubscribe
  createRoom: (focusArea: FocusArea, burnoutType: GameSettings['burnoutType'], isPublic?: boolean) => Promise<void>;
  joinRoom: (code: string) => Promise<boolean>;
  joinPublicMatch: (focusArea: FocusArea, burnoutType: GameSettings['burnoutType']) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleReady: () => Promise<void>;
  startGame: () => Promise<void>;
  playCard: (card: GameCard, targetId?: string) => Promise<void>;
  endGame: () => Promise<void>;
  
  // Bot Logic (Host runs this)
  addBot: () => Promise<void>;
  simulateGameLoop: () => void; // Local state update for smooth UI, actual score syncs via DB
}

export const useGameStore = create<StoreState>((set, get) => ({
  user: null,
  room: null,
  gameState: null,
  loading: true,
  error: null,

  initializeAuth: () => {
    // Auth Listener
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        set({ user: { id: fbUser.uid, name: fbUser.displayName || 'Rival' }, loading: false });
      } else {
        // Auto sign-in anonymously if not signed in
        try {
          const cred = await signInAnonymously(auth);
          const name = generateName();
          await updateProfile(cred.user, { displayName: name });
          set({ user: { id: cred.user.uid, name }, loading: false });
        } catch (err) {
          console.error("Auth error:", err);
          set({ error: "Authentication failed", loading: false });
        }
      }
    });
    return unsubAuth;
  },

  createRoom: async (focusArea, burnoutType, isPublic = false) => {
    const { user } = get();
    if (!user) return;

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    const roomId = isPublic ? `pub_${code}` : code;
    
    const newRoom: Room = {
      code,
      hostId: user.id,
      players: [{
        id: user.id,
        name: user.name,
        ready: true,
        score: 0,
        isHost: true,
        isBot: false,
        status: 'idle'
      }],
      status: 'lobby',
      isPublic,
      settings: {
        focusArea,
        burnoutType,
        roundTime: 45,
        rounds: 3,
        restTime: 15
      }
    };

    try {
      await setDoc(doc(db, "rooms", roomId), newRoom);
      
      // Subscribe to this room
      onSnapshot(doc(db, "rooms", roomId), (doc) => {
        if (doc.exists()) {
          set({ room: doc.data() as Room });
        } else {
          set({ room: null });
        }
      });
    } catch (err) {
      console.error("Create room error:", err);
      set({ error: "Failed to create room" });
    }
  },

  joinRoom: async (code) => {
    const { user } = get();
    if (!user) return false;

    // Try finding the room (private uses code as ID directly mostly, but let's query to be safe or standard)
    // For simplicity in this structure: Private room ID = code.
    const roomRef = doc(db, "rooms", code);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
      const roomData = roomSnap.data() as Room;
      
      // Check if already in
      if (roomData.players.find(p => p.id === user.id)) {
        // Re-subscribe
        onSnapshot(roomRef, (doc) => {
            set({ room: doc.data() as Room });
        });
        return true;
      }

      if (roomData.players.length >= 6 || roomData.status !== 'lobby') {
        set({ error: "Room full or started" });
        return false;
      }

      const newPlayer: Player = {
        id: user.id,
        name: user.name,
        ready: false,
        score: 0,
        isHost: false,
        isBot: false,
        status: 'idle'
      };

      await updateDoc(roomRef, {
        players: arrayUnion(newPlayer)
      });

      // Subscribe
      onSnapshot(roomRef, (doc) => {
        set({ room: doc.data() as Room });
      });
      return true;
    }
    
    return false;
  },

  joinPublicMatch: async (focusArea, burnoutType) => {
    const { user } = get();
    if (!user) return;

    // Find open public lobby with matching settings
    const q = query(
      collection(db, "rooms"), 
      where("isPublic", "==", true),
      where("status", "==", "lobby"),
      where("settings.focusArea", "==", focusArea),
      where("settings.burnoutType", "==", burnoutType),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Join existing
      const roomDoc = snapshot.docs[0];
      const roomData = roomDoc.data() as Room;
      
      if (roomData.players.length < 6) {
        const newPlayer: Player = {
          id: user.id,
          name: user.name,
          ready: false,
          score: 0,
          isHost: false,
          isBot: false,
          status: 'idle'
        };

        await updateDoc(roomDoc.ref, {
          players: arrayUnion(newPlayer)
        });

        onSnapshot(roomDoc.ref, (doc) => {
            set({ room: doc.data() as Room });
            
            // Check bot fill trigger
            const currentRoom = doc.data() as Room;
            if (currentRoom && currentRoom.players.length < 6 && currentRoom.hostId === user.id) {
               // If I became host (e.g. host left) or I am host, manage bots
               // (Simplified: Host always manages bots)
            }
        });
        return;
      }
    }

    // Create new if none found
    await get().createRoom(focusArea, burnoutType, true);
    
    // Start bot filler if host
    const botInterval = setInterval(() => {
        const { room } = get();
        if (!room || room.status !== 'lobby' || room.players.length >= 6) {
            clearInterval(botInterval);
            return;
        }
        // Only host adds bots
        if (room.hostId === user.id) {
            get().addBot();
        }
    }, 4000);
  },

  addBot: async () => {
    const { room } = get();
    if (!room) return;
    
    const usedNames = room.players.map(p => p.name);
    const availableNames = BOT_NAMES.filter(n => !usedNames.includes(n));
    const botName = availableNames[Math.floor(Math.random() * availableNames.length)] || 'Bot-' + Math.floor(Math.random()*100);
    const botId = `bot-${Date.now()}`;

    const newBot: Player = {
        id: botId,
        name: botName,
        ready: false,
        score: 0,
        isHost: false,
        isBot: true,
        status: 'idle'
    };
    
    // Determine room doc ID (public vs private naming convention)
    const roomId = room.isPublic ? `pub_${room.code}` : room.code;
    const roomRef = doc(db, "rooms", roomId);

    await updateDoc(roomRef, {
        players: arrayUnion(newBot)
    });

    // Bot ready-up delay
    setTimeout(async () => {
        // Need to read fresh state ref or trust atomic update? 
        // Array update is tricky for changing one field of an object in array.
        // We'll read, map, write.
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
             const r = snap.data() as Room;
             const updated = r.players.map(p => p.id === botId ? { ...p, ready: true } : p);
             await updateDoc(roomRef, { players: updated });
        }
    }, 2000 + Math.random() * 3000);
  },

  leaveRoom: async () => {
    const { room, user } = get();
    if (!room || !user) return;
    
    const roomId = room.isPublic ? `pub_${room.code}` : room.code;
    const roomRef = doc(db, "rooms", roomId);
    
    // Remove self
    const playerToRemove = room.players.find(p => p.id === user.id);
    if (playerToRemove) {
        await updateDoc(roomRef, {
            players: arrayRemove(playerToRemove)
        });
    }

    set({ room: null, gameState: null });
  },

  toggleReady: async () => {
    const { room, user } = get();
    if (!room || !user) return;
    
    const roomId = room.isPublic ? `pub_${room.code}` : room.code;
    const roomRef = doc(db, "rooms", roomId);

    const updatedPlayers = room.players.map(p => 
      p.id === user.id ? { ...p, ready: !p.ready } : p
    );
    
    await updateDoc(roomRef, { players: updatedPlayers });
  },

  startGame: async () => {
    const { room } = get();
    if (!room) return;
    
    const filtered = exercises.filter(e => e.focus.includes(room.settings.focusArea));
    const pool = filtered.length > 0 ? filtered : exercises;
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 5);

    const newState: GameState = {
        currentRound: 1,
        currentExerciseIndex: 0,
        timeRemaining: room.settings.roundTime,
        activeCard: null,
        exercises: shuffled
    };
    
    const roomId = room.isPublic ? `pub_${room.code}` : room.code;
    const roomRef = doc(db, "rooms", roomId);

    // Save game state to a subcollection or just a field? 
    // For simplicity, let's keep it on the room doc for now or a subcollection 'state/current'
    // Storing on room doc is easier for single-doc subscription
    await updateDoc(roomRef, {
        status: 'in-game',
        gameState: newState
    });
    
    set({ gameState: newState }); // Optimistic
  },

  playCard: async (card, targetId) => {
     // Card logic typically involves backend validation, 
     // here we just broadcast the effect via Firestore
     const { room } = get();
     if (!room) return;
     
     const roomId = room.isPublic ? `pub_${room.code}` : room.code;
     const roomRef = doc(db, "rooms", roomId);
     
     await updateDoc(roomRef, {
         "gameState.activeCard": card
     });
     
     setTimeout(async () => {
         await updateDoc(roomRef, {
            "gameState.activeCard": null
         });
     }, 5000);
  },
  
  simulateGameLoop: () => {
      // Host only: update bot scores periodically
      const { room, user } = get();
      if (!room || room.status !== 'in-game' || room.hostId !== user?.id) return;
      
      // Calculate new scores
      const updatedPlayers = room.players.map(p => {
          if (!p.isBot) return p;
          if (Math.random() > 0.7) {
              return { ...p, score: p.score + 1 };
          }
          return p;
      });

      // Write to DB (throttle this in real app, here we do it blindly)
      // To avoid spamming writes every second, maybe only every 5s?
      // For now, let's just do it
      const roomId = room.isPublic ? `pub_${room.code}` : room.code;
      const roomRef = doc(db, "rooms", roomId);
      
      updateDoc(roomRef, { players: updatedPlayers }).catch(e => console.log("Loop write skip", e));
  },

  endGame: async () => {
      const { room } = get();
      if (!room) return;
      
      const roomId = room.isPublic ? `pub_${room.code}` : room.code;
      const roomRef = doc(db, "rooms", roomId);
      
      await updateDoc(roomRef, { status: 'finished' });
  }
}));
