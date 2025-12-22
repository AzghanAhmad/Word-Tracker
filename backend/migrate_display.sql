USE word_tracker;

ALTER TABLE plans 
DROP COLUMN display_theme,
DROP COLUMN calendar_view_mode;

ALTER TABLE plans
ADD COLUMN display_view_type VARCHAR(20) DEFAULT 'Table',
ADD COLUMN week_start_day VARCHAR(20) DEFAULT 'Mondays',
ADD COLUMN grouping_type VARCHAR(20) DEFAULT 'Day',
ADD COLUMN dashboard_color VARCHAR(10) DEFAULT '#000000';
