CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'paid',
    'free'
);


--
-- Name: can_create_timetable(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_create_timetable(_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_role app_role;
  creation_count integer;
BEGIN
  user_role := public.get_user_role(_user_id);
  
  IF user_role = 'paid' THEN
    RETURN true;
  END IF;
  
  SELECT COALESCE(timetable_creations, 0)
  INTO creation_count
  FROM public.usage_limits
  WHERE user_id = _user_id;
  
  IF creation_count IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN creation_count < 1;
END;
$$;


--
-- Name: can_generate_ai_insights(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_generate_ai_insights(_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_role app_role;
  gen_count integer;
BEGIN
  user_role := public.get_user_role(_user_id);
  
  IF user_role = 'paid' THEN
    RETURN true;
  END IF;
  
  SELECT COALESCE(ai_insights_generations, 0)
  INTO gen_count
  FROM public.usage_limits
  WHERE user_id = _user_id;
  
  IF gen_count IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN gen_count < 1;
END;
$$;


--
-- Name: can_regenerate_timetable(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_regenerate_timetable(_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_role app_role;
  regen_count integer;
BEGIN
  user_role := public.get_user_role(_user_id);
  
  IF user_role = 'paid' THEN
    RETURN true;
  END IF;
  
  SELECT COALESCE(timetable_regenerations, 0)
  INTO regen_count
  FROM public.usage_limits
  WHERE user_id = _user_id;
  
  IF regen_count IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN regen_count < 1;
END;
$$;


--
-- Name: can_use_daily_insights(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_use_daily_insights(_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_role app_role;
  insights_used boolean;
BEGIN
  user_role := public.get_user_role(_user_id);
  
  IF user_role = 'paid' THEN
    RETURN true;
  END IF;
  
  PERFORM public.reset_daily_limits();
  
  SELECT COALESCE(daily_insights_used, false)
  INTO insights_used
  FROM public.usage_limits
  WHERE user_id = _user_id;
  
  IF insights_used IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN NOT insights_used;
END;
$$;


--
-- Name: check_and_grant_referral_premium(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_grant_referral_premium(_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  valid_referral_count INTEGER;
  rewards_already_granted INTEGER;
  rewards_to_grant INTEGER;
BEGIN
  -- Count valid referrals for this user's referral code
  SELECT COUNT(*) INTO valid_referral_count
  FROM public.referral_uses ru
  JOIN public.referral_codes rc ON rc.id = ru.referral_code_id
  WHERE rc.user_id = _user_id AND ru.is_valid = true;
  
  -- Calculate how many reward tiers earned (every 5 referrals = 1 tier)
  rewards_to_grant := valid_referral_count / 5;
  
  -- Check how many rewards already granted via premium_grants
  SELECT COUNT(*) INTO rewards_already_granted
  FROM public.premium_grants
  WHERE user_id = _user_id 
    AND grant_type = 'referral_reward';
  
  -- If new rewards earned, grant them
  IF rewards_to_grant > rewards_already_granted THEN
    -- Record the reward grant
    INSERT INTO public.premium_grants (user_id, grant_type, starts_at, expires_at)
    VALUES (_user_id, 'referral_reward', now(), now() + interval '100 years');
    
    -- Ensure usage_limits record exists
    INSERT INTO public.usage_limits (user_id, last_reset_date)
    VALUES (_user_id, CURRENT_DATE)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Decrease usage counts (effectively granting +1 creation and +1 regeneration)
    -- We decrease the counts so they have more remaining
    UPDATE public.usage_limits
    SET 
      timetable_creations = GREATEST(timetable_creations - 1, 0),
      timetable_regenerations = GREATEST(timetable_regenerations - 1, 0),
      updated_at = now()
    WHERE user_id = _user_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


--
-- Name: cleanup_expired_verifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_verifications() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.email_verifications
  WHERE expires_at < now();
END;
$$;


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'VIS' || upper(substr(md5(random()::text), 1, 5));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;


--
-- Name: get_referral_rewards_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_referral_rewards_count(_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COUNT(*)::integer
  FROM public.premium_grants
  WHERE user_id = _user_id 
    AND grant_type = 'referral_reward';
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Check if user is admin
  SELECT public.is_admin(_user_id) INTO is_admin_user;
  
  IF is_admin_user THEN
    RETURN 'paid'::app_role;
  END IF;
  
  -- Return stored role or default to 'free'
  RETURN COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = _user_id),
    'free'::app_role
  );
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.study_preferences (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;


--
-- Name: handle_new_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_email text;
  paid_emails text[] := ARRAY['abhiramkakarla1@gmail.com', '22UKakarlaA@qerdp.co.uk', '22upanjabid@qerdp.co.uk'];
BEGIN
  user_email := NEW.email;
  
  IF user_email = ANY(paid_emails) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'paid');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'free');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_active_premium_grant(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_active_premium_grant(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.premium_grants
    WHERE user_id = _user_id
      AND starts_at <= now()
      AND expires_at > now()
  );
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_usage(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_usage(_user_id uuid, _action text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.usage_limits (user_id, last_reset_date)
  VALUES (_user_id, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  
  PERFORM public.reset_daily_limits();
  
  CASE _action
    WHEN 'timetable_creation' THEN
      UPDATE public.usage_limits
      SET timetable_creations = timetable_creations + 1,
          updated_at = now()
      WHERE user_id = _user_id;
      
    WHEN 'timetable_regeneration' THEN
      UPDATE public.usage_limits
      SET timetable_regenerations = timetable_regenerations + 1,
          updated_at = now()
      WHERE user_id = _user_id;
      
    WHEN 'daily_insights' THEN
      UPDATE public.usage_limits
      SET daily_insights_used = true,
          updated_at = now()
      WHERE user_id = _user_id;
      
    WHEN 'ai_insights' THEN
      UPDATE public.usage_limits
      SET ai_insights_generations = ai_insights_generations + 1,
          updated_at = now()
      WHERE user_id = _user_id;
  END CASE;
END;
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = _user_id 
    AND email IN ('abhiramkakarla1@gmail.com', 'dhrishiv.panjabi@gmail.com')
  );
$$;


--
-- Name: reset_daily_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_daily_limits() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.usage_limits
  SET 
    daily_insights_used = false,
    last_reset_date = CURRENT_DATE,
    updated_at = now()
  WHERE last_reset_date < CURRENT_DATE;
END;
$$;


--
-- Name: save_timetable_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.save_timetable_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  latest_version INTEGER;
BEGIN
  -- Get the latest version number for this timetable
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM public.timetable_history
  WHERE timetable_id = NEW.id;

  -- Insert a new history entry
  INSERT INTO public.timetable_history (
    timetable_id,
    user_id,
    version_number,
    name,
    start_date,
    end_date,
    schedule,
    subjects,
    test_dates,
    topics,
    preferences,
    change_description
  ) VALUES (
    NEW.id,
    NEW.user_id,
    latest_version + 1,
    NEW.name,
    NEW.start_date,
    NEW.end_date,
    NEW.schedule,
    NEW.subjects,
    NEW.test_dates,
    NEW.topics,
    NEW.preferences,
    'Timetable updated'
  );

  RETURN NEW;
END;
$$;


--
-- Name: update_topic_reflections_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_topic_reflections_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    icon text NOT NULL,
    tier text NOT NULL,
    criteria_type text NOT NULL,
    criteria_value integer NOT NULL,
    xp_reward integer NOT NULL,
    is_hidden boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT achievements_category_check CHECK ((category = ANY (ARRAY['streak'::text, 'study_time'::text, 'completion'::text, 'social'::text, 'mastery'::text]))),
    CONSTRAINT achievements_tier_check CHECK ((tier = ANY (ARRAY['bronze'::text, 'silver'::text, 'gold'::text, 'platinum'::text])))
);


--
-- Name: banned_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banned_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    banned_at timestamp with time zone DEFAULT now(),
    banned_by uuid NOT NULL,
    reason text,
    email text
);


--
-- Name: email_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false,
    attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    recurrence_rule text,
    recurrence_end_date timestamp with time zone,
    parent_event_id uuid,
    is_recurring boolean DEFAULT false
);


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT friendships_check CHECK ((user_id <> friend_id)),
    CONSTRAINT friendships_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- Name: group_achievement_unlocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_achievement_unlocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now()
);


--
-- Name: group_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    achievement_key text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    tier text NOT NULL,
    requirement_type text NOT NULL,
    requirement_value integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_achievements_tier_check CHECK ((tier = ANY (ARRAY['bronze'::text, 'silver'::text, 'gold'::text, 'platinum'::text])))
);


--
-- Name: group_challenge_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_challenge_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    challenge_type text NOT NULL,
    completed_date date NOT NULL,
    hours_achieved numeric NOT NULL,
    goal_hours integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_challenge_completions_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])))
);


--
-- Name: group_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    daily_hours_goal integer DEFAULT 2 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    weekly_hours_goal integer DEFAULT 0,
    monthly_hours_goal integer DEFAULT 0
);


