import { motion, AnimatePresence } from "framer-motion";
import { GameCard } from "@shared/schema";
import { useEffect, useState } from "react";
import { Zap, Shield, Dumbbell } from "lucide-react";

interface CardOverlayProps {
  activeCard: GameCard | null;
}

export function CardOverlay({ activeCard }: CardOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (activeCard) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeCard]);

  if (!activeCard) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ type: "spring", damping: 12 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[2px]"
        >
          <div className="relative p-1 bg-gradient-to-br from-primary via-accent to-destructive rounded-2xl shadow-2xl shadow-primary/20">
            <div className="bg-card p-8 rounded-xl flex flex-col items-center text-center max-w-sm border border-white/10">
              <div className="mb-4 p-4 rounded-full bg-secondary">
                {activeCard.type === 'attack' && <Zap className="w-12 h-12 text-destructive animate-pulse" />}
                {activeCard.type === 'defense' && <Shield className="w-12 h-12 text-accent" />}
                {activeCard.type === 'buff' && <Dumbbell className="w-12 h-12 text-primary" />}
              </div>
              
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-2 uppercase italic tracking-tighter">
                {activeCard.name}
              </h2>
              
              <div className="text-xl font-medium text-white mb-2 uppercase tracking-widest text-stroke">
                {activeCard.type}
              </div>
              
              <p className="text-muted-foreground font-mono text-sm">
                {activeCard.description}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const MOCK_DECK: GameCard[] = [
  { id: '1', name: 'Gravity Spike', type: 'attack', description: 'Opponent does +5 reps', value: 5 },
  { id: '2', name: 'Iron Skin', type: 'defense', description: 'Ignore next attack' },
  { id: '3', name: 'Adrenaline', type: 'buff', description: '2x Score for 10s', duration: 10 },
  { id: '4', name: 'Time Warp', type: 'attack', description: 'Subtract 5s from opponent time', value: 5 },
  { id: '5', name: 'Zen Focus', type: 'buff', description: 'Auto-complete 5 reps', value: 5 },
];
