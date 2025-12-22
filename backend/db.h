#ifndef DB_H
#define DB_H

#include <mysql/mysql.h>
#include <stdbool.h>

// User Structure
typedef struct {
  int id;
  char username[100];
  char email[150];
  char password_hash[255];
  char created_at[50];
} User;

// Plan Structure
typedef struct {
  int id;
  int user_id;
  char title[150];
  int total_word_count;
  char start_date[20];
  char end_date[20];
  char algorithm_type[50];
  char description[500]; // Nullable
  bool is_private;
  int starting_point;
  char measurement_unit[20];
  bool is_daily_target;
  bool fixed_deadline;
  char target_finish_date[20]; // Nullable
  char strategy_intensity[50]; // Nullable
  char weekend_approach[50];   // Nullable
  int reserve_days;
  char display_view_type[50];
  char week_start_day[20];
  char grouping_type[50];
  char dashboard_color[20];
  bool show_historical_data;
  char progress_tracking_type[50];
} Plan;

// Checklist Structure
typedef struct {
  int id;
  int user_id;
  int plan_id; // Nullable (0 if null)
  char name[150];
} Checklist;

// Challenge Structure
typedef struct {
  int id;
  int user_id;
  char title[150];
  char description[500];
  char type[50];
  int goal_count;
  int duration_days;
  char start_date[20];
  char created_at[50];
} Challenge;

// Database Logic
bool db_init();
void db_close();

// Auth Operations
bool db_create_user(const char *username, const char *email,
                    const char *password_hash);
bool db_get_user_by_email(const char *email, User *user);

// Plan Operations
// Returns the created ID on success, or -1 on failure
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
                   const char *progress_tracking_type);

// Get all plans for user as a JSON string (caller must free)
char *db_get_plans(int user_id);
// Get single plan (caller must free)
char *db_get_plan(int id, int user_id);
// Delete plan
bool db_delete_plan(int id, int user_id);
// Update plan (simplified: title, total, desc)
bool db_update_plan(int id, int user_id, const char *title, int total,
                    const char *desc);

// Checklist Operations
int db_create_checklist(int user_id, int *plan_id, const char *name);
char *db_get_checklists(int user_id); // Return JSON
bool db_delete_checklist(int id, int user_id);

// Checklist Items
bool db_add_checklist_item(int checklist_id, const char *content);
bool db_toggle_checklist_item(int item_id, bool is_completed);
bool db_delete_checklist_item(int item_id);

// Challenge Operations
int db_create_challenge(int user_id, const char *title, const char *desc,
                        const char *type, int goal, int duration,
                        const char *start);
char *db_get_challenges(int user_id); // Return JSON

// Dashboard Params
char *db_get_dashboard_stats(int user_id);

// Helpers
void db_get_last_error(char *buffer, size_t size);

#endif