--
-- Name: group_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    inviter_id uuid NOT NULL,
    invitee_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active timestamp with time zone DEFAULT now(),
    CONSTRAINT group_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'moderator'::text, 'member'::text])))
);


--
-- Name: group_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    message_type text DEFAULT 'text'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT group_messages_message_type_check CHECK ((message_type = ANY (ARRAY['text'::text, 'resource'::text, 'timetable_share'::text])))
);


--
-- Name: group_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    title text NOT NULL,
    description text,
    resource_type text NOT NULL,
    url text NOT NULL,
    file_path text,
    likes_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT group_resources_resource_type_check CHECK ((resource_type = ANY (ARRAY['pdf'::text, 'link'::text, 'video'::text, 'note'::text])))
);


--
-- Name: homeworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homeworks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subject text NOT NULL,
    title text NOT NULL,
    description text,
    due_date date NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    duration integer
);


--
-- Name: premium_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.premium_grants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    grant_type text DEFAULT 'referral'::text NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    total_xp integer DEFAULT 0,
    level integer DEFAULT 1,
    xp_to_next_level integer DEFAULT 100,
    title text,
    avatar_url text
);


--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referral_uses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_uses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_code_id uuid NOT NULL,
    referred_user_id uuid NOT NULL,
    is_valid boolean DEFAULT true NOT NULL,
    validation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: session_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    total_planned_minutes integer DEFAULT 0 NOT NULL,
    total_actual_minutes integer DEFAULT 0 NOT NULL,
    sessions_completed integer DEFAULT 0 NOT NULL,
    sessions_skipped integer DEFAULT 0 NOT NULL,
    average_focus_score numeric(3,2),
    subjects_studied jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: session_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    timetable_id uuid NOT NULL,
    session_id text NOT NULL,
    title text NOT NULL,
    url text,
    notes text,
    type text DEFAULT 'link'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    topic text,
    subject text
);


