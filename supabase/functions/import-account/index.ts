import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { importData, mode } = await req.json();

    console.log('Starting import for user:', user.email, 'Mode:', mode);

    // Validate export data
    if (!importData?.export_version || !importData?.data) {
      return new Response(JSON.stringify({ error: 'Invalid export file format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const report: {
      success: Array<{ table: string; count?: number; item?: string }>;
      errors: Array<{ table: string; error: string; item?: string }>;
      skipped: Array<{ table: string; item: string; reason: string }>;
    } = {
      success: [],
      errors: [],
      skipped: [],
    };

    // If replace mode, delete existing data
    if (mode === 'replace') {
      console.log('Deleting existing user data...');
      const { data: userSubjects } = await supabaseClient
        .from('subjects')
        .select('id')
        .eq('user_id', user.id);
      
      const subjectIds = userSubjects?.map(s => s.id) || [];

      await Promise.all([
        supabaseClient.from('user_achievements').delete().eq('user_id', user.id),
        supabaseClient.from('study_insights').delete().eq('user_id', user.id),
        supabaseClient.from('session_analytics').delete().eq('user_id', user.id),
        supabaseClient.from('study_streaks').delete().eq('user_id', user.id),
        supabaseClient.from('weekly_goals').delete().eq('user_id', user.id),
        supabaseClient.from('topic_reflections').delete().eq('user_id', user.id),
        supabaseClient.from('topic_progress').delete().eq('user_id', user.id),
        supabaseClient.from('session_resources').delete().eq('user_id', user.id),
        supabaseClient.from('test_scores').delete().eq('user_id', user.id),
        supabaseClient.from('study_sessions').delete().eq('user_id', user.id),
        supabaseClient.from('events').delete().eq('user_id', user.id),
        supabaseClient.from('homeworks').delete().eq('user_id', user.id),
        supabaseClient.from('timetables').delete().eq('user_id', user.id),
        subjectIds.length > 0 && supabaseClient.from('topics').delete().in('subject_id', subjectIds),
        supabaseClient.from('subjects').delete().eq('user_id', user.id),
      ]);
    }

    // Import profile data
    if (importData.data.profile) {
      const { id, ...profileFields } = importData.data.profile;
      const { error } = await supabaseClient
        .from('profiles')
        .update(profileFields)
        .eq('id', user.id);
      
      if (error) {
        report.errors.push({ table: 'profiles', error: error.message });
      } else {
        report.success.push({ table: 'profiles', count: 1 });
      }
    }

    // Import study preferences
    if (importData.data.study_preferences) {
      const { id, user_id, ...prefFields } = importData.data.study_preferences;
      const { error } = await supabaseClient
        .from('study_preferences')
        .update(prefFields)
        .eq('user_id', user.id);
      
      if (error) {
        report.errors.push({ table: 'study_preferences', error: error.message });
      } else {
        report.success.push({ table: 'study_preferences', count: 1 });
      }
    }

    // Import subjects with ID mapping
    const subjectIdMap = new Map();
    if (importData.data.subjects?.length > 0) {
      for (const subject of importData.data.subjects) {
        const { id: oldId, created_at, ...subjectFields } = subject;
        const { data, error } = await supabaseClient
          .from('subjects')
          .insert({ ...subjectFields, user_id: user.id })
          .select()
          .single();
        
        if (error) {
          report.errors.push({ table: 'subjects', item: subject.name, error: error.message });
        } else if (data) {
          subjectIdMap.set(oldId, data.id);
          report.success.push({ table: 'subjects', item: subject.name });
        }
      }
    }

    // Import topics with mapped subject IDs
    if (importData.data.topics?.length > 0) {
      for (const topic of importData.data.topics) {
        const { id, created_at, subject_id: oldSubjectId, ...topicFields } = topic;
        const newSubjectId = subjectIdMap.get(oldSubjectId);
        
        if (!newSubjectId) {
          report.skipped.push({ table: 'topics', item: topic.name, reason: 'Subject not found' });
          continue;
        }

        const { error } = await supabaseClient
          .from('topics')
          .insert({ ...topicFields, subject_id: newSubjectId });
        
        if (error) {
          report.errors.push({ table: 'topics', item: topic.name, error: error.message });
        } else {
          report.success.push({ table: 'topics', item: topic.name });
        }
      }
    }

    // Import remaining data tables
    const tables = [
      { name: 'timetables', data: importData.data.timetables },
      { name: 'homework', data: importData.data.homework },
      { name: 'events', data: importData.data.events },
      { name: 'study_sessions', data: importData.data.study_sessions },
      { name: 'test_scores', data: importData.data.test_scores },
      { name: 'session_resources', data: importData.data.session_resources },
      { name: 'topic_progress', data: importData.data.topic_progress },
      { name: 'topic_reflections', data: importData.data.topic_reflections },
      { name: 'weekly_goals', data: importData.data.weekly_goals },
      { name: 'study_streaks', data: importData.data.study_streaks },
      { name: 'session_analytics', data: importData.data.session_analytics },
      { name: 'study_insights', data: importData.data.study_insights },
    ];

    for (const table of tables) {
      if (table.data?.length > 0) {
        const records = table.data.map((item: any) => {
          const { id, created_at, updated_at, ...rest } = item;
          return { ...rest, user_id: user.id };
        });

        const { error } = await supabaseClient.from(table.name).insert(records);
        
        if (error) {
          report.errors.push({ table: table.name, error: error.message });
        } else {
          report.success.push({ table: table.name, count: records.length });
        }
      }
    }

    console.log('Import completed:', report);

    return new Response(JSON.stringify({ success: true, report }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Import failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
