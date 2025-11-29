import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GroupStats {
  groupId: string;
  todayHours: number;
  weekHours: number;
  monthHours: number;
  totalHours: number;
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting group achievement check...');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate date ranges
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Get all groups
    const { data: groups, error: groupsError } = await supabase
      .from('study_groups')
      .select('id');

    if (groupsError) throw groupsError;
    if (!groups || groups.length === 0) {
      console.log('No groups found');
      return new Response(JSON.stringify({ message: 'No groups to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Processing ${groups.length} groups...`);

    // Get all group challenges
    const { data: challenges } = await supabase
      .from('group_challenges')
      .select('*');

    const challengeMap = new Map(challenges?.map(c => [c.group_id, c]) || []);

    // Get all group members
    const { data: allMembers } = await supabase
      .from('group_members')
      .select('group_id, user_id');

    // Get all study streaks
    const { data: allStreaks } = await supabase
      .from('study_streaks')
      .select('user_id, date, minutes_studied')
      .gte('date', monthStartStr);

    // Calculate stats for each group
    const groupStats: GroupStats[] = [];

    for (const group of groups) {
      const members = allMembers?.filter(m => m.group_id === group.id) || [];
      const memberIds = members.map(m => m.user_id);
      const challenge = challengeMap.get(group.id);

      if (!challenge || memberIds.length === 0) continue;

      const todayStreaks = allStreaks?.filter(s => 
        memberIds.includes(s.user_id) && s.date === todayStr
      ) || [];
      const todayMinutes = todayStreaks.reduce((sum, s) => sum + s.minutes_studied, 0);

      const weekStreaks = allStreaks?.filter(s => 
        memberIds.includes(s.user_id) && s.date >= weekStartStr
      ) || [];
      const weekMinutes = weekStreaks.reduce((sum, s) => sum + s.minutes_studied, 0);

      const monthStreaks = allStreaks?.filter(s => 
        memberIds.includes(s.user_id) && s.date >= monthStartStr
      ) || [];
      const monthMinutes = monthStreaks.reduce((sum, s) => sum + s.minutes_studied, 0);

      // Calculate all-time total
      const { data: totalStreaks } = await supabase
        .from('study_streaks')
        .select('minutes_studied')
        .in('user_id', memberIds);
      const totalMinutes = totalStreaks?.reduce((sum, s) => sum + s.minutes_studied, 0) || 0;

      groupStats.push({
        groupId: group.id,
        todayHours: todayMinutes / 60,
        weekHours: weekMinutes / 60,
        monthHours: monthMinutes / 60,
        totalHours: totalMinutes / 60,
        dailyGoal: challenge.daily_hours_goal,
        weeklyGoal: challenge.weekly_hours_goal || 0,
        monthlyGoal: challenge.monthly_hours_goal || 0,
      });
    }

    console.log(`Calculated stats for ${groupStats.length} groups`);

    // Record challenge completions
    const completions = [];
    
    for (const stats of groupStats) {
      if (stats.dailyGoal > 0 && stats.todayHours >= stats.dailyGoal) {
        completions.push({
          group_id: stats.groupId,
          challenge_type: 'daily',
          completed_date: todayStr,
          hours_achieved: stats.todayHours,
          goal_hours: stats.dailyGoal,
        });
      }

      // Only check weekly on Sundays
      if (today.getDay() === 0 && stats.weeklyGoal > 0 && stats.weekHours >= stats.weeklyGoal) {
        completions.push({
          group_id: stats.groupId,
          challenge_type: 'weekly',
          completed_date: todayStr,
          hours_achieved: stats.weekHours,
          goal_hours: stats.weeklyGoal,
        });
      }

      // Only check monthly on last day of month
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const isLastDayOfMonth = tomorrow.getMonth() !== today.getMonth();
      
      if (isLastDayOfMonth && stats.monthlyGoal > 0 && stats.monthHours >= stats.monthlyGoal) {
        completions.push({
          group_id: stats.groupId,
          challenge_type: 'monthly',
          completed_date: todayStr,
          hours_achieved: stats.monthHours,
          goal_hours: stats.monthlyGoal,
        });
      }
    }

    if (completions.length > 0) {
      const { error: completionsError } = await supabase
        .from('group_challenge_completions')
        .upsert(completions, { onConflict: 'group_id,challenge_type,completed_date' });

      if (completionsError) {
        console.error('Error recording completions:', completionsError);
      } else {
        console.log(`Recorded ${completions.length} challenge completions`);
      }
    }

    // Check for achievement unlocks
    const { data: achievements } = await supabase
      .from('group_achievements')
      .select('*');

    if (!achievements) {
      console.log('No achievements defined');
      return new Response(JSON.stringify({ message: 'No achievements to check' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const newUnlocks = [];

    for (const stats of groupStats) {
      // Get existing unlocks for this group
      const { data: existingUnlocks } = await supabase
        .from('group_achievement_unlocks')
        .select('achievement_id')
        .eq('group_id', stats.groupId);

      const unlockedIds = new Set(existingUnlocks?.map(u => u.achievement_id) || []);

      // Get completions for streak calculations
      const { data: dailyCompletions } = await supabase
        .from('group_challenge_completions')
        .select('completed_date')
        .eq('group_id', stats.groupId)
        .eq('challenge_type', 'daily')
        .order('completed_date', { ascending: false })
        .limit(30);

      const { data: weeklyCompletions } = await supabase
        .from('group_challenge_completions')
        .select('completed_date')
        .eq('group_id', stats.groupId)
        .eq('challenge_type', 'weekly')
        .order('completed_date', { ascending: false })
        .limit(12);

      const { data: monthlyCompletions } = await supabase
        .from('group_challenge_completions')
        .select('completed_date')
        .eq('group_id', stats.groupId)
        .eq('challenge_type', 'monthly')
        .order('completed_date', { ascending: false })
        .limit(3);

      // Calculate streaks
      const dailyStreak = calculateStreak(dailyCompletions?.map(c => c.completed_date) || [], 'daily');
      const weeklyStreak = calculateStreak(weeklyCompletions?.map(c => c.completed_date) || [], 'weekly');
      const monthlyStreak = calculateStreak(monthlyCompletions?.map(c => c.completed_date) || [], 'monthly');

      // Check each achievement
      for (const achievement of achievements) {
        if (unlockedIds.has(achievement.id)) continue;

        let shouldUnlock = false;

        switch (achievement.requirement_type) {
          case 'daily_streak':
            shouldUnlock = dailyStreak >= achievement.requirement_value;
            break;
          case 'weekly_streak':
            shouldUnlock = weeklyStreak >= achievement.requirement_value;
            break;
          case 'monthly_streak':
            shouldUnlock = monthlyStreak >= achievement.requirement_value;
            break;
          case 'total_hours':
            shouldUnlock = stats.totalHours >= achievement.requirement_value;
            break;
        }

        if (shouldUnlock) {
          newUnlocks.push({
            group_id: stats.groupId,
            achievement_id: achievement.id,
          });
          console.log(`Group ${stats.groupId} unlocked: ${achievement.name}`);
        }
      }
    }

    if (newUnlocks.length > 0) {
      const { error: unlocksError } = await supabase
        .from('group_achievement_unlocks')
        .insert(newUnlocks);

      if (unlocksError) {
        console.error('Error recording unlocks:', unlocksError);
      } else {
        console.log(`Awarded ${newUnlocks.length} new achievements!`);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Achievement check complete',
        groupsProcessed: groupStats.length,
        completionsRecorded: completions.length,
        achievementsAwarded: newUnlocks.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in achievement check:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Calculate consecutive streak from completion dates
function calculateStreak(dates: string[], type: 'daily' | 'weekly' | 'monthly'): number {
  if (dates.length === 0) return 0;

  let streak = 0;
  const sortedDates = dates.sort((a, b) => b.localeCompare(a)); // newest first

  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);
    
    if (i === 0) {
      streak = 1;
      continue;
    }

    const previousDate = new Date(sortedDates[i - 1]);
    let expectedDiff: number;

    switch (type) {
      case 'daily':
        expectedDiff = 1;
        break;
      case 'weekly':
        expectedDiff = 7;
        break;
      case 'monthly':
        expectedDiff = 28; // approximate
        break;
    }

    const daysDiff = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (type === 'daily' && daysDiff === 1) {
      streak++;
    } else if (type === 'weekly' && daysDiff >= 6 && daysDiff <= 8) {
      streak++;
    } else if (type === 'monthly' && daysDiff >= 28 && daysDiff <= 32) {
      streak++;
    } else {
      break; // streak broken
    }
  }

  return streak;
}
