// src/hooks/useAuth.ts
// Thin wrapper around useSession for backwards compatibility.
// New code should import useSession directly.
export { useSession as useAuth } from './useSession'