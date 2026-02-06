import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { signInWithGoogle, logout } from "@/lib/firebase";
import { useLocation } from "wouter";
import { useJoinRoom, useCreateRoom } from "@/hooks/use-rooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Flame, Users, Trophy, ChevronRight, Loader2, LogOut, Globe, Lock, Shield, LogIn, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user, firebaseUser, loading } = useAuth();
  const [_, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("public");
  const [focusArea, setFocusArea] = useState<"arms" | "legs" | "core" | "total">("total");
  const [isSearching, setIsSearching] = useState(false);
  const [code, setCode] = useState("");
  
  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  const handleStartSearch = async () => {
    setIsSearching(true);
    setTimeout(async () => {
      try {
        const result = await createRoom.mutateAsync({
          settings: {
            focusArea,
            burnoutType: 'classic',
            roundTime: 45,
            rounds: 3,
            restTime: 15
          },
          isPublic: true,
          hostName: user?.displayName || firebaseUser?.displayName || "Rival"
        });
        setLocation(`/room/${result.code}`);
      } catch (e) {
        console.error(e);
        setIsSearching(false);
      }
    }, 1500);
  };

  const handleJoinPrivate = async () => {
    if (!code) return;
    try {
      const result = await joinRoom.mutateAsync({
        code: code.toUpperCase(),
        playerName: user?.displayName || firebaseUser?.displayName || "Rival",
      });
      setLocation(`/room/${result.room.code}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 bg-grid-pattern overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent pointer-events-none" />
      
      {/* Auth State Header */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
        {loading ? (
          <Loader2 className="animate-spin text-zinc-500" size={20} />
        ) : (
          <div className="flex items-center gap-4 bg-zinc-900/80 border border-white/5 p-2 rounded-lg backdrop-blur-sm">
            {user?.profileImageUrl && (
              <img src={user.profileImageUrl} alt={user.displayName} className="w-8 h-8 rounded-full border border-white/10" />
            )}
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white">{user?.displayName || "Rival"}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Trophy size={10} className="text-yellow-500" /> {user?.score || 0}</span>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1"><Ticket size={10} className="text-red-500" /> {user?.raffleTickets || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="text-center mb-12 relative z-10">
        <h1 className="text-6xl md:text-8xl font-black font-display tracking-tighter text-white italic">
          RIVALIS
        </h1>
        <div className="text-primary font-mono tracking-[0.5em] text-sm font-bold mt-[-10px]">
          LIVE MODE
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-lg z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-64 mx-auto bg-zinc-900/80 border border-white/5 p-1 mb-8">
            <TabsTrigger value="public" className="data-[state=active]:bg-red-600 data-[state=active]:text-white uppercase font-bold text-xs tracking-widest gap-2">
              <Globe size={14} /> PUBLIC
            </TabsTrigger>
            <TabsTrigger value="private" className="data-[state=active]:bg-red-600 data-[state=active]:text-white uppercase font-bold text-xs tracking-widest gap-2">
              <Lock size={14} /> PRIVATE
            </TabsTrigger>
          </TabsList>

          <TabsContent value="public">
            <Card className="bg-zinc-950/40 border-red-600/20 backdrop-blur-xl">
              <CardContent className="p-8 space-y-8">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-display text-red-600 font-bold tracking-widest">FIND MATCH</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Ranked matchmaking • Open lobby</p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">1. SELECT FOCUS AREA</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['ARMS', 'LEGS', 'CORE', 'TOTAL BODY'].map((area) => {
                      const id = area.toLowerCase().replace(' body', '') as any;
                      return (
                        <Button
                          key={area}
                          variant="outline"
                          className={cn(
                            "h-14 font-display font-bold border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-all",
                            focusArea === id && "border-red-600 bg-red-600/10 text-white shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                          )}
                          onClick={() => setFocusArea(id)}
                        >
                          {area}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-red-500 transition-colors cursor-pointer group uppercase tracking-widest">
                  <Flame size={12} className="text-red-600" />
                  <span>2. SHOW ADVANCED MODES</span>
                  <span className="text-zinc-700 ml-auto italic">Default: Classic Burnout</span>
                </div>

                <Button 
                  className="w-full h-16 bg-red-600 hover:bg-red-700 text-white font-display text-xl font-black italic tracking-widest shadow-[0_10px_30px_rgba(220,38,38,0.4)] transition-all active:scale-95"
                  onClick={handleStartSearch}
                  disabled={isSearching}
                >
                  {isSearching ? <Loader2 className="animate-spin" /> : "START SEARCH"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="private">
            <Card className="bg-zinc-950/40 border-white/5 backdrop-blur-xl">
              <CardContent className="p-8 space-y-8">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-display text-white font-bold tracking-widest">PRIVATE LOBBY</h2>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Invite only • Competitive play</p>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">ENTER ROOM CODE</label>
                  <Input 
                    placeholder="X Y Z 1 2 3"
                    className="h-16 bg-zinc-900/50 border-white/5 text-center text-3xl font-mono font-bold uppercase tracking-[0.5em] focus:border-red-600 transition-all"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                  />
                </div>

                <Button 
                  className="w-full h-16 bg-white text-black hover:bg-zinc-200 font-display text-xl font-black italic tracking-widest transition-all active:scale-95"
                  onClick={handleJoinPrivate}
                  disabled={!code || joinRoom.isPending}
                >
                  {joinRoom.isPending ? <Loader2 className="animate-spin" /> : "JOIN ROOM"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest"><span className="bg-transparent px-2 text-zinc-600 font-bold">OR</span></div>
                </div>

                <Button 
                  variant="outline"
                  className="w-full h-14 border-white/10 hover:bg-white/5 font-bold uppercase tracking-widest"
                  onClick={() => {
                    setActiveTab("public");
                    handleStartSearch();
                  }}
                >
                  Create Custom Event
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Info */}
        <div className="mt-8 text-center text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest">
          Logged in as <span className="text-red-600 italic">{user?.firstName || "Rival 61"}</span>
        </div>
      </div>

      <footer className="absolute bottom-8 text-[8px] text-zinc-800 font-mono tracking-[0.5em] uppercase">
        Rivalis Systems • Online • Low Latency Mode Active
      </footer>
    </div>
  );
}
