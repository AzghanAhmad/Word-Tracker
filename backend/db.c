#include "db.h"
#include "cJSON.h"
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Global connection
static MYSQL *conn;
static char last_error[512] = "No error";

void db_get_last_error(char *buffer, size_t size) {
  snprintf(buffer, size, "%s", last_error);
}

// Helper to log errors
static void set_error(const char *msg) {
  if (conn) {
    snprintf(last_error, sizeof(last_error), "%s: %s", msg, mysql_error(conn));
  } else {
    snprintf(last_error, sizeof(last_error), "%s", msg);
  }
}

// Forward declaration
static bool exec_query(const char *query);

bool db_init() {
  conn = mysql_init(NULL);
  if (conn == NULL) {
    set_error("mysql_init() failed");
    return false;
  }

  const char *hosts[] = {"127.0.0.1", "localhost", "172.22.96.1"};
  int connected = 0;
  for (int i = 0; i < 3 && !connected; i++) {
    if (mysql_real_connect(conn, hosts[i], "root", "", "word_tracker", 3306,
                           NULL, 0) != NULL) {
      connected = 1;
      break;
    }
  }
  // Attempt to connect to MySQL with target DB. If it fails, connect without
  // DB, create it, then select.
  if (!connected) {
    for (int i = 0; i < 3 && !connected; i++) {
      if (mysql_real_connect(conn, hosts[i], "root", "", NULL, 3306, NULL, 0) !=
          NULL) {
        connected = 1;
        break;
      }
    }
    // Try connecting without selecting a database, then create/select
    if (!connected) {
      set_error("mysql_real_connect() failed");
      mysql_close(conn);
      conn = NULL;
      return false;
    }
    // Create database if missing
    if (!exec_query("CREATE DATABASE IF NOT EXISTS word_tracker")) {
      set_error("Failed to create database 'word_tracker'");
      mysql_close(conn);
      conn = NULL;
      return false;
    }
    // Select database
    if (mysql_select_db(conn, "word_tracker") != 0) {
      set_error("mysql_select_db() failed for 'word_tracker'");
      mysql_close(conn);
      conn = NULL;
      return false;
    }
  }

  printf("Connected to MySQL\n");

  // Ensure required tables exist (minimum for registration)
  const char *users_sql = "CREATE TABLE IF NOT EXISTS users ("
                          "id INT AUTO_INCREMENT PRIMARY KEY,"
                          "username VARCHAR(255) UNIQUE NOT NULL,"
                          "email VARCHAR(255) UNIQUE NOT NULL,"
                          "password_hash VARCHAR(255) NOT NULL,"
                          "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
                          "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON "
                          "UPDATE CURRENT_TIMESTAMP"
                          ")";
  if (!exec_query(users_sql)) {
    set_error("Failed to ensure 'users' table");
    mysql_close(conn);
    conn = NULL;
    return false;
  }

  return true;
}

void db_close() {
  if (conn) {
    mysql_close(conn);
    conn = NULL;
  }
}

// Execute logic with no result set
static bool exec_query(const char *query) {
  if (mysql_query(conn, query)) {
    set_error("Query failed");
    fprintf(stderr, "[SQL ERROR] %s\nQuery: %s\n", mysql_error(conn), query);
    return false;
  }
  return true;
}

// --- USERS ---

bool db_create_user(const char *username, const char *email,
                    const char *password_hash) {
  char query[1024];
  snprintf(query, sizeof(query),
           "INSERT INTO users (username, email, password_hash) VALUES ('%s', "
           "'%s', '%s')",
           username, email, password_hash);

  return exec_query(query);
}

bool db_get_user_by_email(const char *email, User *user) {
  char query[256];
  snprintf(query, sizeof(query),
           "SELECT id, username, email, password_hash, created_at FROM users "
           "WHERE email='%s'",
           email);

  if (mysql_query(conn, query)) {
    set_error("Select failed");
    return false;
  }

  MYSQL_RES *res = mysql_store_result(conn);
  if (!res)
    return false;

  MYSQL_ROW row = mysql_fetch_row(res);
  bool found = false;
  if (row) {
    user->id = atoi(row[0]);
    snprintf(user->username, sizeof(user->username), "%s", row[1]);
    snprintf(user->email, sizeof(user->email), "%s", row[2]);
    snprintf(user->password_hash, sizeof(user->password_hash), "%s", row[3]);
    snprintf(user->created_at, sizeof(user->created_at), "%s", row[4]);
    found = true;
  }

  mysql_free_result(res);
  return found;
}

// --- PLANS ---

