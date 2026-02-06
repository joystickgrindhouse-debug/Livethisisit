import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Room from "@/pages/room";
import GameSession from "@/pages/game";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/room/:code" component={Room} />
      <Route path="/game/:code" component={GameSession} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="flex h-screen w-full overflow-hidden bg-black">
            {/* Hub Sidebar Iframe */}
            <div className="w-[320px] border-r border-white/5 h-full hidden lg:block">
              <iframe 
                src="https://rivalishub.vercel.app/" 
                className="w-full h-full border-none"
                title="Rivalis Hub"
              />
            </div>
            
            {/* Main Application Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              <Toaster />
              <Router />
            </div>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