--
-- Name: shared_timetables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_timetables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    timetable_id uuid NOT NULL,
    shared_by uuid NOT NULL,
    group_id uuid,
    is_public boolean DEFAULT false,
    view_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.shared_timetables REPLICA IDENTITY FULL;


--
-- Name: study_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    subject text,
    created_by uuid NOT NULL,
    is_private boolean DEFAULT false,
    join_code text,
    max_members integer DEFAULT 10,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    timetable_id uuid NOT NULL,
    insights_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    daily_study_hours integer DEFAULT 2,
    preferred_start_time time without time zone DEFAULT '09:00:00'::time without time zone,
    preferred_end_time time without time zone DEFAULT '17:00:00'::time without time zone,
    study_days jsonb DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]'::jsonb,
    break_duration integer DEFAULT 15,
    session_duration integer DEFAULT 45,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    day_time_slots jsonb DEFAULT '[{"day": "monday", "enabled": true, "endTime": "17:00", "startTime": "09:00"}, {"day": "tuesday", "enabled": true, "endTime": "17:00", "startTime": "09:00"}, {"day": "wednesday", "enabled": true, "endTime": "17:00", "startTime": "09:00"}, {"day": "thursday", "enabled": true, "endTime": "17:00", "startTime": "09:00"}, {"day": "friday", "enabled": true, "endTime": "17:00", "startTime": "09:00"}, {"day": "saturday", "enabled": true, "endTime": "17:00", "startTime": "09:00"}, {"day": "sunday", "enabled": true, "endTime": "17:00", "startTime": "09:00"}]'::jsonb,
    school_start_time time without time zone,
    school_end_time time without time zone,
    study_before_school boolean DEFAULT false,
    study_during_lunch boolean DEFAULT false,
    study_during_free_periods boolean DEFAULT false,
    before_school_start time without time zone,
    before_school_end time without time zone,
    lunch_start time without time zone,
    lunch_end time without time zone
);


--
-- Name: study_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    timetable_id uuid,
    session_type text NOT NULL,
    subject text NOT NULL,
    topic text,
    planned_start timestamp with time zone NOT NULL,
    planned_end timestamp with time zone NOT NULL,
    planned_duration_minutes integer NOT NULL,
    actual_start timestamp with time zone,
    actual_end timestamp with time zone,
    actual_duration_minutes integer,
    status text DEFAULT 'planned'::text NOT NULL,
    pause_time integer DEFAULT 0,
    notes text,
    focus_score integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT study_sessions_focus_score_check CHECK (((focus_score >= 1) AND (focus_score <= 10))),
    CONSTRAINT study_sessions_session_type_check CHECK ((session_type = ANY (ARRAY['revision'::text, 'homework'::text, 'test-prep'::text, 'break'::text]))),
    CONSTRAINT study_sessions_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'paused'::text, 'completed'::text, 'skipped'::text])))
);


--
-- Name: study_streaks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_streaks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    sessions_completed integer DEFAULT 0 NOT NULL,
    minutes_studied integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    exam_board text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_dates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_dates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    test_date date NOT NULL,
    test_type text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    test_date_id uuid NOT NULL,
    subject text NOT NULL,
    test_type text NOT NULL,
    test_date date NOT NULL,
    total_marks integer NOT NULL,
    marks_obtained integer NOT NULL,
    percentage numeric(5,2) NOT NULL,
    questions_correct jsonb DEFAULT '[]'::jsonb NOT NULL,
    questions_incorrect jsonb DEFAULT '[]'::jsonb NOT NULL,
    ai_analysis jsonb,
    strengths text[],
    weaknesses text[],
    recommendations text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: timetable_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetable_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    timetable_id uuid NOT NULL,
    user_id uuid NOT NULL,
    version_number integer NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    schedule jsonb NOT NULL,
    subjects jsonb,
    test_dates jsonb,
    topics jsonb,
    preferences jsonb,
    change_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: timetables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timetables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    schedule jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    subjects jsonb,
    topics jsonb,
    test_dates jsonb,
    preferences jsonb
);


