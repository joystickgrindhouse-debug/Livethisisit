import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useJoinRoom } from "@/hooks/use-rooms";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Users, Trophy, ChevronRight, Loader2, LogOut } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [_, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [guestName, setGuestName] = useState("");
  
  const joinRoom = useJoinRoom();

  const handleJoin = async () => {
    if (!code) return;
    const name = user?.firstName || guestName || "Guest";
    
    try {
      const result = await joinRoom.mutateAsync({
        code: code.toUpperCase(),
        playerName: name,
      });
      setLocation(`/room/${result.room.code}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid-pattern relative overflow-hidden flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg rotate-3 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
              <Flame className="w-6 h-6 text-black fill-current" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-white">
              RIVALIS <span className="text-primary">LIVE</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-white uppercase">{user?.firstName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">LEVEL 12</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary border border-white/10 flex items-center justify-center font-display font-bold text-lg text-primary">
                  {user?.firstName?.[0]}
                </div>
                <Button variant="ghost" size="icon" onClick={() => logout()}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 uppercase font-bold text-xs tracking-widest" onClick={() => window.location.href = '/api/login'}>
                Login with Replit
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse" />
        
        <div className="max-w-4xl w-full text-center space-y-8 mb-12">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-display text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50 tracking-tighter drop-shadow-2xl">
            COMPETE.<br/>
            <span className="text-stroke text-transparent">SYNC.</span>
            <span className="text-primary"> DOMINATE.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            The world's first real-time battle royale fitness game. Join a lobby, sync your workout, and outlast your opponents in high-intensity interval challenges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Create Room Card */}
          <Card className="bg-black/40 backdrop-blur-sm border-white/10 hover:border-primary/50 transition-all group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-8 space-y-6 relative">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white">Host a Match</h3>
              <p className="text-muted-foreground text-sm">Create a private lobby or public match. Configure exercises, rounds, and burnout intensity.</p>
              
              <CreateRoomDialog />
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="bg-black/40 backdrop-blur-sm border-white/10 hover:border-accent/50 transition-all group overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-8 space-y-6 relative">
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-white">Join the Fight</h3>
              <p className="text-muted-foreground text-sm">Enter a room code to join an existing lobby and challenge your friends.</p>
              
              <div className="space-y-3">
                {!isAuthenticated && (
                   <Input 
                   placeholder="YOUR NAME" 
                   value={guestName}
                   onChange={(e) => setGuestName(e.target.value)}
                   className="bg-black/50 border-white/10 h-12 text-center uppercase tracking-widest font-bold"
                 />
                )}
                <div className="flex gap-2">
                  <Input 
                    placeholder="ENTER ROOM CODE" 
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="bg-black/50 border-white/10 h-12 text-center uppercase tracking-widest font-bold text-lg"
                    maxLength={6}
                  />
                  <Button 
                    size="icon" 
                    className="h-12 w-12 bg-accent hover:bg-accent/80 text-black shrink-0"
                    onClick={handleJoin}
                    disabled={joinRoom.isPending || !code || (!guestName && !isAuthenticated)}
                  >
                    {joinRoom.isPending ? <Loader2 className="animate-spin" /> : <ChevronRight />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="py-6 border-t border-white/5 bg-black/20 text-center">
        <p className="text-xs text-muted-foreground font-mono">RIVALIS LIVE SYNC v1.0 • SYSTEM OPERATIONAL</p>
      </footer>
    </div>
  );
}
