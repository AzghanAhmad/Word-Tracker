-- Quick fix script to add missing current_progress column to plans table
-- Run this if you're getting the "Unknown column 'current_progress'" error
-- This script will add the column safely (will error if column already exists, which is fine)

USE word_tracker;

-- Add the column (will fail if it already exists, which is okay)
ALTER TABLE plans 
ADD COLUMN current_progress INT DEFAULT 0;

-- Verify the column was added
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'word_tracker' 
  AND TABLE_NAME = 'plans' 
  AND COLUMN_NAME = 'current_progress';