--
-- Name: topic_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    topic_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    progress_percentage integer DEFAULT 0 NOT NULL,
    mastery_level text DEFAULT 'not_started'::text NOT NULL,
    successful_sessions_count integer DEFAULT 0 NOT NULL,
    total_sessions_count integer DEFAULT 0 NOT NULL,
    last_reviewed_at timestamp with time zone,
    next_review_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT topic_progress_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)))
);


--
-- Name: topic_reflections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic_reflections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    timetable_id uuid NOT NULL,
    session_date text NOT NULL,
    session_index integer NOT NULL,
    subject text NOT NULL,
    topic text NOT NULL,
    reflection_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subject_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: usage_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    timetable_creations integer DEFAULT 0 NOT NULL,
    timetable_regenerations integer DEFAULT 0 NOT NULL,
    daily_insights_used boolean DEFAULT false NOT NULL,
    ai_insights_generations integer DEFAULT 0 NOT NULL,
    last_reset_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
    progress integer DEFAULT 0,
    is_new boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'free'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: weekly_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weekly_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    week_start date NOT NULL,
    target_hours integer NOT NULL,
    current_hours integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: banned_users banned_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banned_users
    ADD CONSTRAINT banned_users_pkey PRIMARY KEY (id);


--
-- Name: banned_users banned_users_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banned_users
    ADD CONSTRAINT banned_users_user_id_key UNIQUE (user_id);


--
-- Name: email_verifications email_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_user_id_friend_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_id_friend_id_key UNIQUE (user_id, friend_id);


--
-- Name: group_achievement_unlocks group_achievement_unlocks_group_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_achievement_unlocks
    ADD CONSTRAINT group_achievement_unlocks_group_id_achievement_id_key UNIQUE (group_id, achievement_id);


--
-- Name: group_achievement_unlocks group_achievement_unlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_achievement_unlocks
    ADD CONSTRAINT group_achievement_unlocks_pkey PRIMARY KEY (id);


--
-- Name: group_achievements group_achievements_achievement_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_achievements
    ADD CONSTRAINT group_achievements_achievement_key_key UNIQUE (achievement_key);


--
-- Name: group_achievements group_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_achievements
    ADD CONSTRAINT group_achievements_pkey PRIMARY KEY (id);


--
-- Name: group_challenge_completions group_challenge_completions_group_id_challenge_type_complet_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_challenge_completions
    ADD CONSTRAINT group_challenge_completions_group_id_challenge_type_complet_key UNIQUE (group_id, challenge_type, completed_date);


--
-- Name: group_challenge_completions group_challenge_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_challenge_completions
    ADD CONSTRAINT group_challenge_completions_pkey PRIMARY KEY (id);


--
-- Name: group_challenges group_challenges_group_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_challenges
    ADD CONSTRAINT group_challenges_group_id_key UNIQUE (group_id);


--
-- Name: group_challenges group_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_challenges
    ADD CONSTRAINT group_challenges_pkey PRIMARY KEY (id);


--
-- Name: group_invitations group_invitations_group_id_invitee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_group_id_invitee_id_key UNIQUE (group_id, invitee_id);


--
-- Name: group_invitations group_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);


--
-- Name: group_messages group_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_pkey PRIMARY KEY (id);


--
-- Name: group_resources group_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_resources
    ADD CONSTRAINT group_resources_pkey PRIMARY KEY (id);


--
-- Name: homeworks homeworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homeworks
    ADD CONSTRAINT homeworks_pkey PRIMARY KEY (id);


--
-- Name: homeworks homeworks_user_title_subject_due_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homeworks
    ADD CONSTRAINT homeworks_user_title_subject_due_date_key UNIQUE (user_id, title, subject, due_date);


--
-- Name: premium_grants premium_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.premium_grants
    ADD CONSTRAINT premium_grants_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_uses referral_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_pkey PRIMARY KEY (id);


--
-- Name: session_analytics session_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_analytics
    ADD CONSTRAINT session_analytics_pkey PRIMARY KEY (id);


--
-- Name: session_analytics session_analytics_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_analytics
    ADD CONSTRAINT session_analytics_user_id_date_key UNIQUE (user_id, date);


--
-- Name: session_resources session_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_resources
    ADD CONSTRAINT session_resources_pkey PRIMARY KEY (id);


--
-- Name: shared_timetables shared_timetables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_timetables
    ADD CONSTRAINT shared_timetables_pkey PRIMARY KEY (id);


--
-- Name: study_groups study_groups_join_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_groups
    ADD CONSTRAINT study_groups_join_code_key UNIQUE (join_code);


--
-- Name: study_groups study_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_groups
    ADD CONSTRAINT study_groups_pkey PRIMARY KEY (id);


--
-- Name: study_insights study_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_insights
    ADD CONSTRAINT study_insights_pkey PRIMARY KEY (id);


--
-- Name: study_insights study_insights_user_id_timetable_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_insights
    ADD CONSTRAINT study_insights_user_id_timetable_id_key UNIQUE (user_id, timetable_id);


--
-- Name: study_preferences study_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_preferences
    ADD CONSTRAINT study_preferences_pkey PRIMARY KEY (id);


