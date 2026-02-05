import { useEffect } from "react";
import { useGameStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Copy, Crown, CheckCircle2, Bot, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Room() {
  const { room, user, toggleReady, leaveRoom, startGame } = useGameStore();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!room) {
      setLocation("/");
    }
  }, [room, setLocation]);

  if (!room || !user) return null;

  const currentPlayer = room.players.find(p => p.id === user.id);
  const isHost = room.hostId === user.id;
  const readyCount = room.players.filter(p => p.ready).length;
  const canStart = readyCount >= 2 && readyCount <= 6; 

  // Auto-start for public matches if everyone is ready? Or stick to host start?
  // Let's stick to host start for now, even if host is bot (store handles bot host logic if needed, but for now we assume player is host or joins existing).
  // If host is a bot, we need logic to auto-start.
  const hostPlayer = room.players.find(p => p.isHost);
  const hostIsBot = hostPlayer?.isBot;

  useEffect(() => {
    if (hostIsBot && canStart && room.status === 'lobby') {
        const timer = setTimeout(() => {
            startGame();
            setLocation("/game");
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [hostIsBot, canStart, room.status, startGame, setLocation]);


  return (
    <div className="flex flex-col h-full p-6 max-w-2xl mx-auto w-full">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-sm text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
            {room.isPublic ? <Globe size={14} /> : <Lock size={14} />}
            {room.isPublic ? "Public Match" : "Private Lobby"}
          </h2>
          
          {!room.isPublic ? (
            <div className="flex items-center gap-3">
                <h1 className="text-4xl font-mono font-bold text-primary tracking-[0.2em]">{room.code}</h1>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white">
                <Copy size={16} />
                </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xl text-white font-display uppercase">Matchmaking...</span>
                <span className="inline-block w-2 h-2 bg-primary rounded-full animate-ping"/>
            </div>
          )}
        </div>
        <div className="text-right">
          <Badge variant="outline" className="font-mono border-primary/50 text-primary">
            {room.players.length}/6 PLAYERS
          </Badge>
        </div>
      </header>

      <div className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {room.players.map((player) => (
            <div 
              key={player.id} 
              className={cn(
                "relative p-4 rounded-lg border flex items-center justify-between transition-all",
                player.ready 
                  ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                  : "bg-secondary/20 border-white/5"
              )}
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-white/10">
                  <AvatarFallback className="bg-black font-bold text-muted-foreground">
                    {player.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold font-ui text-lg", player.id === user.id ? "text-white" : "text-muted-foreground")}>
                      {player.name}
                    </span>
                    {player.isHost && <Crown size={14} className="text-yellow-500" />}
                    {player.isBot && <Bot size={14} className="text-accent opacity-50" />}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground uppercase">
                    {player.status}
                  </div>
                </div>
              </div>
              
              <div>
                {player.ready ? (
                  <CheckCircle2 className="text-primary animate-pulse" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-white/20" />
                )}
              </div>
            </div>
          ))}
          
          {/* Empty Slots */}
          {Array.from({ length: Math.max(0, 6 - room.players.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="p-4 rounded-lg border border-dashed border-white/5 flex items-center justify-center opacity-50">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Searching...</span>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-8 space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={toggleReady}
            className={cn(
              "flex-1 py-6 text-lg font-bold uppercase tracking-wider",
              currentPlayer?.ready ? "bg-white/10 text-white hover:bg-white/20" : "bg-primary text-black hover:bg-primary/90"
            )}
          >
            {currentPlayer?.ready ? "Cancel Ready" : "Ready Up"}
          </Button>
          
          {isHost && (
            <Button 
              onClick={() => {
                startGame();
                setLocation("/game");
              }}
              disabled={!canStart}
              className="flex-1 py-6 text-lg font-bold uppercase tracking-wider bg-accent text-black hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Game
            </Button>
          )}
          
          {!isHost && hostIsBot && (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground border border-white/10 rounded-md">
                  Host will start when ready...
              </div>
          )}
        </div>
        
        <div className="text-center">
          <Button variant="link" onClick={() => { leaveRoom(); setLocation("/"); }} className="text-destructive hover:text-destructive/80">
            Leave Room
          </Button>
        </div>
        
        {isHost && !canStart && (
          <p className="text-center text-xs text-destructive mt-2">
            Need at least 2 players ready to start.
          </p>
        )}
      </footer>
    </div>
  );
}
