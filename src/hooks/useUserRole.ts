import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "paid" | "free";

export interface UsageLimits {
  timetableCreations: number;
  timetableRegenerations: number;
  dailyInsightsUsed: boolean;
  aiInsightsGenerations: number;
  lastResetDate: string;
}

const ADMIN_EMAILS = ['abhiramkakarla1@gmail.com', 'dhrishiv.panjabi@gmail.com'];

export const useUserRole = () => {
  return useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Admin users are always premium
      if (ADMIN_EMAILS.includes(user.email || '')) {
        return "paid" as UserRole;
      }

      // Check for active premium grant (from referrals)
      const { data: premiumGrant } = await supabase
        .from("premium_grants")
        .select("id")
        .eq("user_id", user.id)
        .lte("starts_at", new Date().toISOString())
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (premiumGrant) {
        return "paid" as UserRole;
      }

      // Check user_roles table
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return "free" as UserRole;
      }

      return (data?.role || "free") as UserRole;
    },
  });
};

export const useUsageLimits = () => {
  return useQuery({
    queryKey: ["usage-limits"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("usage_limits")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching usage limits:", error);
        return null;
      }

      if (!data) {
        return {
          timetableCreations: 0,
          timetableRegenerations: 0,
          dailyInsightsUsed: false,
          aiInsightsGenerations: 0,
          lastResetDate: new Date().toISOString().split("T")[0],
        } as UsageLimits;
      }

      return {
        timetableCreations: data.timetable_creations,
        timetableRegenerations: data.timetable_regenerations,
        dailyInsightsUsed: data.daily_insights_used,
        aiInsightsGenerations: data.ai_insights_generations,
        lastResetDate: data.last_reset_date,
      } as UsageLimits;
    },
  });
};

const checkHasActivePremiumGrant = async (userId: string): Promise<boolean> => {
  const { data } = await supabase.rpc("has_active_premium_grant", {
    _user_id: userId,
  });
  return data as boolean;
};

export const checkCanCreateTimetable = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Admins can always create
  if (ADMIN_EMAILS.includes(user.email || '')) {
    return true;
  }

  // Check for active premium grant
  if (await checkHasActivePremiumGrant(user.id)) {
    return true;
  }

  const { data, error } = await supabase.rpc("can_create_timetable", {
    _user_id: user.id,
  });

  if (error) {
    console.error("Error checking timetable creation permission:", error);
    return false;
  }

  return data as boolean;
};

export const checkCanRegenerateTimetable = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Admins can always regenerate
  if (ADMIN_EMAILS.includes(user.email || '')) {
    return true;
  }

  // Check for active premium grant
  if (await checkHasActivePremiumGrant(user.id)) {
    return true;
  }

  const { data, error } = await supabase.rpc("can_regenerate_timetable", {
    _user_id: user.id,
  });

  if (error) {
    console.error("Error checking timetable regeneration permission:", error);
    return false;
  }

  return data as boolean;
};

export const checkCanUseDailyInsights = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Admins can always use
  if (ADMIN_EMAILS.includes(user.email || '')) {
    return true;
  }

  // Check for active premium grant
  if (await checkHasActivePremiumGrant(user.id)) {
    return true;
  }

  const { data, error } = await supabase.rpc("can_use_daily_insights", {
    _user_id: user.id,
  });

  if (error) {
    console.error("Error checking daily insights permission:", error);
    return false;
  }

  return data as boolean;
};

export const checkCanGenerateAIInsights = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Admins can always generate
  if (ADMIN_EMAILS.includes(user.email || '')) {
    return true;
  }

  // Check for active premium grant
  if (await checkHasActivePremiumGrant(user.id)) {
    return true;
  }

  const { data, error } = await supabase.rpc("can_generate_ai_insights", {
    _user_id: user.id,
  });

  if (error) {
    console.error("Error checking AI insights generation permission:", error);
    return false;
  }

  return data as boolean;
};

export const incrementUsage = async (action: "timetable_creation" | "timetable_regeneration" | "daily_insights" | "ai_insights", queryClient?: any): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc("increment_usage", {
    _user_id: user.id,
    _action: action,
  });

  if (error) {
    console.error("Error incrementing usage:", error);
  } else {
    // Invalidate the usage limits query to refetch updated counts
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ["usage-limits"] });
    }
  }
};