--
-- Name: study_preferences study_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_preferences
    ADD CONSTRAINT study_preferences_user_id_key UNIQUE (user_id);


--
-- Name: study_sessions study_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_pkey PRIMARY KEY (id);


--
-- Name: study_streaks study_streaks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_streaks
    ADD CONSTRAINT study_streaks_pkey PRIMARY KEY (id);


--
-- Name: study_streaks study_streaks_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_streaks
    ADD CONSTRAINT study_streaks_user_id_date_key UNIQUE (user_id, date);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: test_dates test_dates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_dates
    ADD CONSTRAINT test_dates_pkey PRIMARY KEY (id);


--
-- Name: test_scores test_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_scores
    ADD CONSTRAINT test_scores_pkey PRIMARY KEY (id);


--
-- Name: timetable_history timetable_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_history
    ADD CONSTRAINT timetable_history_pkey PRIMARY KEY (id);


--
-- Name: timetables timetables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_pkey PRIMARY KEY (id);


--
-- Name: topic_progress topic_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_progress
    ADD CONSTRAINT topic_progress_pkey PRIMARY KEY (id);


--
-- Name: topic_progress topic_progress_user_id_topic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_progress
    ADD CONSTRAINT topic_progress_user_id_topic_id_key UNIQUE (user_id, topic_id);


