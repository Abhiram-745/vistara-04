import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Camera, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useTourReset } from "@/hooks/useTourReset";

interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdate?: () => void;
}

const ProfileSettings = ({ open, onOpenChange, onProfileUpdate }: ProfileSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { resetAllTours } = useTourReset();

  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
      
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data) {
        setFullName(data.full_name || "");
        setAvatarUrl(data.avatar_url || null);
      } else {
        // Create profile if doesn't exist
        const emailUsername = user.email?.split('@')[0] || "User";
        const fallbackName = user.user_metadata?.full_name || emailUsername;
        
        await supabase.from("profiles").insert({ 
          id: user.id, 
          full_name: fallbackName 
        });
        
        setFullName(fallbackName);
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Profile picture updated!");
      onProfileUpdate?.();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .upsert({ 
          id: user.id,
          full_name: fullName.trim() 
        }, {
          onConflict: 'id'
        });

      if (error) throw error;

      toast.success("Profile updated successfully");
      onProfileUpdate?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <User className="h-5 w-5 text-white" />
            </div>
            Profile Settings
          </DialogTitle>
          <DialogDescription className="text-base">
            Update your profile information and preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-primary text-white text-2xl">
                  {fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition-all shadow-lg ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-xs text-muted-foreground">Click camera to upload</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="full-name" className="text-sm font-semibold">Full Name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="h-11 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-muted/50 h-11 text-base"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"></span>
              Email address cannot be changed
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-6 hover:bg-muted transition-colors"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="px-6 bg-gradient-primary hover:opacity-90 transition-all duration-200 hover:scale-105 shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        <Separator className="my-6" />

        {/* Tutorial Reset Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-display font-semibold">Reset Tutorials</h3>
            <p className="text-sm text-muted-foreground">
              Restart all interactive tutorials to see the guided tours again when you visit each section.
            </p>
          </div>
          
          <Button
            onClick={resetAllTours}
            variant="outline"
            className="w-full gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All Tutorials
          </Button>
        </div>

        <Separator className="my-6" />

        {/* Export Account Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-display font-semibold">Export Account Data</h3>
            <p className="text-sm text-muted-foreground">
              Download all your Vistari data as a JSON file for backup or migration to another account.
            </p>
          </div>
          
          <Button
            onClick={async () => {
              try {
                setLoading(true);
                const { data, error } = await supabase.functions.invoke('export-account');
                
                if (error) throw error;
                
                // Create download
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vistari-export-${email}-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                toast.success("Export complete! Your data has been downloaded.");
              } catch (error: any) {
                console.error('Export error:', error);
                toast.error(error?.message || "Failed to export data. Please try again.");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? "Exporting..." : "Export Account Data"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettings;
