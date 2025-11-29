import { pgTable, text, uuid, timestamp, boolean, integer, jsonb, date, numeric, time, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const appRoleEnum = pgEnum('app_role', ['paid', 'free']);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  fullName: text("full_name"),
  totalXp: integer("total_xp").default(0),
  level: integer("level").default(1),
  xpToNextLevel: integer("xp_to_next_level").default(100),
  title: text("title"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  role: appRoleEnum("role").default('free').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studyPreferences = pgTable("study_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  dailyStudyHours: integer("daily_study_hours").default(2),
  preferredStartTime: time("preferred_start_time").default('09:00:00'),
  preferredEndTime: time("preferred_end_time").default('17:00:00'),
  studyDays: jsonb("study_days").default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  breakDuration: integer("break_duration").default(15),
  sessionDuration: integer("session_duration").default(45),
  dayTimeSlots: jsonb("day_time_slots"),
  schoolStartTime: time("school_start_time"),
  schoolEndTime: time("school_end_time"),
  studyBeforeSchool: boolean("study_before_school").default(false),
  studyDuringLunch: boolean("study_during_lunch").default(false),
  studyDuringFreePeriods: boolean("study_during_free_periods").default(false),
  beforeSchoolStart: time("before_school_start"),
  beforeSchoolEnd: time("before_school_end"),
  lunchStart: time("lunch_start"),
  lunchEnd: time("lunch_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  examBoard: text("exam_board"),
  mode: text("mode").default('no-exam'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").references(() => subjects.id).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const testDates = pgTable("test_dates", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").references(() => subjects.id).notNull(),
  testDate: date("test_date").notNull(),
  testType: text("test_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timetables = pgTable("timetables", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  schedule: jsonb("schedule").notNull(),
  subjects: jsonb("subjects"),
  topics: jsonb("topics"),
  testDates: jsonb("test_dates"),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timetableHistory = pgTable("timetable_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  timetableId: uuid("timetable_id").references(() => timetables.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  schedule: jsonb("schedule").notNull(),
  subjects: jsonb("subjects"),
  testDates: jsonb("test_dates"),
  topics: jsonb("topics"),
  preferences: jsonb("preferences"),
  changeDescription: text("change_description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const homeworks = pgTable("homeworks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date").notNull(),
  completed: boolean("completed").default(false).notNull(),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  recurrenceRule: text("recurrence_rule"),
  recurrenceEndDate: timestamp("recurrence_end_date"),
  parentEventId: uuid("parent_event_id"),
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studySessions = pgTable("study_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  timetableId: uuid("timetable_id").references(() => timetables.id),
  sessionType: text("session_type").notNull(),
  subject: text("subject").notNull(),
  topic: text("topic"),
  plannedStart: timestamp("planned_start").notNull(),
  plannedEnd: timestamp("planned_end").notNull(),
  plannedDurationMinutes: integer("planned_duration_minutes").notNull(),
  actualStart: timestamp("actual_start"),
  actualEnd: timestamp("actual_end"),
  actualDurationMinutes: integer("actual_duration_minutes"),
  status: text("status").default('planned').notNull(),
  pauseTime: integer("pause_time").default(0),
  notes: text("notes"),
  focusScore: integer("focus_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studyStreaks = pgTable("study_streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  sessionsCompleted: integer("sessions_completed").default(0).notNull(),
  minutesStudied: integer("minutes_studied").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topicProgress = pgTable("topic_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  topicId: uuid("topic_id").references(() => topics.id).notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id).notNull(),
  progressPercentage: integer("progress_percentage").default(0).notNull(),
  masteryLevel: text("mastery_level").default('not_started').notNull(),
  successfulSessionsCount: integer("successful_sessions_count").default(0).notNull(),
  totalSessionsCount: integer("total_sessions_count").default(0).notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  nextReviewDate: date("next_review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const topicReflections = pgTable("topic_reflections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  timetableId: uuid("timetable_id").references(() => timetables.id).notNull(),
  sessionDate: text("session_date").notNull(),
  sessionIndex: integer("session_index").notNull(),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  reflectionData: jsonb("reflection_data").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studyInsights = pgTable("study_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  timetableId: uuid("timetable_id").references(() => timetables.id).notNull(),
  insightsData: jsonb("insights_data").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionAnalytics = pgTable("session_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  totalPlannedMinutes: integer("total_planned_minutes").default(0).notNull(),
  totalActualMinutes: integer("total_actual_minutes").default(0).notNull(),
  sessionsCompleted: integer("sessions_completed").default(0).notNull(),
  sessionsSkipped: integer("sessions_skipped").default(0).notNull(),
  averageFocusScore: numeric("average_focus_score", { precision: 3, scale: 2 }),
  subjectsStudied: jsonb("subjects_studied").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionResources = pgTable("session_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  timetableId: uuid("timetable_id").references(() => timetables.id).notNull(),
  sessionId: text("session_id").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  notes: text("notes"),
  type: text("type").default('link').notNull(),
  topic: text("topic"),
  subject: text("subject"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const testScores = pgTable("test_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  testDateId: uuid("test_date_id").references(() => testDates.id).notNull(),
  subject: text("subject").notNull(),
  testType: text("test_type").notNull(),
  testDate: date("test_date").notNull(),
  totalMarks: integer("total_marks").notNull(),
  marksObtained: integer("marks_obtained").notNull(),
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
  questionsCorrect: jsonb("questions_correct").default([]).notNull(),
  questionsIncorrect: jsonb("questions_incorrect").default([]).notNull(),
  aiAnalysis: jsonb("ai_analysis"),
  strengths: text("strengths").array(),
  weaknesses: text("weaknesses").array(),
  recommendations: text("recommendations").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const weeklyGoals = pgTable("weekly_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  weekStart: date("week_start").notNull(),
  targetHours: integer("target_hours").notNull(),
  currentHours: integer("current_hours").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usageLimits = pgTable("usage_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  timetableCreations: integer("timetable_creations").default(0).notNull(),
  timetableRegenerations: integer("timetable_regenerations").default(0).notNull(),
  dailyInsightsUsed: boolean("daily_insights_used").default(false).notNull(),
  aiInsightsGenerations: integer("ai_insights_generations").default(0).notNull(),
  lastResetDate: date("last_reset_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull(),
  tier: text("tier").notNull(),
  criteriaType: text("criteria_type").notNull(),
  criteriaValue: integer("criteria_value").notNull(),
  xpReward: integer("xp_reward").notNull(),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  achievementId: uuid("achievement_id").references(() => achievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  progress: integer("progress").default(0),
  isNew: boolean("is_new").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  friendId: uuid("friend_id").references(() => users.id).notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studyGroups = pgTable("study_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  subject: text("subject"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  isPrivate: boolean("is_private").default(false),
  joinCode: text("join_code").unique(),
  maxMembers: integer("max_members").default(10),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => studyGroups.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: text("role").default('member').notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow(),
});

export const groupMessages = pgTable("group_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => studyGroups.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  messageType: text("message_type").default('text'),
  metadata: jsonb("metadata").default({}),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupResources = pgTable("group_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => studyGroups.id).notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  resourceType: text("resource_type").notNull(),
  url: text("url").notNull(),
  filePath: text("file_path"),
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupInvitations = pgTable("group_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => studyGroups.id).notNull(),
  inviterId: uuid("inviter_id").references(() => users.id).notNull(),
  inviteeId: uuid("invitee_id").references(() => users.id).notNull(),
  status: text("status").default('pending').notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groupChallenges = pgTable("group_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => studyGroups.id).notNull().unique(),
  dailyHoursGoal: integer("daily_hours_goal").default(2).notNull(),
  weeklyHoursGoal: integer("weekly_hours_goal").default(0),
  monthlyHoursGoal: integer("monthly_hours_goal").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groupAchievements = pgTable("group_achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  achievementKey: text("achievement_key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  tier: text("tier").notNull(),
  requirementType: text("requirement_type").notNull(),
  requirementValue: integer("requirement_value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupAchievementUnlocks = pgTable("group_achievement_unlocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => studyGroups.id).notNull(),
  achievementId: uuid("achievement_id").references(() => groupAchievements.id).notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const groupChallengeCompletions = pgTable("group_challenge_completions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => studyGroups.id).notNull(),
  challengeType: text("challenge_type").notNull(),
  completedDate: date("completed_date").notNull(),
  hoursAchieved: numeric("hours_achieved").notNull(),
  goalHours: integer("goal_hours").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sharedTimetables = pgTable("shared_timetables", {
  id: uuid("id").primaryKey().defaultRandom(),
  timetableId: uuid("timetable_id").references(() => timetables.id).notNull(),
  sharedBy: uuid("shared_by").references(() => users.id).notNull(),
  groupId: uuid("group_id").references(() => studyGroups.id),
  isPublic: boolean("is_public").default(false),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bannedUsers = pgTable("banned_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  email: text("email"),
  bannedAt: timestamp("banned_at").defaultNow(),
  bannedBy: uuid("banned_by").notNull(),
  reason: text("reason"),
});

export const referralCodes = pgTable("referral_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  code: text("code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referralUses = pgTable("referral_uses", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralCodeId: uuid("referral_code_id").references(() => referralCodes.id).notNull(),
  referredUserId: uuid("referred_user_id").references(() => users.id).notNull(),
  isValid: boolean("is_valid").default(true).notNull(),
  validationReason: text("validation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const premiumGrants = pgTable("premium_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  grantType: text("grant_type").default('referral').notNull(),
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
