## Packages
zustand | Global state management for game loop and room state
framer-motion | Complex animations for game elements (cards, transitions)
lucide-react | Icons (already in base, but emphasizing heavy usage)
clsx | Utility for conditional classes
tailwind-merge | Utility for merging tailwind classes

## Notes
WebSocket connection required at `ws://${window.location.host}/ws`
Protocol involves sending/receiving typed JSON messages: { type: string, payload: any }
Game loop is host-driven; clients sync to host state
Theme is Cyberpunk/Athletic (Dark mode default)