--
-- Name: topic_reflections topic_reflections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_reflections
    ADD CONSTRAINT topic_reflections_pkey PRIMARY KEY (id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: usage_limits usage_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_limits
    ADD CONSTRAINT usage_limits_pkey PRIMARY KEY (id);


--
-- Name: usage_limits usage_limits_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_limits
    ADD CONSTRAINT usage_limits_user_id_key UNIQUE (user_id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);


--
-- Name: weekly_goals weekly_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_goals
    ADD CONSTRAINT weekly_goals_pkey PRIMARY KEY (id);


--
-- Name: weekly_goals weekly_goals_user_id_week_start_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weekly_goals
    ADD CONSTRAINT weekly_goals_user_id_week_start_key UNIQUE (user_id, week_start);


--
-- Name: idx_achievement_unlocks_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_achievement_unlocks_group ON public.group_achievement_unlocks USING btree (group_id, unlocked_at DESC);


--
-- Name: idx_banned_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_banned_users_email ON public.banned_users USING btree (email);


--
-- Name: idx_challenge_completions_group_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_challenge_completions_group_date ON public.group_challenge_completions USING btree (group_id, challenge_type, completed_date DESC);


--
-- Name: idx_email_verifications_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verifications_email ON public.email_verifications USING btree (email);


--
-- Name: idx_email_verifications_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verifications_expires_at ON public.email_verifications USING btree (expires_at);


--
-- Name: idx_events_is_recurring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_is_recurring ON public.events USING btree (is_recurring);


--
-- Name: idx_events_parent_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_parent_event_id ON public.events USING btree (parent_event_id);


--
-- Name: idx_group_challenges_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_challenges_group ON public.group_challenges USING btree (group_id);


--
-- Name: idx_group_invitations_invitee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_invitee ON public.group_invitations USING btree (invitee_id);


--
-- Name: idx_group_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_status ON public.group_invitations USING btree (status);


--
-- Name: idx_session_resources_topic_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_resources_topic_subject ON public.session_resources USING btree (timetable_id, topic, subject);


--
-- Name: idx_study_insights_user_timetable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_study_insights_user_timetable ON public.study_insights USING btree (user_id, timetable_id);


--
-- Name: idx_test_scores_test_date_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_scores_test_date_id ON public.test_scores USING btree (test_date_id);


--
-- Name: idx_test_scores_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_scores_user_id ON public.test_scores USING btree (user_id);


--
-- Name: idx_timetable_history_timetable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_history_timetable_id ON public.timetable_history USING btree (timetable_id);


--
-- Name: idx_timetable_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timetable_history_user_id ON public.timetable_history USING btree (user_id);


--
-- Name: idx_topic_progress_next_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_progress_next_review ON public.topic_progress USING btree (user_id, next_review_date) WHERE (next_review_date IS NOT NULL);


--
-- Name: idx_topic_progress_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_progress_user_id ON public.topic_progress USING btree (user_id);


--
-- Name: idx_topic_reflections_user_timetable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_reflections_user_timetable ON public.topic_reflections USING btree (user_id, timetable_id);


--
-- Name: timetables trigger_save_timetable_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_save_timetable_history AFTER UPDATE ON public.timetables FOR EACH ROW EXECUTE FUNCTION public.save_timetable_history();


--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: friendships update_friendships_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: homeworks update_homeworks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_homeworks_updated_at BEFORE UPDATE ON public.homeworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: session_resources update_session_resources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_session_resources_updated_at BEFORE UPDATE ON public.session_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: study_preferences update_study_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_study_preferences_updated_at BEFORE UPDATE ON public.study_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: test_scores update_test_scores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_scores_updated_at BEFORE UPDATE ON public.test_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: topic_progress update_topic_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_topic_progress_updated_at BEFORE UPDATE ON public.topic_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: topic_reflections update_topic_reflections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_topic_reflections_updated_at BEFORE UPDATE ON public.topic_reflections FOR EACH ROW EXECUTE FUNCTION public.update_topic_reflections_updated_at();


--
-- Name: weekly_goals update_weekly_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_weekly_goals_updated_at BEFORE UPDATE ON public.weekly_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: banned_users banned_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banned_users
    ADD CONSTRAINT banned_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: events events_parent_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_parent_event_id_fkey FOREIGN KEY (parent_event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: group_achievement_unlocks group_achievement_unlocks_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_achievement_unlocks
    ADD CONSTRAINT group_achievement_unlocks_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.group_achievements(id) ON DELETE CASCADE;


--
-- Name: group_achievement_unlocks group_achievement_unlocks_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_achievement_unlocks
    ADD CONSTRAINT group_achievement_unlocks_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_challenge_completions group_challenge_completions_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_challenge_completions
    ADD CONSTRAINT group_challenge_completions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_challenges group_challenges_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_challenges
    ADD CONSTRAINT group_challenges_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_invitee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_inviter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_messages group_messages_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_messages group_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: group_resources group_resources_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_resources
    ADD CONSTRAINT group_resources_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: group_resources group_resources_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_resources
    ADD CONSTRAINT group_resources_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referral_uses referral_uses_referral_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE CASCADE;


--
-- Name: session_analytics session_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_analytics
    ADD CONSTRAINT session_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: session_resources session_resources_timetable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_resources
    ADD CONSTRAINT session_resources_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES public.timetables(id) ON DELETE CASCADE;


--
-- Name: shared_timetables shared_timetables_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_timetables
    ADD CONSTRAINT shared_timetables_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- Name: shared_timetables shared_timetables_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_timetables
    ADD CONSTRAINT shared_timetables_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shared_timetables shared_timetables_timetable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_timetables
    ADD CONSTRAINT shared_timetables_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES public.timetables(id) ON DELETE CASCADE;


--
-- Name: study_groups study_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_groups
    ADD CONSTRAINT study_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: study_insights study_insights_timetable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_insights
    ADD CONSTRAINT study_insights_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES public.timetables(id) ON DELETE CASCADE;


--
-- Name: study_preferences study_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_preferences
    ADD CONSTRAINT study_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: study_sessions study_sessions_timetable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES public.timetables(id) ON DELETE SET NULL;


--
-- Name: study_sessions study_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_sessions
    ADD CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subjects subjects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: test_dates test_dates_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_dates
    ADD CONSTRAINT test_dates_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: test_scores test_scores_test_date_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_scores
    ADD CONSTRAINT test_scores_test_date_id_fkey FOREIGN KEY (test_date_id) REFERENCES public.test_dates(id) ON DELETE CASCADE;


--
-- Name: timetable_history timetable_history_timetable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetable_history
    ADD CONSTRAINT timetable_history_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES public.timetables(id) ON DELETE CASCADE;


--
-- Name: timetables timetables_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timetables
    ADD CONSTRAINT timetables_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: topic_reflections topic_reflections_timetable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_reflections
    ADD CONSTRAINT topic_reflections_timetable_id_fkey FOREIGN KEY (timetable_id) REFERENCES public.timetables(id) ON DELETE CASCADE;


--
-- Name: topics topics_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: banned_users Admins can delete banned users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete banned users" ON public.banned_users FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: study_groups Admins can delete their groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete their groups" ON public.study_groups FOR DELETE USING ((created_by = auth.uid()));


--
-- Name: user_roles Admins can delete user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: banned_users Admins can insert banned users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert banned users" ON public.banned_users FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can insert user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can select all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can select all user roles" ON public.user_roles FOR SELECT TO authenticated USING ((public.is_admin(auth.uid()) OR (auth.uid() = user_id)));


--
-- Name: banned_users Admins can update banned users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update banned users" ON public.banned_users FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: study_groups Admins can update their groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their groups" ON public.study_groups FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = study_groups.id) AND (group_members.user_id = auth.uid()) AND (group_members.role = 'admin'::text)))));


--
-- Name: user_roles Admins can update user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: banned_users Admins can view all banned users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all banned users" ON public.banned_users FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: banned_users Anyone can check if email is banned; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can check if email is banned" ON public.banned_users FOR SELECT USING (true);


--
-- Name: email_verifications Anyone can delete verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete verification codes" ON public.email_verifications FOR DELETE USING (true);


--
-- Name: email_verifications Anyone can insert verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert verification codes" ON public.email_verifications FOR INSERT WITH CHECK (true);


--
-- Name: email_verifications Anyone can select verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can select verification codes" ON public.email_verifications FOR SELECT USING (true);


--
-- Name: email_verifications Anyone can update verification codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update verification codes" ON public.email_verifications FOR UPDATE USING (true);


--
-- Name: group_achievement_unlocks Anyone can view achievement unlocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view achievement unlocks" ON public.group_achievement_unlocks FOR SELECT USING (true);


