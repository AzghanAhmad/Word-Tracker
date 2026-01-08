using MySqlConnector;

namespace WordTracker.Api.Services;

public class DbInitService
{
    private readonly string _connectionString;
    private readonly string _databaseName;

    public DbInitService(string connectionString, string databaseName = "word_tracker")
    {
        _connectionString = connectionString;
        _databaseName = databaseName;
    }

    public async Task InitializeDatabaseAsync()
    {
        try
        {
            // Extract connection string without database name for initial connection
            var baseConnString = _connectionString;
            if (baseConnString.Contains($"Database={_databaseName}"))
            {
                baseConnString = baseConnString.Replace($"Database={_databaseName};", "")
                                               .Replace($"Database={_databaseName}", "");
            }

            // Connect without database to create it
            using var conn = new MySqlConnection(baseConnString);
            await conn.OpenAsync();

            // Create database if not exists
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = $"CREATE DATABASE IF NOT EXISTS `{_databaseName}`";
                await cmd.ExecuteNonQueryAsync();
            }

            // Now connect to the specific database
            using var dbConn = new MySqlConnection(_connectionString);
            await dbConn.OpenAsync();

            // Create tables
            await CreateTablesAsync(dbConn);
            
            Console.WriteLine($"✓ Database '{_databaseName}' initialized successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"✗ Database initialization failed: {ex.Message}");
            throw;
        }
    }

    private async Task CreateTablesAsync(MySqlConnection conn)
    {
        // Check if we should reset the database (set RESET_DB=true in Railway to force schema reset)
        var resetDb = Environment.GetEnvironmentVariable("RESET_DB")?.ToLower() == "true";
        
        if (resetDb)
        {
            // Drop existing tables to ensure clean schema
            var dropTables = new[]
            {
                "DROP TABLE IF EXISTS checklist_items",
                "DROP TABLE IF EXISTS checklists",
                "DROP TABLE IF EXISTS challenges",
                "DROP TABLE IF EXISTS workload_rules",
                "DROP TABLE IF EXISTS plan_days",
                "DROP TABLE IF EXISTS plans",
                "DROP TABLE IF EXISTS users"
            };
            
            Console.WriteLine("🗑️ RESET_DB=true - Dropping existing tables for clean schema...");
            foreach (var dropSql in dropTables)
            {
                using var dropCmd = conn.CreateCommand();
                dropCmd.CommandText = dropSql;
                await dropCmd.ExecuteNonQueryAsync();
            }
            Console.WriteLine("✓ Tables dropped - will be recreated with new schema");
        }
        
        var tables = new[]
        {
            @"CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                bio TEXT,
                avatar_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )",
            
            @"CREATE TABLE IF NOT EXISTS user_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
                week_start_day VARCHAR(20) DEFAULT 'Monday',
                email_reminders_enabled BOOLEAN DEFAULT FALSE,
                reminder_timezone VARCHAR(100) DEFAULT 'GMT +00:00',
                reminder_frequency VARCHAR(100) DEFAULT 'Daily @ 8AM',
                professions JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_settings (user_id)
            )",
            