int db_create_plan(int user_id, const char *title, int total_word_count,
                   const char *start_date, const char *end_date,
                   const char *algorithm_type, const char *description,
                   bool is_private, int starting_point,
                   const char *measurement_unit, bool is_daily_target,
                   bool fixed_deadline, const char *target_finish_date,
                   const char *strategy_intensity, const char *weekend_approach,
                   int reserve_days, const char *display_view_type,
                   const char *week_start_day, const char *grouping_type,
                   const char *dashboard_color, bool show_historical_data,
                   const char *progress_tracking_type) {

  char query[4096]; // Large buffer for many fields
  snprintf(query, sizeof(query),
           "INSERT INTO plans (user_id, title, total_word_count, start_date, "
           "end_date, algorithm_type, "
           "description, is_private, starting_point, measurement_unit, "
           "is_daily_target, fixed_deadline, "
           "target_finish_date, strategy_intensity, weekend_approach, "
           "reserve_days, display_view_type, "
           "week_start_day, grouping_type, dashboard_color, "
           "show_historical_data, progress_tracking_type) "
           "VALUES (%d, '%s', %d, '%s', '%s', '%s', '%s', %d, %d, '%s', %d, "
           "%d, '%s', '%s', '%s', %d, "
           "'%s', '%s', '%s', '%s', %d, '%s')",
           user_id, title, total_word_count, start_date, end_date,
           algorithm_type, description ? description : "", is_private,
           starting_point, measurement_unit ? measurement_unit : "words",
           is_daily_target, fixed_deadline,
           target_finish_date ? target_finish_date : "",
           strategy_intensity ? strategy_intensity : "balanced",
           weekend_approach ? weekend_approach : "off", reserve_days,
           display_view_type ? display_view_type : "calendar",
           week_start_day ? week_start_day : "Monday",
           grouping_type ? grouping_type : "none",
           dashboard_color ? dashboard_color : "blue", show_historical_data,
           progress_tracking_type ? progress_tracking_type : "linear");

  if (mysql_query(conn, query)) {
    set_error("Create plan failed");
    return -1;
  }

  return (int)mysql_insert_id(conn);
}

char *db_get_plans(int user_id) {
  char query[256];
  snprintf(query, sizeof(query),
           "SELECT id, title, total_word_count, start_date, end_date, "
           "algorithm_type, is_daily_target FROM plans WHERE user_id=%d",
           user_id);

  if (mysql_query(conn, query)) {
    set_error("Get plans failed");
    return NULL;
  }

  MYSQL_RES *res = mysql_store_result(conn);
  if (!res)
    return NULL;

  cJSON *arr = cJSON_CreateArray();
  MYSQL_ROW row;
  while ((row = mysql_fetch_row(res))) {
    cJSON *obj = cJSON_CreateObject();
    cJSON_AddNumberToObject(obj, "id", atoi(row[0]));
    cJSON_AddStringToObject(obj, "title", row[1]);
    cJSON_AddNumberToObject(obj, "total_word_count", atoi(row[2]));
    cJSON_AddStringToObject(obj, "start_date", row[3]);
    cJSON_AddStringToObject(obj, "end_date", row[4]);
    cJSON_AddStringToObject(obj, "algorithm_type", row[5]);
    cJSON_AddBoolToObject(obj, "is_daily_target", atoi(row[6]));
    cJSON_AddItemToArray(arr, obj);
  }

  mysql_free_result(res);
  char *out = cJSON_PrintUnformatted(arr);
  cJSON_Delete(arr);
  return out;
}

char *db_get_plan(int id, int user_id) {
  char query[256];
  snprintf(query, sizeof(query),
           "SELECT id, title, total_word_count, description FROM plans WHERE "
           "id=%d AND user_id=%d",
           id, user_id);

  if (mysql_query(conn, query))
    return NULL;
  MYSQL_RES *res = mysql_store_result(conn);
  if (!res)
    return NULL;

  MYSQL_ROW row = mysql_fetch_row(res);
  char *out = NULL;
  if (row) {
    cJSON *obj = cJSON_CreateObject();
    cJSON_AddNumberToObject(obj, "id", atoi(row[0]));
    cJSON_AddStringToObject(obj, "title", row[1]);
    cJSON_AddNumberToObject(obj, "total_word_count", atoi(row[2]));
    cJSON_AddStringToObject(obj, "description", row[3]);
    out = cJSON_PrintUnformatted(obj);
    cJSON_Delete(obj);
  }
  mysql_free_result(res);
  return out;
}

bool db_delete_plan(int id, int user_id) {
  char query[128];
  snprintf(query, sizeof(query), "DELETE FROM plans WHERE id=%d AND user_id=%d",
           id, user_id);
  return exec_query(query);
}

bool db_update_plan(int id, int user_id, const char *title, int total,
                    const char *desc) {
  char query[1024];
  snprintf(query, sizeof(query),
           "UPDATE plans SET title='%s', total_word_count=%d, description='%s' "
           "WHERE id=%d AND user_id=%d",
           title, total, desc ? desc : "", id, user_id);
  return exec_query(query);
}

// --- CHECKLISTS ---