--
-- Name: achievements Anyone can view achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);


--
-- Name: group_achievements Anyone can view group achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view group achievements" ON public.group_achievements FOR SELECT USING (true);


--
-- Name: study_groups Anyone can view groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view groups" ON public.study_groups FOR SELECT USING (true);


--
-- Name: shared_timetables Anyone can view public shared timetables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view public shared timetables" ON public.shared_timetables FOR SELECT USING ((is_public OR (auth.uid() = shared_by) OR (EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = shared_timetables.group_id) AND (group_members.user_id = auth.uid()))))));


--
-- Name: group_members Authenticated users can view all group members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all group members" ON public.group_members FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Authenticated users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: study_sessions Authenticated users can view all sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all sessions" ON public.study_sessions FOR SELECT TO authenticated USING (true);


--
-- Name: group_invitations Group admins can invite members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group admins can invite members" ON public.group_invitations FOR INSERT WITH CHECK (((auth.uid() = inviter_id) AND (EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_invitations.group_id) AND (group_members.user_id = auth.uid()) AND (group_members.role = 'admin'::text))))));


--
-- Name: group_challenges Group admins can manage challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group admins can manage challenges" ON public.group_challenges USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_challenges.group_id) AND (group_members.user_id = auth.uid()) AND (group_members.role = 'admin'::text)))));


--
-- Name: group_members Group creators can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group creators can manage members" ON public.group_members FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.study_groups
  WHERE ((study_groups.id = group_members.group_id) AND (study_groups.created_by = auth.uid())))));


--
-- Name: group_members Group creators can remove members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group creators can remove members" ON public.group_members FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.study_groups
  WHERE ((study_groups.id = group_members.group_id) AND (study_groups.created_by = auth.uid())))));


--
-- Name: group_challenge_completions Group members can view challenge completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group members can view challenge completions" ON public.group_challenge_completions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_challenge_completions.group_id) AND (group_members.user_id = auth.uid())))));


--
-- Name: group_challenges Group members can view group challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group members can view group challenges" ON public.group_challenges FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_challenges.group_id) AND (group_members.user_id = auth.uid())))));


--
-- Name: timetables Group members can view shared timetables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group members can view shared timetables" ON public.timetables FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM (public.shared_timetables st
     JOIN public.group_members gm ON ((gm.group_id = st.group_id)))
  WHERE ((st.timetable_id = timetables.id) AND (gm.user_id = auth.uid()))))));


--
-- Name: group_invitations Invitees can update their invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Invitees can update their invitations" ON public.group_invitations FOR UPDATE USING ((auth.uid() = invitee_id));


--
-- Name: group_invitations Inviters can delete their invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Inviters can delete their invitations" ON public.group_invitations FOR DELETE USING ((auth.uid() = inviter_id));


--
-- Name: group_messages Members can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can send messages" ON public.group_messages FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_messages.group_id) AND (group_members.user_id = auth.uid()))))));


--
-- Name: group_resources Members can upload resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can upload resources" ON public.group_resources FOR INSERT WITH CHECK (((auth.uid() = uploaded_by) AND (EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_resources.group_id) AND (group_members.user_id = auth.uid()))))));


--
-- Name: group_messages Members can view group messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view group messages" ON public.group_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_messages.group_id) AND (group_members.user_id = auth.uid())))));


--
-- Name: group_resources Members can view group resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view group resources" ON public.group_resources FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_resources.group_id) AND (group_members.user_id = auth.uid())))));


--
-- Name: group_achievement_unlocks System can insert achievement unlocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert achievement unlocks" ON public.group_achievement_unlocks FOR INSERT WITH CHECK (true);


--
-- Name: group_challenge_completions System can insert challenge completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert challenge completions" ON public.group_challenge_completions FOR INSERT WITH CHECK (true);


--
-- Name: premium_grants System can insert premium grants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert premium grants" ON public.premium_grants FOR INSERT WITH CHECK (true);


--
-- Name: referral_uses System can insert referral uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert referral uses" ON public.referral_uses FOR INSERT WITH CHECK (true);


--
-- Name: friendships Users can accept/reject friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can accept/reject friend requests" ON public.friendships FOR UPDATE USING ((auth.uid() = friend_id));


--
-- Name: friendships Users can create friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create friend requests" ON public.friendships FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (status = 'pending'::text)));


--
-- Name: study_groups Users can create groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create groups" ON public.study_groups FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: timetable_history Users can create history entries for own timetables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create history entries for own timetables" ON public.timetable_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: referral_codes Users can create own referral code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own referral code" ON public.referral_codes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: study_insights Users can create their own insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own insights" ON public.study_insights FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: topic_reflections Users can create their own reflections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own reflections" ON public.topic_reflections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: friendships Users can delete friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete friendships" ON public.friendships FOR DELETE USING (((auth.uid() = user_id) OR (auth.uid() = friend_id)));


