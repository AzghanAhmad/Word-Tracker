-- Word Tracker Database Setup Script
-- Run this script in phpMyAdmin or MySQL command line to set up the database

CREATE DATABASE IF NOT EXISTS word_tracker;
USE word_tracker;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    total_word_count INT NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    algorithm_type VARCHAR(50) DEFAULT 'steady',
    status ENUM('active', 'paused', 'completed') DEFAULT 'active',
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    starting_point INT DEFAULT 0,
    measurement_unit VARCHAR(50) DEFAULT 'words',
    is_daily_target BOOLEAN DEFAULT FALSE,
    fixed_deadline BOOLEAN DEFAULT TRUE,
    target_finish_date DATE,
    strategy_intensity VARCHAR(20) DEFAULT 'Average',
    weekend_approach VARCHAR(20) DEFAULT 'The Usual',
    reserve_days INT DEFAULT 0,
    display_view_type VARCHAR(20) DEFAULT 'Table',
    week_start_day VARCHAR(20) DEFAULT 'Mondays',
    grouping_type VARCHAR(20) DEFAULT 'Day',
    dashboard_color VARCHAR(10) DEFAULT '#000000',
    show_historical_data BOOLEAN DEFAULT TRUE,
    progress_tracking_type VARCHAR(50) DEFAULT 'Daily Goals',
    current_progress INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plan_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    date DATE NOT NULL,
    target_count INT NOT NULL DEFAULT 0,
    actual_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    UNIQUE KEY unique_plan_date (plan_id, date)
);

CREATE TABLE IF NOT EXISTS workload_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    day_of_week TINYINT NOT NULL,
    multiplier DECIMAL(3,2) DEFAULT 1.00,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS checklists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checklist_id INT NOT NULL,
    content TEXT NOT NULL,
    is_done BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'word_count',
    goal_count INT NOT NULL,
    duration_days INT NOT NULL DEFAULT 30,
    start_date DATE NOT NULL,
    end_date DATE,
    is_public BOOLEAN DEFAULT TRUE,
    invite_code VARCHAR(10),
    status ENUM('Active', 'Completed', 'Failed') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS challenge_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT NOT NULL,
    user_id INT NOT NULL,
    current_progress INT DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (challenge_id, user_id)
);

