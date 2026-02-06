import { useEffect } from "react";
import { useGameStore } from "@/lib/gameStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation, useRoute } from "wouter";
import { Copy, Crown, CheckCircle2, Bot, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRoom } from "@/hooks/use-rooms";

export default function Room() {
  const [match, params] = useRoute("/room/:code");
  const code = params?.code || "";
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const { room, playerId, connect, disconnect, toggleReady, startGame } = useGameStore();
  const currentPlayer = (room?.players as any[])?.find((p: any) => p.id.toString() === playerId);
  
  useEffect(() => {
    // Session check moved to connection logic
  }, [setLocation, toast]);

  useEffect(() => {
    if (code && !useGameStore.getState().isConnected) {
       const token = sessionStorage.getItem(`room_token_${code}`);
       const pid = sessionStorage.getItem(`room_pid_${code}`);
       if (token && pid) {
         connect(code, token, pid);
       } else {
         toast({
           title: "Session Expired",
           description: "Please rejoin the room.",
           variant: "destructive"
         });
         setLocation("/");
       }
    }
    
    // Listen for game start
    if (room?.status === 'in-game') {
        setLocation(`/game/${code}`);
    }
  }, [room?.status, code, setLocation, connect, toast]);

  if (!room) return <div className="flex h-screen items-center justify-center text-muted-foreground">Connecting to Lobby...</div>;

  const isHost = currentPlayer?.isHost;
  const readyCount = room.players.filter(p => p.ready).length;
  const canStart = readyCount >= 1; 

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    toast({ title: "Copied!", description: "Room code copied to clipboard." });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-6 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-sm text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
            {room.isPublic ? <Globe size={14} className="text-accent" /> : <Lock size={14} />}
            {room.isPublic ? "Public Match" : "Private Lobby"}
          </h2>
          
          <div className="flex items-center gap-4">
              <h1 className="text-5xl md:text-6xl font-mono font-bold text-white tracking-[0.1em] text-stroke">{room.code}</h1>
              <Button size="icon" variant="outline" onClick={copyCode} className="h-10 w-10 border-white/20 hover:bg-white/10 hover:text-white">
                <Copy size={18} />
              </Button>
          </div>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="font-mono border-primary/50 text-primary px-4 py-1 text-sm mb-2">
            {room.players.length}/6 PLAYERS
          </Badge>
          <div className="text-xs text-muted-foreground font-mono">
             PROTOCOL: {room.settings.burnoutType.toUpperCase()}
          </div>
        </div>
      </header>

      <div className="flex-1 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {room.players.map((player) => (
            <div 
              key={player.id} 
              className={cn(
                "relative p-6 rounded-xl border flex items-center justify-between transition-all group overflow-hidden",
                player.ready 
                  ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(34,197,94,0.1)]" 
                  : "bg-secondary/40 border-white/5"
              )}
            >
              {player.ready && <div className="absolute inset-0 bg-primary/5 animate-pulse" />}
              
              <div className="flex items-center gap-4 relative z-10">
                <Avatar className="h-14 w-14 border-2 border-white/10 ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                  <AvatarFallback className="bg-black font-bold text-muted-foreground font-display text-xl">
                    {player.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold font-display text-xl tracking-wide", player.id === parseInt(playerId || "0") ? "text-white" : "text-muted-foreground")}>
                      {player.name}
                    </span>
                    {player.isHost && <Crown size={16} className="text-accent fill-accent" />}
                    {player.isBot && <Bot size={16} className="text-blue-400" />}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-1">
                    STATUS: <span className={player.ready ? "text-primary" : "text-white/50"}>{player.ready ? "READY" : "IDLE"}</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10">
                {player.ready ? (
                  <CheckCircle2 className="text-primary h-6 w-6" />
                ) : (
                  <div className="h-3 w-3 rounded-full bg-white/10" />
                )}
              </div>
            </div>
          ))}
          
          {/* Empty Slots */}
          {Array.from({ length: Math.max(0, 6 - room.players.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="p-6 rounded-xl border border-dashed border-white/5 flex items-center justify-center opacity-30">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Searching Signal...</span>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-auto space-y-6">
        <div className="flex flex-col md:flex-row gap-4 h-20">
          <Button 
            onClick={toggleReady}
            className={cn(
              "flex-1 h-full text-xl font-bold font-display uppercase tracking-wider skew-x-[-10deg] transition-all",
              currentPlayer?.ready 
                ? "bg-secondary text-muted-foreground hover:bg-secondary/80" 
                : "bg-primary text-black hover:bg-primary/90 hover:scale-[1.02] shadow-[0_0_30px_rgba(34,197,94,0.2)]"
            )}
          >
            <span className="skew-x-[10deg]">{currentPlayer?.ready ? "Cancel Ready" : "Initiate Ready Protocol"}</span>
          </Button>
          
          {isHost && (
            <Button 
              onClick={startGame}
              disabled={!canStart}
              className="flex-1 h-full text-xl font-bold font-display uppercase tracking-wider skew-x-[-10deg] bg-accent text-black hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(250,204,21,0.2)]"
            >
              <span className="skew-x-[10deg]">Start Simulation</span>
            </Button>
          )}
        </div>
        
        <div className="text-center">
          <Button variant="link" onClick={() => { disconnect(); setLocation("/"); }} className="text-destructive hover:text-destructive/80 text-xs uppercase tracking-widest opacity-60 hover:opacity-100">
            Abort Mission (Leave Room)
          </Button>
        </div>
      </footer>
    </div>
  );
}
