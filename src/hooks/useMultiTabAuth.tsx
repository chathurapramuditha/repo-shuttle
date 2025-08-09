import * as React from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

export function MultiTabAuthProvider({ children }: { children: React.ReactNode }) {
  // For simplicity, reuse the AuthProvider. In the future this can add cross-tab sync if needed.
  return <AuthProvider>{children}</AuthProvider>;
}

export function useMultiTabAuth() {
  return useAuth();
}