--
-- Name: group_messages Users can delete own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own messages" ON public.group_messages FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: study_insights Users can delete their own insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own insights" ON public.study_insights FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: topic_reflections Users can delete their own reflections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own reflections" ON public.topic_reflections FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: group_members Users can join groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: session_analytics Users can manage own analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own analytics" ON public.session_analytics USING ((auth.uid() = user_id));


--
-- Name: events Users can manage own events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own events" ON public.events USING ((auth.uid() = user_id));


--
-- Name: weekly_goals Users can manage own goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own goals" ON public.weekly_goals USING ((auth.uid() = user_id));


--
-- Name: homeworks Users can manage own homeworks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own homeworks" ON public.homeworks USING ((auth.uid() = user_id));


--
-- Name: study_preferences Users can manage own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own preferences" ON public.study_preferences USING ((auth.uid() = user_id));


--
-- Name: group_resources Users can manage own resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own resources" ON public.group_resources USING ((auth.uid() = uploaded_by));


--
-- Name: shared_timetables Users can manage own shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own shares" ON public.shared_timetables USING ((auth.uid() = shared_by));


--
-- Name: study_streaks Users can manage own study streaks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own study streaks" ON public.study_streaks TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: subjects Users can manage own subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own subjects" ON public.subjects USING ((auth.uid() = user_id));


--
-- Name: timetables Users can manage own timetables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own timetables" ON public.timetables USING ((auth.uid() = user_id));


--
-- Name: usage_limits Users can manage own usage limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own usage limits" ON public.usage_limits TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: test_dates Users can manage test dates for their subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage test dates for their subjects" ON public.test_dates USING ((EXISTS ( SELECT 1
   FROM public.subjects
  WHERE ((subjects.id = test_dates.subject_id) AND (subjects.user_id = auth.uid())))));


--
-- Name: session_resources Users can manage their own session resources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own session resources" ON public.session_resources USING ((auth.uid() = user_id));


--
-- Name: study_sessions Users can manage their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own sessions" ON public.study_sessions TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: test_scores Users can manage their own test scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own test scores" ON public.test_scores USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: topic_progress Users can manage their own topic progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own topic progress" ON public.topic_progress USING ((auth.uid() = user_id));


--
-- Name: topics Users can manage topics for their subjects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage topics for their subjects" ON public.topics USING ((EXISTS ( SELECT 1
   FROM public.subjects
  WHERE ((subjects.id = topics.subject_id) AND (subjects.user_id = auth.uid())))));


--
-- Name: shared_timetables Users can share own timetables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can share own timetables" ON public.shared_timetables FOR INSERT WITH CHECK ((auth.uid() = shared_by));


--
-- Name: user_achievements Users can update own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own achievements" ON public.user_achievements FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: group_messages Users can update own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own messages" ON public.group_messages FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: study_insights Users can update their own insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own insights" ON public.study_insights FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: topic_reflections Users can update their own reflections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own reflections" ON public.topic_reflections FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: study_streaks Users can view all study streaks for leaderboard; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all study streaks for leaderboard" ON public.study_streaks FOR SELECT TO authenticated USING (true);


--
-- Name: group_invitations Users can view invitations they sent or received; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invitations they sent or received" ON public.group_invitations FOR SELECT USING (((auth.uid() = inviter_id) OR (auth.uid() = invitee_id)));


--
-- Name: user_achievements Users can view own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: friendships Users can view own friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() = friend_id)));


--
-- Name: premium_grants Users can view own premium grants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own premium grants" ON public.premium_grants FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referral_codes Users can view own referral code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referral code" ON public.referral_codes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: timetable_history Users can view own timetable history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own timetable history" ON public.timetable_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referral_uses Users can view referrals they made; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view referrals they made" ON public.referral_uses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.referral_codes rc
  WHERE ((rc.id = referral_uses.referral_code_id) AND (rc.user_id = auth.uid())))));


--
-- Name: study_insights Users can view their own insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own insights" ON public.study_insights FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: topic_reflections Users can view their own reflections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reflections" ON public.topic_reflections FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: banned_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

--
-- Name: email_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: friendships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

--
-- Name: group_achievement_unlocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_achievement_unlocks ENABLE ROW LEVEL SECURITY;

--
-- Name: group_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: group_challenge_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_challenge_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: group_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: group_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: group_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: group_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: homeworks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;

--
-- Name: premium_grants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.premium_grants ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_uses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

--
-- Name: session_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: session_resources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_resources ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_timetables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_timetables ENABLE ROW LEVEL SECURITY;

--
-- Name: study_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: study_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: study_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: study_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: study_streaks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_streaks ENABLE ROW LEVEL SECURITY;

--
-- Name: subjects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: test_dates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_dates ENABLE ROW LEVEL SECURITY;

--
-- Name: test_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: timetable_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timetable_history ENABLE ROW LEVEL SECURITY;

--
-- Name: timetables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

--
-- Name: topic_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: topic_reflections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topic_reflections ENABLE ROW LEVEL SECURITY;

--
-- Name: topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: weekly_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


