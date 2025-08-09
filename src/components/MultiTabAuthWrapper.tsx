import { AuthProvider } from "@/hooks/useAuth";
import { MultiTabAuthProvider } from "@/hooks/useMultiTabAuth";
import { useAuthMode } from "@/components/SettingsDialog";

interface MultiTabAuthWrapperProps {
  children: React.ReactNode;
}

export function MultiTabAuthWrapper({ children }: MultiTabAuthWrapperProps) {
  // Show auth mode selector if we're in development or testing
  const showModeSelector = window.location.hostname === 'localhost' || 
                          window.location.hostname.includes('lovableproject.com');

  if (showModeSelector) {
    // Try to use auth mode context, fallback to standard auth
    let useMultiTabAuth = false;
    try {
      const authMode = useAuthMode();
      useMultiTabAuth = authMode.useMultiTabAuth;
    } catch {
      // Context not available, use standard auth
    }

    // App with selected auth provider
    return useMultiTabAuth ? (
      <MultiTabAuthProvider>{children}</MultiTabAuthProvider>
    ) : (
      <AuthProvider>{children}</AuthProvider>
    );
  }

  // In production, always use standard auth
  return <AuthProvider>{children}</AuthProvider>;
}