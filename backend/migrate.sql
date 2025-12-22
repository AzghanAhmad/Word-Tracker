USE word_tracker;

ALTER TABLE plans 
ADD COLUMN starting_point INT DEFAULT 0,
ADD COLUMN measurement_unit VARCHAR(50) DEFAULT 'words',
ADD COLUMN is_daily_target BOOLEAN DEFAULT FALSE,
ADD COLUMN fixed_deadline BOOLEAN DEFAULT TRUE,
ADD COLUMN target_finish_date DATE,
ADD COLUMN strategy_intensity VARCHAR(20) DEFAULT 'Average',
ADD COLUMN weekend_approach VARCHAR(20) DEFAULT 'The Usual',
ADD COLUMN reserve_days INT DEFAULT 0,
ADD COLUMN display_theme VARCHAR(20) DEFAULT 'Light',
ADD COLUMN calendar_view_mode VARCHAR(20) DEFAULT 'Monthly',
ADD COLUMN show_historical_data BOOLEAN DEFAULT TRUE,
ADD COLUMN progress_tracking_type VARCHAR(50) DEFAULT 'Daily Goals';
