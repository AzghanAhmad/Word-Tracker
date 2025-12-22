#include <mysql/mysql.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>


int main() {
  MYSQL *conn = mysql_init(NULL);
  if (!mysql_real_connect(conn, "172.22.96.1", "root", "", "word_tracker", 3306,
                          NULL, 0)) {
    fprintf(stderr, "Connect failed: %s\n", mysql_error(conn));
    return 1;
  }

  if (mysql_query(conn, "DROP TABLE IF EXISTS checklist_items")) { // Dependency
    fprintf(stderr, "DROP checklist_items failed: %s\n", mysql_error(conn));
  }
  if (mysql_query(conn, "DROP TABLE IF EXISTS checklists")) { // Dependency
    fprintf(stderr, "DROP checklists failed: %s\n", mysql_error(conn));
  }
  if (mysql_query(conn, "DROP TABLE IF EXISTS workload_rules")) { // Dependency
    fprintf(stderr, "DROP workload_rules failed: %s\n", mysql_error(conn));
  }
  if (mysql_query(conn, "DROP TABLE IF EXISTS plan_days")) { // Dependency
    fprintf(stderr, "DROP plan_days failed: %s\n", mysql_error(conn));
  }
  if (mysql_query(conn, "DROP TABLE IF EXISTS plans")) {
    fprintf(stderr, "DROP plans failed: %s\n", mysql_error(conn));
    return 1;
  }
  printf("Dropped table plans and dependencies.\n");

  const char *create_query =
      "CREATE TABLE plans ("
      "    id INT AUTO_INCREMENT PRIMARY KEY,"
      "    user_id INT NOT NULL,"
      "    title VARCHAR(255) NOT NULL,"
      "    total_word_count INT NOT NULL DEFAULT 0,"
      "    start_date DATE NOT NULL,"
      "    end_date DATE NOT NULL,"
      "    algorithm_type VARCHAR(50) DEFAULT 'steady',"
      "    status ENUM('active', 'paused', 'completed') DEFAULT 'active',"
      "    description TEXT,"
      "    is_private BOOLEAN DEFAULT FALSE,"
      "    starting_point INT DEFAULT 0,"
      "    measurement_unit VARCHAR(50) DEFAULT 'words',"
      "    is_daily_target BOOLEAN DEFAULT FALSE,"
      "    fixed_deadline BOOLEAN DEFAULT TRUE,"
      "    target_finish_date DATE,"
      "    strategy_intensity VARCHAR(20) DEFAULT 'Average',"
      "    weekend_approach VARCHAR(20) DEFAULT 'The Usual',"
      "    reserve_days INT DEFAULT 0,"
      "    display_view_type VARCHAR(20) DEFAULT 'Table',"
      "    week_start_day VARCHAR(20) DEFAULT 'Mondays',"
      "    grouping_type VARCHAR(20) DEFAULT 'Day',"
      "    dashboard_color VARCHAR(10) DEFAULT '#000000',"
      "    show_historical_data BOOLEAN DEFAULT TRUE,"
      "    progress_tracking_type VARCHAR(50) DEFAULT 'Daily Goals',"
      "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
      "    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE "
      "CURRENT_TIMESTAMP,"
      "    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
      ")";

  if (mysql_query(conn, create_query)) {
    fprintf(stderr, "CREATE plans failed: %s\n", mysql_error(conn));
    return 1;
  }

  printf("Recreated plans table successfully.\n");

  // Recreate dependencies to avoid errors later
  if (mysql_query(
          conn,
          "CREATE TABLE IF NOT EXISTS plan_days ("
          "    id INT AUTO_INCREMENT PRIMARY KEY,"
          "    plan_id INT NOT NULL,"
          "    date DATE NOT NULL,"
          "    target_count INT NOT NULL DEFAULT 0,"
          "    actual_count INT DEFAULT 0,"
          "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
          "    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE "
          "CURRENT_TIMESTAMP,"
          "    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,"
          "    UNIQUE KEY unique_plan_date (plan_id, date)"
          ")")) {
    fprintf(stderr, "CREATE plan_days failed: %s\n", mysql_error(conn));
  }

  // Checklists etc are fine to be missing for this test, or we recreate them.
  // Let's recreate them to be safe.
  mysql_query(
      conn, "CREATE TABLE IF NOT EXISTS checklists ("
            "    id INT AUTO_INCREMENT PRIMARY KEY,"
            "    user_id INT NOT NULL,"
            "    plan_id INT DEFAULT NULL,"
            "    name VARCHAR(255) NOT NULL,"
            "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
            "    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,"
            "    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL"
            ")");

  mysql_query(conn, "CREATE TABLE IF NOT EXISTS checklist_items ("
                    "    id INT AUTO_INCREMENT PRIMARY KEY,"
                    "    checklist_id INT NOT NULL,"
                    "    text TEXT NOT NULL,"
                    "    is_done BOOLEAN DEFAULT FALSE,"
                    "    sort_order INT DEFAULT 0,"
                    "    FOREIGN KEY (checklist_id) REFERENCES checklists(id) "
                    "ON DELETE CASCADE"
                    ")");

  mysql_close(conn);
  return 0;
}
