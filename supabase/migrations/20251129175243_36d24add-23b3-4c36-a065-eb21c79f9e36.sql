-- Add dashboard preferences column to profiles table
ALTER TABLE profiles 
ADD COLUMN dashboard_preferences JSONB DEFAULT NULL;