import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useCreateRoom } from "@/hooks/use-rooms";
import { focusAreas, burnoutTypes } from "@/lib/exercises";
import { FocusArea, BurnoutType } from "@shared/schema";
import { useLocation } from "wouter";
import { Loader2, Plus, Globe, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function CreateRoomDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  
  const [hostName, setHostName] = useState(user?.firstName || "");
  const [focusArea, setFocusArea] = useState<FocusArea>('total');
  const [burnoutType, setBurnoutType] = useState<BurnoutType>('classic');
  const [isPublic, setIsPublic] = useState(false);

  const createRoom = useCreateRoom();

  const handleCreate = async () => {
    if (!hostName && !user) return; // Should validate better

    try {
      const result = await createRoom.mutateAsync({
        settings: {
          focusArea,
          burnoutType,
          roundTime: 45,
          rounds: 3,
          restTime: 15,
        },
        isPublic,
        hostName: user?.firstName || hostName || "Guest",
      });

      setIsOpen(false);
      // Backend returns room with players. Find self.
      const self = result.players.find(p => p.isHost);
      // In a real app we'd store the token.
      // For now, redirect to room
      setLocation(`/room/${result.code}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full text-lg font-bold h-16 bg-primary hover:bg-primary/90 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all">
          <Plus className="mr-2 h-6 w-6" /> Create Private Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display uppercase tracking-wider text-center">Setup Your Arena</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input 
                id="name" 
                value={hostName} 
                onChange={(e) => setHostName(e.target.value)} 
                placeholder="Enter your fighter name..."
                className="bg-black/50 border-white/10"
              />
            </div>
          )}

          <div className="space-y-3">
            <Label>Focus Area</Label>
            <div className="grid grid-cols-2 gap-2">
              {focusAreas.map((area) => (
                <div
                  key={area.id}
                  onClick={() => setFocusArea(area.id as FocusArea)}
                  className={`
                    cursor-pointer p-3 rounded-md border text-center transition-all
                    ${focusArea === area.id 
                      ? 'bg-primary/20 border-primary text-primary shadow-[inset_0_0_10px_rgba(34,197,94,0.2)]' 
                      : 'bg-black/20 border-white/10 hover:bg-white/5 text-muted-foreground'}
                  `}
                >
                  <div className="font-bold uppercase text-sm">{area.name}</div>
                  <div className="text-[10px] opacity-70">{area.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Game Mode</Label>
            <Select value={burnoutType} onValueChange={(v) => setBurnoutType(v as BurnoutType)}>
              <SelectTrigger className="bg-black/50 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {burnoutTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <span className="font-bold">{type.name}</span> - <span className="text-muted-foreground text-xs">{type.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/10">
            <div className="space-y-0.5">
              <div className="font-medium flex items-center gap-2">
                {isPublic ? <Globe size={16} className="text-accent" /> : <Lock size={16} className="text-muted-foreground" />}
                {isPublic ? "Public Match" : "Private Lobby"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isPublic ? "Anyone can join via matchmaking" : "Only players with the code can join"}
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <Button 
          onClick={handleCreate} 
          disabled={createRoom.isPending || (!hostName && !user)}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-black font-bold h-12 uppercase tracking-widest"
        >
          {createRoom.isPending ? <Loader2 className="animate-spin" /> : "Initialize Room"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