int db_create_checklist(int user_id, int *plan_id, const char *name) {
  char query[512];
  if (plan_id) {
    snprintf(
        query, sizeof(query),
        "INSERT INTO checklists (user_id, plan_id, name) VALUES (%d, %d, '%s')",
        user_id, *plan_id, name);
  } else {
    snprintf(query, sizeof(query),
             "INSERT INTO checklists (user_id, name) VALUES (%d, '%s')",
             user_id, name);
  }

  if (exec_query(query)) {
    return (int)mysql_insert_id(conn);
  }
  return -1;
}

char *db_get_checklists(int user_id) {
  char query[256];
  snprintf(query, sizeof(query),
           "SELECT id, name, plan_id FROM checklists WHERE user_id=%d",
           user_id);
  if (mysql_query(conn, query))
    return NULL;

  MYSQL_RES *res = mysql_store_result(conn);
  cJSON *arr = cJSON_CreateArray();
  MYSQL_ROW row;
  while ((row = mysql_fetch_row(res))) {
    cJSON *obj = cJSON_CreateObject();
    cJSON_AddNumberToObject(obj, "id", atoi(row[0]));
    cJSON_AddStringToObject(obj, "name", row[1]);
    if (row[2])
      cJSON_AddNumberToObject(obj, "plan_id", atoi(row[2]));
    cJSON_AddItemToArray(arr, obj);
  }
  mysql_free_result(res);
  char *out = cJSON_PrintUnformatted(arr);
  cJSON_Delete(arr);
  return out;
}

bool db_delete_checklist(int id, int user_id) {
  char query[128];
  snprintf(query, sizeof(query),
           "DELETE FROM checklists WHERE id=%d AND user_id=%d", id, user_id);
  return exec_query(query);
}

bool db_add_checklist_item(int checklist_id, const char *content) {
  char query[512];
  snprintf(query, sizeof(query),
           "INSERT INTO checklist_items (checklist_id, content, is_completed) "
           "VALUES (%d, '%s', 0)",
           checklist_id, content);
  return exec_query(query);
}

bool db_toggle_checklist_item(int item_id, bool is_completed) {
  char query[256];
  snprintf(query, sizeof(query),
           "UPDATE checklist_items SET is_completed=%d WHERE id=%d",
           is_completed, item_id);
  return exec_query(query);
}

bool db_delete_checklist_item(int item_id) {
  char query[128];
  snprintf(query, sizeof(query), "DELETE FROM checklist_items WHERE id=%d",
           item_id);
  return exec_query(query);
}

// --- CHALLENGES ---

int db_create_challenge(int user_id, const char *title, const char *desc,
                        const char *type, int goal, int duration,
                        const char *start) {
  char query[2048];
  snprintf(query, sizeof(query),
           "INSERT INTO challenges (user_id, title, description, type, "
           "goal_count, duration_days, start_date) "
           "VALUES (%d, '%s', '%s', '%s', %d, %d, '%s')",
           user_id, title, desc ? desc : "", type, goal, duration, start);

  if (exec_query(query))
    return (int)mysql_insert_id(conn);
  return -1;
}

char *db_get_challenges(int user_id) {
  char query[256];
  snprintf(query, sizeof(query),
           "SELECT id, title, description, type, goal_count, duration_days, "
           "start_date FROM challenges WHERE user_id=%d",
           user_id);
  if (mysql_query(conn, query))
    return NULL;

  MYSQL_RES *res = mysql_store_result(conn);
  cJSON *arr = cJSON_CreateArray();
  MYSQL_ROW row;
  while ((row = mysql_fetch_row(res))) {
    cJSON *obj = cJSON_CreateObject();
    cJSON_AddNumberToObject(obj, "id", atoi(row[0]));
    cJSON_AddStringToObject(obj, "title", row[1]);
    cJSON_AddStringToObject(obj, "description", row[2]);
    cJSON_AddStringToObject(obj, "type", row[3]);
    cJSON_AddNumberToObject(obj, "goal_count", atoi(row[4]));
    cJSON_AddNumberToObject(obj, "duration_days", atoi(row[5]));
    cJSON_AddStringToObject(obj, "start_date", row[6]);
    cJSON_AddItemToArray(arr, obj);
  }
  mysql_free_result(res);
  char *out = cJSON_PrintUnformatted(arr);
  cJSON_Delete(arr);
  return out;
}

// --- DASHBOARD ---

char *db_get_dashboard_stats(int user_id) {
  // Simple count of plans
  char query[256];
  snprintf(query, sizeof(query), "SELECT count(*) FROM plans WHERE user_id=%d",
           user_id);
  if (mysql_query(conn, query))
    return NULL;

  MYSQL_RES *res = mysql_store_result(conn);
  MYSQL_ROW row = mysql_fetch_row(res);
  int plan_count = row ? atoi(row[0]) : 0;
  mysql_free_result(res);

  cJSON *obj = cJSON_CreateObject();
  cJSON_AddNumberToObject(obj, "active_plans", plan_count);
  cJSON_AddNumberToObject(obj, "total_words_logged", 0);
  cJSON_AddNumberToObject(obj, "streak_days", 0);

  char *out = cJSON_PrintUnformatted(obj);
  cJSON_Delete(obj);
  return out;
}