            @"CREATE TABLE IF NOT EXISTS plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                total_word_count INT NOT NULL DEFAULT 0,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                algorithm_type VARCHAR(50) DEFAULT 'steady',
                status VARCHAR(50) DEFAULT 'active',
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
                activity_type VARCHAR(50) DEFAULT 'Writing',
                content_type VARCHAR(50) DEFAULT 'Novel',
                current_progress INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )",
            
            @"CREATE TABLE IF NOT EXISTS plan_days (
                id INT AUTO_INCREMENT PRIMARY KEY,
                plan_id INT NOT NULL,
                date DATE NOT NULL,
                target_count INT NOT NULL DEFAULT 0,
                actual_count INT DEFAULT 0,
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
                UNIQUE KEY unique_plan_date (plan_id, date)
            )",
            
            @"CREATE TABLE IF NOT EXISTS workload_rules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                plan_id INT NOT NULL,
                day_of_week TINYINT NOT NULL,
                multiplier DECIMAL(3,2) DEFAULT 1.00,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
            )",
            
            @"CREATE TABLE IF NOT EXISTS checklists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                plan_id INT DEFAULT NULL,
                name VARCHAR(255) NOT NULL,
                is_archived BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
            )",
            
            @"CREATE TABLE IF NOT EXISTS checklist_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                checklist_id INT NOT NULL,
                content TEXT NOT NULL,
                is_done BOOLEAN DEFAULT FALSE,
                sort_order INT DEFAULT 0,
                FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
            )",
            
            @"CREATE TABLE IF NOT EXISTS challenges (
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
            )",
            
            @"CREATE TABLE IF NOT EXISTS challenge_participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                challenge_id INT NOT NULL,
                user_id INT NOT NULL,
                current_progress INT DEFAULT 0,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_participant (challenge_id, user_id)
            )",
            
            @"CREATE TABLE IF NOT EXISTS challenge_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                challenge_id INT NOT NULL,
                user_id INT NOT NULL,
                log_date DATE NOT NULL,
                word_count INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_challenge_user_date (challenge_id, user_id, log_date)
            )",
            
            @"CREATE TABLE IF NOT EXISTS feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT NULL,
                type VARCHAR(50) NOT NULL DEFAULT 'general',
                email VARCHAR(255) DEFAULT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )",
            
            @"CREATE TABLE IF NOT EXISTS projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255),
                description TEXT,
                is_private BOOLEAN DEFAULT FALSE,
                is_archived BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )",
            
            @"CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                INDEX idx_email (email)
            )"
        };

        foreach (var tableSql in tables)
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = tableSql;
            await cmd.ExecuteNonQueryAsync();
        }
        
        // Run schema migrations for existing databases
        await MigrateSchemaAsync(conn);
    }
    
    /// <summary>
    /// Migrate existing database schema to current version
    /// Handles column renames and additions for backwards compatibility
    /// </summary>
    private async Task MigrateSchemaAsync(MySqlConnection conn)
    {
        try
        {
            // Check if feedback table exists, create if not
            using var checkFeedbackCmd = conn.CreateCommand();
            checkFeedbackCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.TABLES 
                                             WHERE TABLE_SCHEMA = DATABASE() 
                                             AND TABLE_NAME = 'feedback'";
            var feedbackTableExists = Convert.ToInt32(await checkFeedbackCmd.ExecuteScalarAsync()) > 0;
            
            if (!feedbackTableExists)
            {
                Console.WriteLine("📦 Creating feedback table...");
                using var createFeedbackCmd = conn.CreateCommand();
                createFeedbackCmd.CommandText = @"CREATE TABLE IF NOT EXISTS feedback (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT DEFAULT NULL,
                    type VARCHAR(50) NOT NULL DEFAULT 'general',
                    email VARCHAR(255) DEFAULT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                )";
                await createFeedbackCmd.ExecuteNonQueryAsync();
                Console.WriteLine("✓ Feedback table created");
            }

            // Check if projects table exists, create if not
            using var checkProjectsCmd = conn.CreateCommand();
            checkProjectsCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.TABLES 
                                             WHERE TABLE_SCHEMA = DATABASE() 
                                             AND TABLE_NAME = 'projects'";
            var projectsTableExists = Convert.ToInt32(await checkProjectsCmd.ExecuteScalarAsync()) > 0;
            
            if (!projectsTableExists)
            {
                Console.WriteLine("📦 Creating projects table...");
                using var createProjectsCmd = conn.CreateCommand();
                createProjectsCmd.CommandText = @"CREATE TABLE IF NOT EXISTS projects (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    subtitle VARCHAR(255),
                    description TEXT,
                    is_private BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )";
                await createProjectsCmd.ExecuteNonQueryAsync();
                Console.WriteLine("✓ Projects table created");
            }

            // Check if newsletter_subscriptions table exists, create if not
            using var checkNewsletterCmd = conn.CreateCommand();
            checkNewsletterCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.TABLES 
                                             WHERE TABLE_SCHEMA = DATABASE() 
                                             AND TABLE_NAME = 'newsletter_subscriptions'";
            var newsletterTableExists = Convert.ToInt32(await checkNewsletterCmd.ExecuteScalarAsync()) > 0;
            
            if (!newsletterTableExists)
            {
                Console.WriteLine("📦 Creating newsletter_subscriptions table...");
                using var createNewsletterCmd = conn.CreateCommand();
                createNewsletterCmd.CommandText = @"CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    INDEX idx_email (email)
                )";
                await createNewsletterCmd.ExecuteNonQueryAsync();
                Console.WriteLine("✓ Newsletter subscriptions table created");
            }

            // Check if 'plans' table has 'plan_name' column (old schema) instead of 'title' (new schema)
            using var checkCmd = conn.CreateCommand();
            checkCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.COLUMNS 
                                     WHERE TABLE_SCHEMA = DATABASE() 
                                     AND TABLE_NAME = 'plans' 
                                     AND COLUMN_NAME = 'plan_name'";
            var hasPlanName = Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0;
            
            if (hasPlanName)
            {
                Console.WriteLine("📦 Migrating schema: Renaming 'plan_name' to 'title'...");
                using var alterCmd = conn.CreateCommand();
                alterCmd.CommandText = "ALTER TABLE plans CHANGE COLUMN plan_name title VARCHAR(255) NOT NULL";
                await alterCmd.ExecuteNonQueryAsync();
                Console.WriteLine("✓ Schema migration completed");
            }
            
            // Check if 'plans' table has 'dashboard_color' with correct size
            using var checkColorCmd = conn.CreateCommand();
            checkColorCmd.CommandText = @"SELECT CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS 
                                          WHERE TABLE_SCHEMA = DATABASE() 
                                          AND TABLE_NAME = 'plans' 
                                          AND COLUMN_NAME = 'dashboard_color'";
            var colorLength = await checkColorCmd.ExecuteScalarAsync();
            if (colorLength != null && Convert.ToInt32(colorLength) < 20)
            {
                Console.WriteLine("📦 Migrating schema: Expanding 'dashboard_color' column...");
                using var alterColorCmd = conn.CreateCommand();
                alterColorCmd.CommandText = "ALTER TABLE plans MODIFY COLUMN dashboard_color VARCHAR(20) DEFAULT '#000000'";
                await alterColorCmd.ExecuteNonQueryAsync();
                Console.WriteLine("✓ Schema migration completed");
            }
            
            // Add missing columns to plans table if they don't exist
            var plansColumnsToAdd = new Dictionary<string, string>
            {
                { "starting_point", "INT DEFAULT 0" },
                { "measurement_unit", "VARCHAR(50) DEFAULT 'words'" },
                { "is_daily_target", "BOOLEAN DEFAULT FALSE" },
                { "fixed_deadline", "BOOLEAN DEFAULT TRUE" },
                { "target_finish_date", "DATE" },
                { "strategy_intensity", "VARCHAR(20) DEFAULT 'Average'" },
                { "weekend_approach", "VARCHAR(20) DEFAULT 'The Usual'" },
                { "reserve_days", "INT DEFAULT 0" },
                { "display_view_type", "VARCHAR(20) DEFAULT 'Table'" },
                { "week_start_day", "VARCHAR(20) DEFAULT 'Mondays'" },
                { "grouping_type", "VARCHAR(20) DEFAULT 'Day'" },
                { "show_historical_data", "BOOLEAN DEFAULT TRUE" },
                { "progress_tracking_type", "VARCHAR(50) DEFAULT 'Daily Goals'" },
                { "activity_type", "VARCHAR(50) DEFAULT 'Writing'" },
                { "content_type", "VARCHAR(50) DEFAULT 'Novel'" },
                { "current_progress", "INT DEFAULT 0" }
            };
            
            foreach (var (column, definition) in plansColumnsToAdd)
            {
                await AddColumnIfNotExistsAsync(conn, "plans", column, definition);
            }
            
            // Add missing columns to challenges table if they don't exist
            var challengesColumnsToAdd = new Dictionary<string, string>
            {
                { "end_date", "DATE" },
                { "is_public", "BOOLEAN DEFAULT TRUE" },
                { "invite_code", "VARCHAR(10)" },
                { "status", "ENUM('Active', 'Completed', 'Failed') DEFAULT 'Active'" }
            };
            
            foreach (var (column, definition) in challengesColumnsToAdd)
            {
                await AddColumnIfNotExistsAsync(conn, "challenges", column, definition);
            }

            // Add missing columns to challenge_participants table if they don't exist
            var challengeParticipantsColumnsToAdd = new Dictionary<string, string>
            {
                { "current_progress", "INT DEFAULT 0" },
                { "joined_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
                { "status", "VARCHAR(20) DEFAULT 'active'" }
            };
            
            foreach (var (column, definition) in challengeParticipantsColumnsToAdd)
            {
                await AddColumnIfNotExistsAsync(conn, "challenge_participants", column, definition);
            }
            
            // Create challenge_participants table if it doesn't exist
            await CreateChallengeParticipantsTableAsync(conn);
            
            // Add missing columns to users table if they don't exist
            await AddColumnIfNotExistsAsync(conn, "users", "bio", "TEXT");
            await AddColumnIfNotExistsAsync(conn, "users", "avatar_url", "VARCHAR(500)");
            await AddColumnIfNotExistsAsync(conn, "users", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            await AddColumnIfNotExistsAsync(conn, "users", "updated_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            
            // Add notes column to plan_days table if it doesn't exist
            await AddColumnIfNotExistsAsync(conn, "plan_days", "notes", "TEXT DEFAULT NULL");
            
            // Migrate checklist_items: Check if 'position' column exists and rename to 'sort_order'
            try
            {
                using var checkPositionCmd = conn.CreateCommand();
                checkPositionCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.COLUMNS 
                                                 WHERE TABLE_SCHEMA = DATABASE() 
                                                 AND TABLE_NAME = 'checklist_items' 
                                                 AND COLUMN_NAME = 'position'";
                var hasPosition = Convert.ToInt32(await checkPositionCmd.ExecuteScalarAsync()) > 0;
                
                if (hasPosition)
                {
                    Console.WriteLine("📦 Migrating schema: Renaming 'position' to 'sort_order' in checklist_items...");
                    using var renameCmd = conn.CreateCommand();
                    renameCmd.CommandText = "ALTER TABLE checklist_items CHANGE COLUMN position sort_order INT DEFAULT 0";
                    await renameCmd.ExecuteNonQueryAsync();
                    Console.WriteLine("✓ Schema migration completed: position -> sort_order");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠ Could not check/rename position column: {ex.Message}");
            }
            
            // Ensure sort_order column exists in checklist_items
            await AddColumnIfNotExistsAsync(conn, "checklist_items", "sort_order", "INT DEFAULT 0");
            
            // Ensure is_completed column exists (some schemas use is_done)
            try
            {
                using var checkIsCompletedCmd = conn.CreateCommand();
                checkIsCompletedCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.COLUMNS 
                                                    WHERE TABLE_SCHEMA = DATABASE() 
                                                    AND TABLE_NAME = 'checklist_items' 
                                                    AND COLUMN_NAME = 'is_completed'";
                var hasIsCompleted = Convert.ToInt32(await checkIsCompletedCmd.ExecuteScalarAsync()) > 0;
                
                if (!hasIsCompleted)
                {
                    // Check if is_done exists instead
                    using var checkIsDoneCmd = conn.CreateCommand();
                    checkIsDoneCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.COLUMNS 
                                                   WHERE TABLE_SCHEMA = DATABASE() 
                                                   AND TABLE_NAME = 'checklist_items' 
                                                   AND COLUMN_NAME = 'is_done'";
                    var hasIsDone = Convert.ToInt32(await checkIsDoneCmd.ExecuteScalarAsync()) > 0;
                    
                    if (hasIsDone)
                    {
                        Console.WriteLine("📦 Migrating schema: Renaming 'is_done' to 'is_completed' in checklist_items...");
                        using var renameIsDoneCmd = conn.CreateCommand();
                        renameIsDoneCmd.CommandText = "ALTER TABLE checklist_items CHANGE COLUMN is_done is_completed BOOLEAN DEFAULT FALSE";
                        await renameIsDoneCmd.ExecuteNonQueryAsync();
                        Console.WriteLine("✓ Schema migration completed: is_done -> is_completed");
                    }
                    else
                    {
                        await AddColumnIfNotExistsAsync(conn, "checklist_items", "is_completed", "BOOLEAN DEFAULT FALSE");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠ Could not check/rename is_completed column: {ex.Message}");
            }
            
            // Ensure content column exists (some schemas use text)
            try
            {
                using var checkContentCmd = conn.CreateCommand();
                checkContentCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.COLUMNS 
                                               WHERE TABLE_SCHEMA = DATABASE() 
                                               AND TABLE_NAME = 'checklist_items' 
                                               AND COLUMN_NAME = 'content'";
                var hasContent = Convert.ToInt32(await checkContentCmd.ExecuteScalarAsync()) > 0;
                
                if (!hasContent)
                {
                    // Check if text exists instead
                    using var checkTextCmd = conn.CreateCommand();
                    checkTextCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.COLUMNS 
                                                WHERE TABLE_SCHEMA = DATABASE() 
                                                AND TABLE_NAME = 'checklist_items' 
                                                AND COLUMN_NAME = 'text'";
                    var hasText = Convert.ToInt32(await checkTextCmd.ExecuteScalarAsync()) > 0;
                    
                    if (hasText)
                    {
                        Console.WriteLine("📦 Migrating schema: Renaming 'text' to 'content' in checklist_items...");
                        using var renameTextCmd = conn.CreateCommand();
                        renameTextCmd.CommandText = "ALTER TABLE checklist_items CHANGE COLUMN text content TEXT NOT NULL";
                        await renameTextCmd.ExecuteNonQueryAsync();
                        Console.WriteLine("✓ Schema migration completed: text -> content");
                    }
                    else
                    {
                        await AddColumnIfNotExistsAsync(conn, "checklist_items", "content", "TEXT NOT NULL");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠ Could not check/rename content column: {ex.Message}");
            }
            
            // Add is_archived column to checklists table if it doesn't exist
            await AddColumnIfNotExistsAsync(conn, "checklists", "is_archived", "BOOLEAN DEFAULT FALSE");
            
            // Fix plans table: convert status to VARCHAR so it can hold 'archived'
            using (var convertCmd = conn.CreateCommand())
            {
                convertCmd.CommandText = "ALTER TABLE plans MODIFY COLUMN status VARCHAR(50) DEFAULT 'active'";
                await convertCmd.ExecuteNonQueryAsync();
            }
            
            // Add created_at column to plans table if it doesn't exist
            await AddColumnIfNotExistsAsync(conn, "plans", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
            
            // Add is_archived column to projects table if it doesn't exist
            await AddColumnIfNotExistsAsync(conn, "projects", "is_archived", "BOOLEAN DEFAULT FALSE");
            
            // Auto-update plans that are at 100% progress but not marked as completed
            try
            {
                Console.WriteLine("📦 Checking for plans at 100% progress that need status update...");
                using var checkCompletedCmd = conn.CreateCommand();
                checkCompletedCmd.CommandText = @"
                    UPDATE plans p
                    INNER JOIN (
                        SELECT 
                            plan_id,
                            COALESCE(SUM(actual_count), 0) as total_logged
                        FROM plan_days
                        WHERE actual_count > 0
                        GROUP BY plan_id
                    ) pd ON p.id = pd.plan_id
                    SET p.status = 'completed', p.current_progress = 100
                    WHERE p.total_word_count > 0
                    AND (pd.total_logged * 100.0 / p.total_word_count) >= 100
                    AND (p.status IS NULL OR p.status != 'completed' AND p.status != 'archived')";
                var updatedRows = await checkCompletedCmd.ExecuteNonQueryAsync();
                if (updatedRows > 0)
                {
                    Console.WriteLine($"✓ Auto-updated {updatedRows} plan(s) to completed status");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠ Could not auto-update completed plans: {ex.Message}");
            }
            
            // Create user_settings table if it doesn't exist
            await CreateUserSettingsTableAsync(conn);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Schema migration warning: {ex.Message}");
            // Don't throw - allow app to continue even if migration fails
        }
    }
    
    /// <summary>
    /// Add a column to a table if it doesn't already exist
    /// </summary>
    private async Task AddColumnIfNotExistsAsync(MySqlConnection conn, string table, string column, string definition)
    {
        try
        {
            using var checkColCmd = conn.CreateCommand();
            checkColCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.COLUMNS 
                                        WHERE TABLE_SCHEMA = DATABASE() 
                                        AND TABLE_NAME = @table 
                                        AND COLUMN_NAME = @col";
            checkColCmd.Parameters.AddWithValue("@table", table);
            checkColCmd.Parameters.AddWithValue("@col", column);
            var exists = Convert.ToInt32(await checkColCmd.ExecuteScalarAsync()) > 0;
            
            if (!exists)
            {
                Console.WriteLine($"📦 Adding missing column: {table}.{column}");
                using var addColCmd = conn.CreateCommand();
                addColCmd.CommandText = $"ALTER TABLE `{table}` ADD COLUMN `{column}` {definition}";
                await addColCmd.ExecuteNonQueryAsync();
                Console.WriteLine($"✓ Added column {table}.{column}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Could not add column {table}.{column}: {ex.Message}");
        }
    }
    
    /// <summary>
    /// Create challenge_participants table if it doesn't exist
    /// </summary>
    private async Task CreateChallengeParticipantsTableAsync(MySqlConnection conn)
    {
        try
        {
            // Check if table exists
            using var checkCmd = conn.CreateCommand();
            checkCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.TABLES 
                                     WHERE TABLE_SCHEMA = DATABASE() 
                                     AND TABLE_NAME = 'challenge_participants'";
            var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0;
            
            if (!exists)
            {
                Console.WriteLine("📦 Creating challenge_participants table...");
                using var createCmd = conn.CreateCommand();
                createCmd.CommandText = @"CREATE TABLE challenge_participants (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    challenge_id INT NOT NULL,
                    user_id INT NOT NULL,
                    current_progress INT DEFAULT 0,
                    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_participant (challenge_id, user_id)
                )";
                await createCmd.ExecuteNonQueryAsync();
                Console.WriteLine("✓ Created challenge_participants table");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Could not create challenge_participants table: {ex.Message}");
        }
    }
    
    /// <summary>
    /// Create user_settings table if it doesn't exist
    /// </summary>
    private async Task CreateUserSettingsTableAsync(MySqlConnection conn)
    {
        try
        {
            // Check if table exists
            using var checkCmd = conn.CreateCommand();
            checkCmd.CommandText = @"SELECT COUNT(*) FROM information_schema.TABLES 
                                     WHERE TABLE_SCHEMA = DATABASE() 
                                     AND TABLE_NAME = 'user_settings'";
            var exists = Convert.ToInt32(await checkCmd.ExecuteScalarAsync()) > 0;
            
            if (!exists)
            {
                Console.WriteLine("📦 Creating user_settings table...");
                using var createCmd = conn.CreateCommand();
                createCmd.CommandText = @"CREATE TABLE user_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
                    week_start_day VARCHAR(20) DEFAULT 'Monday',
                    email_reminders_enabled BOOLEAN DEFAULT FALSE,
                    reminder_timezone VARCHAR(100) DEFAULT 'GMT +00:00',
                    reminder_frequency VARCHAR(100) DEFAULT 'Daily @ 8AM',
                    professions JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_settings (user_id)
                )";
                await createCmd.ExecuteNonQueryAsync();
                Console.WriteLine("✓ Created user_settings table");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Could not create user_settings table: {ex.Message}");
        }
    }
}

