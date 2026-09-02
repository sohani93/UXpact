// The five locked top-level workspace destinations, left to right, shared by
// App.tsx's router and the persistent bottom nav. Single source of truth so
// the two never drift out of sync.
export const DESTINATIONS = ["diagnosis", "blueprint", "vision-pro", "pulse", "premium"] as const;
export type Destination = (typeof DESTINATIONS)[number];

export function isDestination(value: string): value is Destination {
  return (DESTINATIONS as readonly string[]).includes(value);
}
