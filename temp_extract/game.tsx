import { useState, useEffect } from "react";
import { useGameStore } from "@/lib/store";
import { MOCK_DECK, CardOverlay } from "@/components/game/CardOverlay";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Flame, Clock, Trophy } from "lucide-react";

export default function GameSession() {
  const { room, playCard, endGame, simulateGameLoop, user } = useGameStore();
  const [_, setLocation] = useLocation();
  const [elapsed, setElapsed] = useState(0);

  // Sync local gamestate from room doc (it comes via onSnapshot in store)
  const gameState = room?.gameState;

  // Game Loop
  useEffect(() => {
    if (!room || !gameState) {
      // If we lost state, go home
      if (!room) setLocation("/");
      return;
    }

    const timer = setInterval(() => {
      setElapsed(prev => {
        if (prev >= gameState.timeRemaining) {
          // Only host triggers end game write
          if (room.hostId === user?.id) {
             endGame();
          }
          return prev;
        }
        
        // Trigger bot simulation if host
        if (room.hostId === user?.id) {
           simulateGameLoop();
        }
        
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [room, gameState, endGame, setLocation, simulateGameLoop, user?.id]);

  if (!gameState || !room) return null;

  const currentExercise = gameState.exercises[gameState.currentExerciseIndex];
  const progress = (elapsed / gameState.timeRemaining) * 100;
  
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  
  if (room.status === 'finished') {
      return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-md mx-auto">
              <Trophy size={64} className="text-yellow-500 mb-4 animate-bounce" />
              <h1 className="text-4xl font-display text-primary mb-2">WORKOUT COMPLETE</h1>
              <p className="text-muted-foreground mb-8">You survived the arena.</p>
              
              <div className="w-full space-y-2 mb-8">
                  {sortedPlayers.map((p, i) => (
                      <div key={p.id} className={cn("flex justify-between items-center p-3 rounded border", 
                          i === 0 ? "border-yellow-500 bg-yellow-500/10" : "border-white/10 bg-white/5"
                      )}>
                          <div className="flex items-center gap-3">
                              <span className="font-mono text-muted-foreground">#{i+1}</span>
                              <span className="font-bold">{p.name} {p.isBot && <span className="text-xs text-muted-foreground">[BOT]</span>}</span>
                          </div>
                          <span className="font-mono font-bold text-accent">{p.score} pts</span>
                      </div>
                  ))}
              </div>
              
              <Button onClick={() => setLocation('/')}>Return to Hub</Button>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-full relative">
      <CardOverlay />
      
      {/* HUD Header */}
      <header className="flex justify-between items-start p-4 bg-black/20 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase">Round</div>
            <div className="text-2xl font-mono font-bold text-white">{gameState.currentRound}/{room.settings.rounds}</div>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div>
             <div className="text-xs text-muted-foreground uppercase">{room.settings.burnoutType}</div>
             <div className="flex gap-1 text-accent">
               <Flame size={16} fill="currentColor" />
               <Flame size={16} fill="currentColor" />
               <Flame size={16} />
             </div>
          </div>
        </div>
        
        <div className="text-right">
             <div className="text-xs text-muted-foreground uppercase flex items-center justify-end gap-1">
               <Clock size={12} /> Time Left
             </div>
             <div className={cn("text-4xl font-mono font-bold", elapsed > gameState.timeRemaining - 10 ? "text-destructive animate-pulse" : "text-white")}>
               {gameState.timeRemaining - elapsed}s
             </div>
        </div>
      </header>
      
      {/* Live Leaderboard (Mini) */}
      <div className="absolute top-20 right-4 w-32 space-y-1 opacity-50 hover:opacity-100 transition-opacity z-20 hidden md:block">
          <div className="text-[10px] text-muted-foreground uppercase text-right mb-1">Live Rank</div>
          {sortedPlayers.slice(0, 3).map((p, i) => (
              <div key={p.id} className="flex justify-between text-xs bg-black/50 p-1 rounded">
                  <span className="truncate w-16">{p.name}</span>
                  <span className="font-mono text-accent">{p.score}</span>
              </div>
          ))}
      </div>
      
      {/* Main Action Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <span className="text-[20vw] font-black font-display text-white">{currentExercise.name[0]}</span>
        </div>
        
        <div className="z-10 text-center space-y-2">
          <div className="text-sm font-mono text-primary uppercase tracking-[0.3em] mb-4">Current Objective</div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase leading-none drop-shadow-2xl">
            {currentExercise.name}
          </h1>
          <div className="text-2xl font-ui text-muted-foreground">
             {currentExercise.type === 'rep' ? 'MAX REPS' : 'HOLD FORM'}
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-2 bg-secondary">
        <div 
          className="h-full bg-primary transition-all duration-1000 ease-linear" 
          style={{ width: `${100 - progress}%` }}
        />
      </div>

      {/* Card Hand */}
      <div className="p-4 bg-black/40 backdrop-blur-md border-t border-white/5">
        <div className="text-xs text-muted-foreground uppercase mb-2 text-center">Your Hand</div>
        <div className="flex gap-2 justify-center overflow-x-auto pb-2">
          {MOCK_DECK.map((card) => (
            <button
              key={card.id}
              onClick={() => playCard(card)}
              className="flex-shrink-0 w-24 h-32 bg-card border border-white/10 rounded-lg p-2 flex flex-col items-center justify-between hover:-translate-y-2 transition-transform hover:border-primary group"
            >
               <div className="text-[10px] font-bold text-accent uppercase w-full text-left">{card.type}</div>
               <div className="font-display font-bold text-sm text-center leading-tight group-hover:text-primary">{card.name}</div>
               <div className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2">{card.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
