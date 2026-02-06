import { useState, useEffect } from "react";
import { useGameStore } from "@/lib/gameStore";
import { MOCK_DECK, CardOverlay } from "@/components/CardOverlay";
import { Button } from "@/components/ui/button";
import { useLocation, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { Flame, Clock, Trophy, HeartPulse, Ticket } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";

export default function GameSession() {
  const [match, params] = useRoute("/game/:code");
  const [_, setLocation] = useLocation();
  const { room, gameState, playCard, playerId, disconnect } = useGameStore();
  const { user, firebaseUser } = useAuth();
  const [rewardsProcessed, setRewardsProcessed] = useState(false);

  // Rewards logic
  useEffect(() => {
    if (room?.status === 'finished' && firebaseUser && !rewardsProcessed) {
      const currentPlayer = room.players.find(p => p.id === parseInt(playerId || "0"));
      if (currentPlayer && currentPlayer.score > 0) {
        const userDoc = doc(db, "users", firebaseUser.uid);
        
        // Updated scoring: 1 ticket per 1 rep OR 1 ticket per 5 sec hold
        // The requirement is: 1 rep = 1 ticket, 5s hold = 1 ticket.
        // We assume score already accounts for this mapping.
        const ticketsEarned = currentPlayer.score; 
        
        updateDoc(userDoc, {
          score: increment(currentPlayer.score),
          raffleTickets: increment(ticketsEarned)
        }).catch(console.error);
        
        setRewardsProcessed(true);
      }
    }
  }, [room?.status, firebaseUser, playerId, room?.players, rewardsProcessed]);

  // Safety check
  useEffect(() => {
    if (!room || !gameState) {
      setLocation(match && params ? `/room/${params.code}` : "/");
    }
  }, [room, gameState, setLocation, match, params]);

  if (!gameState || !room) return null;

  // Derive current state
  const currentExercise = gameState.exercises[gameState.currentExerciseIndex];
  // Calculate progress based on time (mocked here, ideally syncing strictly with server start time)
  // Since we receive regular state updates, we can just display timeRemaining
  const progress = ((room.settings.roundTime - gameState.timeRemaining) / room.settings.roundTime) * 100;
  
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  
  if (room.status === 'finished') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background bg-grid-pattern">
              <Trophy size={80} className="text-accent mb-8 animate-bounce drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
              <h1 className="text-6xl md:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 mb-4 uppercase italic">
                MISSION COMPLETE
              </h1>
              <p className="text-muted-foreground mb-12 text-xl font-mono">The simulation has concluded.</p>
              
              <div className="w-full max-w-2xl space-y-4 mb-12">
                  {sortedPlayers.map((p, i) => (
                      <div key={p.id} className={cn("flex justify-between items-center p-6 rounded-xl border transition-all", 
                          i === 0 ? "border-accent bg-accent/10 scale-105 shadow-xl" : "border-white/10 bg-white/5"
                      )}>
                          <div className="flex items-center gap-6">
                              <span className={cn("font-display font-bold text-3xl w-8", i===0 ? "text-accent" : "text-muted-foreground")}>#{i+1}</span>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden">
                                   {p.profileImageUrl ? (
                                     <img src={p.profileImageUrl} alt={p.name} className="w-full h-full object-cover" />
                                   ) : (
                                     <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                                       {p.name[0]}
                                     </div>
                                   )}
                                </div>
                                <div className="text-left flex items-center gap-2">
                                  {p.profileImageUrl && (
                                    <img src={p.profileImageUrl} alt={p.name} className="w-6 h-6 rounded-full border border-white/10" />
                                  )}
                                  <span className="font-bold text-xl block">{p.name}</span>
                                  {p.isBot && <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">[AI CONSTRUCT]</span>}
                                </div>
                              </div>
                          </div>
                          <span className="font-mono font-bold text-3xl text-white">{p.score} <span className="text-sm text-muted-foreground">PTS</span></span>
                      </div>
                  ))}
              </div>
              
              <Button onClick={() => { disconnect(); setLocation('/'); }} size="lg" className="h-14 px-8 text-lg font-bold bg-white text-black hover:bg-white/90">Return to Hub</Button>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-screen relative bg-background overflow-hidden">
      <CardOverlay activeCard={gameState.activeCard} />
      
      {/* HUD Header */}
      <header className="flex justify-between items-start p-6 bg-gradient-to-b from-black/80 to-transparent border-b border-white/5 z-20">
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Round</div>
            <div className="text-4xl font-display font-bold text-white leading-none">{gameState.currentRound}<span className="text-lg text-white/30">/{room.settings.rounds}</span></div>
          </div>
          <div className="h-10 w-px bg-white/10"></div>
          <div>
             <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{room.settings.burnoutType}</div>
             <div className="flex gap-1 text-accent">
               <Flame size={20} fill="currentColor" className="animate-pulse" />
               <Flame size={20} fill="currentColor" className="opacity-50" />
               <Flame size={20} className="opacity-30" />
             </div>
          </div>
        </div>
        
        <div className="text-right">
             <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 flex items-center justify-end gap-2">
               <Clock size={12} /> Time Remaining
             </div>
             <div className={cn("text-6xl font-mono font-bold tracking-tighter tabular-nums", 
               gameState.timeRemaining < 10 ? "text-destructive animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-white"
             )}>
               {gameState.timeRemaining}s
             </div>
        </div>
      </header>
      
      {/* Live Leaderboard (Desktop) */}
      <div className="absolute top-32 right-6 w-64 space-y-1 z-20 hidden md:block">
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest text-right mb-2">Live Ranking</div>
          {sortedPlayers.map((p, i) => (
              <div key={p.id} className={cn("flex justify-between text-sm p-2 rounded border backdrop-blur-sm transition-all", 
                p.id === parseInt(playerId || "0") ? "bg-primary/20 border-primary" : "bg-black/40 border-white/10"
              )}>
                  <span className="truncate w-32 font-bold">{p.name}</span>
                  <span className="font-mono text-white">{p.score}</span>
              </div>
          ))}
      </div>
      
      {/* Main Action Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Giant Background Letter */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none overflow-hidden">
          <span className="text-[40vw] font-black font-display text-white translate-y-10">{currentExercise.name[0]}</span>
        </div>
        
        <div className="z-10 text-center space-y-6">
          <div className="inline-block px-4 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
             <span className="text-xs font-mono text-primary uppercase tracking-[0.3em]">Current Objective</span>
          </div>
          
          <h1 className="text-6xl md:text-9xl font-display font-black text-white uppercase leading-[0.8] tracking-tighter drop-shadow-2xl">
            {currentExercise.name}
          </h1>
          
          <div className="flex items-center justify-center gap-4">
             <Badge variant="outline" className="text-xl py-2 px-6 border-white/20 text-muted-foreground uppercase tracking-widest">
               {currentExercise.type === 'rep' ? 'MAX REPS' : 'HOLD FORM'}
             </Badge>
             <div className="flex gap-2">
                {currentExercise.focus.map(f => (
                  <Badge key={f} className="bg-secondary text-secondary-foreground uppercase text-xs hover:bg-secondary">
                    {f}
                  </Badge>
                ))}
             </div>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-1 bg-white/5">
        <div 
          className="h-full bg-primary shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-1000 ease-linear" 
          style={{ width: `${100 - progress}%` }}
        />
      </div>

      {/* Card Hand */}
      <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-30">
        <div className="flex items-end justify-center gap-4 h-48 pb-4 perspective-[1000px]">
          {MOCK_DECK.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => playCard(card)}
              style={{ transform: `rotate(${(idx - 2) * 5}deg) translateY(${Math.abs(idx-2) * 10}px)` }}
              className="relative w-32 h-48 bg-card border border-white/10 rounded-xl p-3 flex flex-col items-center justify-between hover:-translate-y-12 hover:scale-110 hover:z-50 hover:border-primary hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all duration-300 group shadow-xl"
            >
               <div className="w-full flex justify-between items-start">
                  <span className={cn("text-[10px] font-black uppercase tracking-wider p-1 rounded", 
                    card.type === 'attack' ? 'bg-destructive/20 text-destructive' : 
                    card.type === 'defense' ? 'bg-accent/20 text-accent' : 'bg-primary/20 text-primary'
                  )}>
                    {card.type}
                  </span>
                  {card.value && <span className="font-mono font-bold text-xs">{card.value}</span>}
               </div>
               
               <div className="font-display font-bold text-lg text-center leading-none group-hover:text-primary transition-colors">
                  {card.name}
               </div>
               
               <div className="text-[9px] text-muted-foreground text-center leading-tight border-t border-white/5 pt-2 w-full">
                  {card.description}
               </div>
               
               {/* Shine effect */}
               <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
