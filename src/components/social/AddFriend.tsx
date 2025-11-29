import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface AddFriendProps {
  userId: string;
}

const AddFriend = ({ userId }: AddFriendProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a name to search");
      return;
    }

    setSearching(true);
    setSearchResults([]);
    
    try {
      // Search profiles by name (only search text fields, not UUIDs)
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .not("full_name", "is", null)
        .neq("id", userId)
        .limit(10);

      if (profileError) throw profileError;

      // Filter results client-side for case-insensitive search
      const filteredProfiles = profiles?.filter(p => 
        p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      ) || [];

      if (filteredProfiles.length === 0) {
        toast.error("No users found with that name");
        setSearching(false);
        return;
      }

      setSearchResults(filteredProfiles);
    } catch (error: any) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (friendId: string, friendName: string) => {
    setLoading(true);
    try {
      // Ensure we use the authenticated user's id for RLS
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        throw new Error("You need to be logged in to send friend requests.");
      }

      const currentUserId = user.id;

      // Check if friendship already exists (in either direction)
      const { data: existing, error: existingError } = await supabase
        .from("friendships")
        .select("*")
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        toast.error("Friend request already exists");
        setLoading(false);
        return;
      }

      // Create friend request - must satisfy RLS: auth.uid() = user_id AND status = 'pending'
      const { error: insertError } = await supabase
        .from("friendships")
        .insert({
          user_id: currentUserId,
          friend_id: friendId,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast.success(`Friend request sent to ${friendName}!`);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error: any) {
      console.error("Error adding friend:", error);
      toast.error(error.message || "Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name || name.trim() === "") return "?";
    return name
      .split(" ")
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Add Friend
        </CardTitle>
        <CardDescription>
          Search for friends by their name (e.g., "Mike Papa")
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch} 
            disabled={searching}
            className="bg-gradient-primary hover:opacity-90"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4" />
              </>
            )}
          </Button>
          {searchResults.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setSearchResults([]);
                setSearchQuery("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 animate-fade-in">
            <p className="text-sm font-medium text-muted-foreground">
              Found {searchResults.length} user{searchResults.length !== 1 ? "s" : ""}:
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((result) => (
                <div 
                  key={result.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={result.avatar_url} />
                      <AvatarFallback className="bg-gradient-primary text-white text-sm">
                        {getInitials(result.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  <div>
                    <p className="font-medium">{result.full_name || "Unknown User"}</p>
                    <p className="text-xs text-muted-foreground">Study Planner User</p>
                  </div>
                  </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddFriend(result.id, result.full_name || "Unknown User")}
                      disabled={loading}
                      className="gap-2"
                    >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AddFriend;
