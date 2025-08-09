import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, User, Bell, Layers } from "lucide-react";

// Icons are properly imported from lucide-react

// Context for managing auth mode state
const AuthModeContext = React.createContext<{
  useMultiTabAuth: boolean;
  setUseMultiTabAuth: (value: boolean) => void;
} | null>(null);

export const AuthModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [useMultiTabAuth, setUseMultiTabAuth] = useState(false);
  return (
    <AuthModeContext.Provider value={{ useMultiTabAuth, setUseMultiTabAuth }}>
      {children}
    </AuthModeContext.Provider>
  );
};

export const useAuthMode = () => {
  const context = React.useContext(AuthModeContext);
  if (!context) {
    throw new Error('useAuthMode must be used within AuthModeProvider');
  }
  return context;
};

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  
  const [notifications, setNotifications] = useState(true);
  const [autoReports, setAutoReports] = useState(false);
  
  // Try to use auth mode context, fallback to local state for standalone usage
  let authModeState;
  try {
    authModeState = useAuthMode();
  } catch {
    const [useMultiTabAuth, setUseMultiTabAuth] = useState(false);
    authModeState = { useMultiTabAuth, setUseMultiTabAuth };
  }
  
  const { useMultiTabAuth, setUseMultiTabAuth } = authModeState;

  // Show auth mode toggle only in development or testing
  const showAuthModeToggle = window.location.hostname === 'localhost' || 
                            window.location.hostname.includes('lovableproject.com');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card text-card-foreground max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <div className="text-xs text-muted-foreground">
                    Receive notifications for overdue invoices and updates
                  </div>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatic Reports</Label>
                  <div className="text-xs text-muted-foreground">
                    Automatically generate and email weekly reports
                  </div>
                </div>
                <Switch
                  checked={autoReports}
                  onCheckedChange={setAutoReports}
                />
              </div>
            </CardContent>
          </Card>

          {/* Development Settings */}
          {showAuthModeToggle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4" />
                  Development Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Authentication Mode</Label>
                    <div className="text-xs text-muted-foreground">
                      Switch between single-tab and multi-tab authentication for testing
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Single-Tab</span>
                    <Switch
                      checked={useMultiTabAuth}
                      onCheckedChange={setUseMultiTabAuth}
                    />
                    <span className="text-sm text-muted-foreground">Multi-Tab</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                User Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time</SelectItem>
                    <SelectItem value="pst">Pacific Time</SelectItem>
                    <SelectItem value="gmt">GMT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}