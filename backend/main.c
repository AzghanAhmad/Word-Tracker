#include "auth.h"
#include "cJSON.h"
#include "db.h"
#include "mongoose.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SECRET_KEY "change_this_to_a_secure_random_key_in_production"
#define LISTENING_ADDR "http://127.0.0.1:8080"

// Standard HTTP Headers
static const char *HEADERS =
    "Content-Type: application/json\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE\r\n"
    "Access-Control-Allow-Headers: Content-Type, Authorization\r\n"
    "Referrer-Policy: strict-origin-when-cross-origin";

// Helper: Match URI
static bool mg_http_match_uri(struct mg_http_message *hm, const char *glob) {
  return mg_match(hm->uri, mg_str(glob), NULL);
}

// Helper: Parse JSON body
static cJSON *parse_json(struct mg_http_message *hm) {
  if (hm->body.len == 0)
    return NULL;
  // hm->body.buf is not null terminated, create a copy
  char *buf = malloc(hm->body.len + 1);
  memcpy(buf, hm->body.buf, hm->body.len);
  buf[hm->body.len] = '\0';
  cJSON *json = cJSON_Parse(buf);
  free(buf);
  return json;
}

// Helper: Send JSON response
static void reply_json(struct mg_connection *c, int status, const char *fmt,
                       ...) {
  char buf[1024];
  va_list args;
  va_start(args, fmt);
  vsnprintf(buf, sizeof(buf), fmt, args);
  va_end(args);
  mg_http_reply(c, status, HEADERS, "%s", buf);
}

// Helper: Send Error
static void reply_error(struct mg_connection *c, int status, const char *msg) {
  reply_json(c, status, "{\"success\":false,\"message\":\"%s\"}", msg);
}

// Helper: Send Success
static void reply_success(struct mg_connection *c, const char *msg) {
  reply_json(c, 200, "{\"success\":true,\"message\":\"%s\"}", msg);
}

static void reply_data(struct mg_connection *c, const char *json_data) {
  mg_http_reply(c, 200, HEADERS, "{\"success\":true,\"data\":%s}", json_data);
}

// Check Auth, returns user_id or -1
static int check_auth(struct mg_http_message *hm) {
  struct mg_str *auth_header = mg_http_get_header(hm, "Authorization");
  if (!auth_header || auth_header->len < 7)
    return -1; // "Bearer "

  // Extract token
  char token[512];
  int len = auth_header->len - 7;
  if (len >= (int)sizeof(token))
    len = sizeof(token) - 1;
  memcpy(token, auth_header->buf + 7, len);
  token[len] = '\0';

  return auth_validate_jwt(token, SECRET_KEY);
}

// Handlers

static void handle_register(struct mg_connection *c,
                            struct mg_http_message *hm) {
  printf("Received registration request\n");
  fflush(stdout);
  cJSON *json = parse_json(hm);
  if (!json) {
    printf("JSON parse failed\n");
    fflush(stdout);
    reply_error(c, 400, "Invalid JSON");
    return;
  }

  cJSON *user = cJSON_GetObjectItem(json, "username");
  cJSON *pass = cJSON_GetObjectItem(json, "password");
  cJSON *email = cJSON_GetObjectItem(json, "email");

  if (!cJSON_IsString(user) || !cJSON_IsString(pass) ||
      !cJSON_IsString(email)) {
    printf("Missing fields in JSON\n");
    fflush(stdout);
    reply_error(c, 400, "Missing required fields");
    cJSON_Delete(json);
    return;
  }

  printf("Hashing password...\n");
  fflush(stdout);
  char hash[AUTH_HASH_LEN];
  if (!auth_hash_password(pass->valuestring, hash)) {
    printf("Hashing failed!\n");
    fflush(stdout);
    reply_error(c, 500, "Hashing failed");
    cJSON_Delete(json);
    return;
  }

  printf("Creating user in DB...\n");
  fflush(stdout);
  if (db_create_user(user->valuestring, email->valuestring, hash)) {
    printf("User created successfully\n");
    fflush(stdout);
    reply_success(c, "User registered");
  } else {
    printf("DB Create User failed\n");
    fflush(stdout);
    reply_error(c, 500, "Registration failed (email/username taken?)");
  }
  cJSON_Delete(json);
}

static void handle_login(struct mg_connection *c, struct mg_http_message *hm) {
  cJSON *json = parse_json(hm);
  if (!json) {
    reply_error(c, 400, "Invalid JSON");
    return;
  }

  cJSON *email = cJSON_GetObjectItem(json, "email");
  cJSON *pass = cJSON_GetObjectItem(json, "password");

  if (!cJSON_IsString(email) || !cJSON_IsString(pass)) {
    reply_error(c, 400, "Missing email or password");
    cJSON_Delete(json);
    return;
  }

  User u;
  if (!db_get_user_by_email(email->valuestring, &u)) {
    reply_error(c, 401, "Invalid credentials");
    cJSON_Delete(json);
    return;
  }

  if (!auth_verify_password(pass->valuestring, u.password_hash)) {
    reply_error(c, 401, "Invalid credentials");
    cJSON_Delete(json);
    return;
  }

  char *token = auth_generate_jwt(u.id, SECRET_KEY);
  reply_json(c, 200,
             "{\"success\":true,\"token\":\"%s\",\"user\":{\"id\":%d,"
             "\"username\":\"%s\"}}",
             token, u.id, u.username);
  free(token);
  cJSON_Delete(json);
}

static void handle_create_plan(struct mg_connection *c,
                               struct mg_http_message *hm) {
  int user_id = check_auth(hm);
  if (user_id == -1) {
    reply_error(c, 401, "Unauthorized");
    return;
  }

  cJSON *json = parse_json(hm);
  if (!json) {
    reply_error(c, 400, "Invalid JSON");
    return;
  }

  // Required Fields
  cJSON *title = cJSON_GetObjectItem(json, "title");
  cJSON *total = cJSON_GetObjectItem(json, "total_word_count");
  cJSON *start = cJSON_GetObjectItem(json, "start_date");
  cJSON *end = cJSON_GetObjectItem(json, "end_date");
  cJSON *algo = cJSON_GetObjectItem(json, "algorithm_type");

  if (!cJSON_IsString(title) || !cJSON_IsNumber(total) ||
      !cJSON_IsString(start) || !cJSON_IsString(end) || !cJSON_IsString(algo)) {
    reply_error(c, 400, "Missing required fields");
    cJSON_Delete(json);
    return;
  }

  // Optional Fields
  cJSON *desc = cJSON_GetObjectItem(json, "description");
  cJSON *priv = cJSON_GetObjectItem(json, "is_private");
  cJSON *meas = cJSON_GetObjectItem(json, "measurement_unit");
  cJSON *daily = cJSON_GetObjectItem(json, "is_daily_target");
  cJSON *fixed = cJSON_GetObjectItem(json, "fixed_deadline");
  cJSON *target = cJSON_GetObjectItem(json, "target_finish_date");
  cJSON *strat = cJSON_GetObjectItem(json, "strategy_intensity");
  cJSON *week = cJSON_GetObjectItem(json, "weekend_approach");
  cJSON *reserve = cJSON_GetObjectItem(json, "reserve_days");
  cJSON *view = cJSON_GetObjectItem(json, "display_view_type");
  cJSON *wstart = cJSON_GetObjectItem(json, "week_start_day");
  cJSON *group = cJSON_GetObjectItem(json, "grouping_type");
  cJSON *color = cJSON_GetObjectItem(json, "dashboard_color");
  cJSON *hist = cJSON_GetObjectItem(json, "show_historical_data");
  cJSON *track = cJSON_GetObjectItem(json, "progress_tracking_type");

  // Defaults handled by DB mostly, but for C strings we pass NULL if missing
  int new_id =
      db_create_plan(user_id, title->valuestring, total->valueint,
                     start->valuestring, end->valuestring, algo->valuestring,
                     cJSON_IsString(desc) ? desc->valuestring : NULL,
                     cJSON_IsBool(priv) ? cJSON_IsTrue(priv) : false,
                     0, // starting_point default
                     cJSON_IsString(meas) ? meas->valuestring : NULL,
                     cJSON_IsBool(daily) ? cJSON_IsTrue(daily) : true,
                     cJSON_IsBool(fixed) ? cJSON_IsTrue(fixed) : true,
                     cJSON_IsString(target) ? target->valuestring : NULL,
                     cJSON_IsString(strat) ? strat->valuestring : NULL,
                     cJSON_IsString(week) ? week->valuestring : NULL,
                     cJSON_IsNumber(reserve) ? reserve->valueint : 0,
                     cJSON_IsString(view) ? view->valuestring : "calendar",
                     cJSON_IsString(wstart) ? wstart->valuestring : "Monday",
                     cJSON_IsString(group) ? group->valuestring : "none",
                     cJSON_IsString(color) ? color->valuestring : "blue",
                     cJSON_IsBool(hist) ? cJSON_IsTrue(hist) : true,
                     cJSON_IsString(track) ? track->valuestring : "linear");

  if (new_id > 0) {
    reply_json(c, 201,
               "{\"success\":true,\"message\":\"Plan created\",\"id\":%d}",
               new_id);
  } else {
    reply_error(c, 500, "Failed to create plan");
  }

  cJSON_Delete(json);
}

static void handle_create_checklist(struct mg_connection *c,
                                    struct mg_http_message *hm) {
  int user_id = check_auth(hm);
  if (user_id == -1) {
    reply_error(c, 401, "Unauthorized");
    return;
  }

  cJSON *json = parse_json(hm);
  if (!json) {
    reply_error(c, 400, "Invalid JSON");
    return;
  }

  cJSON *name = cJSON_GetObjectItem(json, "name");
  cJSON *plan_id = cJSON_GetObjectItem(json, "plan_id");

  if (!cJSON_IsString(name)) {
    reply_error(c, 400, "Missing name");
    cJSON_Delete(json);
    return;
  }

  int pid_val;
  int *pid_ptr = NULL;
  if (cJSON_IsNumber(plan_id) && plan_id->valueint > 0) {
    pid_val = plan_id->valueint;
    pid_ptr = &pid_val;
  }

  int new_id = db_create_checklist(user_id, pid_ptr, name->valuestring);
  if (new_id > 0) {
    reply_json(c, 201,
               "{\"success\":true,\"message\":\"Checklist created\",\"id\":%d}",
               new_id);
  } else {
    reply_error(c, 500, "Failed to create checklist");
  }

  cJSON_Delete(json);
}

// --- New Handlers (CRUD) ---

static void handle_get_plans(struct mg_connection *c,
                             struct mg_http_message *hm, int user_id) {
  struct mg_str *id_var =
      mg_http_get_header(hm, "id"); // Query param not header? Mongoose 7.x
  // Actually mg_http_get_var is for query string
  char id_buf[32];
  if (mg_http_get_var(&hm->query, "id", id_buf, sizeof(id_buf)) > 0) {
    int pid = atoi(id_buf);
    char *json = db_get_plan(pid, user_id);
    if (json) {
      reply_data(c, json);
      free(json);
    } else {
      reply_error(c, 404, "Plan not found");
    }
  } else {
    char *json = db_get_plans(user_id);
    if (json) {
      reply_data(c, json);
      free(json);
    } else {
      reply_data(c, "[]");
    }
  }
}

static void handle_delete_plan(struct mg_connection *c,
                               struct mg_http_message *hm, int user_id) {
  char id_buf[32];
  if (mg_http_get_var(&hm->query, "id", id_buf, sizeof(id_buf)) > 0) {
    if (db_delete_plan(atoi(id_buf), user_id)) {
      reply_success(c, "Plan deleted");
    } else {
      reply_error(c, 500, "Failed to delete plan");
    }
  } else {
    reply_error(c, 400, "Missing id");
  }
}

static void handle_get_checklists(struct mg_connection *c, int user_id) {
  char *json = db_get_checklists(user_id);
  if (json) {
    reply_data(c, json);
    free(json);
  } else {
    reply_data(c, "[]");
  }
}

static void handle_delete_checklist(struct mg_connection *c,
                                    struct mg_http_message *hm, int user_id) {
  char id_buf[32];
  if (mg_http_get_var(&hm->query, "id", id_buf, sizeof(id_buf)) > 0) {
    if (db_delete_checklist(atoi(id_buf), user_id)) {
      reply_success(c, "Checklist deleted");
    } else {
      reply_error(c, 500, "Failed to delete");
    }
  } else {
    reply_error(c, 400, "Missing id");
  }
}

// Items
static void handle_add_item(struct mg_connection *c, struct mg_http_message *hm,
                            int user_id) {
  // Basic auth check already done
  cJSON *json = parse_json(hm);
  if (!json) {
    reply_error(c, 400, "Invalid JSON");
    return;
  }

  cJSON *cid = cJSON_GetObjectItem(json, "checklist_id");
  cJSON *txt = cJSON_GetObjectItem(json, "content");

  if (cJSON_IsNumber(cid) && cJSON_IsString(txt)) {
    if (db_add_checklist_item(cid->valueint, txt->valuestring)) {
      reply_success(c, "Item added");
    } else {
      reply_error(c, 500, "Failed to add item");
    }
  } else {
    reply_error(c, 400, "Missing fields");
  }
  cJSON_Delete(json);
}

// Challenges
static void handle_create_challenge(struct mg_connection *c,
                                    struct mg_http_message *hm, int user_id) {
  cJSON *json = parse_json(hm);
  if (!json) {
    reply_error(c, 400, "Invalid JSON");
    return;
  }

  // title, description, type, goal_count, duration_days, start_date
  cJSON *title = cJSON_GetObjectItem(json, "title");
  cJSON *desc = cJSON_GetObjectItem(json, "description");
  cJSON *type = cJSON_GetObjectItem(json, "type");
  cJSON *goal = cJSON_GetObjectItem(json, "goal_count");
  cJSON *dur = cJSON_GetObjectItem(json, "duration_days");
  cJSON *start = cJSON_GetObjectItem(json, "start_date");

  if (cJSON_IsString(title) && cJSON_IsString(type) && cJSON_IsNumber(goal) &&
      cJSON_IsString(start)) {
    const char *d_str = cJSON_IsString(desc) ? desc->valuestring : "";
    int d_days = cJSON_IsNumber(dur) ? dur->valueint : 30;

    int nid = db_create_challenge(user_id, title->valuestring, d_str,
                                  type->valuestring, goal->valueint, d_days,
                                  start->valuestring);
    if (nid > 0) {
      reply_json(
          c, 201,
          "{\"success\":true,\"message\":\"Challenge created\",\"id\":%d}",
          nid);
    } else {
      reply_error(c, 500, "Failed to create challenge");
    }
  } else {
    reply_error(c, 400, "Missing required fields");
  }
  cJSON_Delete(json);
}

static void handle_get_challenges(struct mg_connection *c, int user_id) {
  char *json = db_get_challenges(user_id);
  if (json) {
    reply_data(c, json);
    free(json);
  } else {
    reply_data(c, "[]");
  }
}

static void handle_get_dashboard_stats(struct mg_connection *c, int user_id) {
  char *json = db_get_dashboard_stats(user_id);
  if (json) {
    reply_data(c, json);
    free(json);
  } else {
    reply_error(c, 500, "Failed to fetch stats");
  }
}

// ROUTER
static void fn(struct mg_connection *c, int ev, void *ev_data) {
  if (ev == MG_EV_HTTP_MSG) {
    struct mg_http_message *hm = (struct mg_http_message *)ev_data;

    // 1. Global CORS / Preflight
    if (mg_strcmp(hm->method, mg_str("OPTIONS")) == 0) {
      mg_http_reply(c, 200, HEADERS, "");
      return;
    }

    // 2. Public Routes
    if (mg_http_match_uri(hm, "/") || mg_http_match_uri(hm, "/health")) {
      mg_http_reply(c, 200, HEADERS, "{\"success\":true,\"message\":\"ok\"}");
      return;
    }
    if (mg_http_match_uri(hm, "/auth/register")) {
      if (mg_strcmp(hm->method, mg_str("POST")) == 0)
        handle_register(c, hm);
      else
        reply_error(c, 405, "Method Not Allowed");
      return;
    }

    if (mg_http_match_uri(hm, "/auth/login")) {
      if (mg_strcmp(hm->method, mg_str("POST")) == 0)
        handle_login(c, hm);
      else
        reply_error(c, 405, "Method Not Allowed");
      return;
    }

    // 3. Auth Check for protected routes
    int user_id = check_auth(hm);
    if (user_id == -1) {
      reply_error(c, 401, "Unauthorized");
      return;
    }

    // 4. Protected Routes
    if (mg_http_match_uri(hm, "/plans")) {
      if (mg_strcmp(hm->method, mg_str("POST")) == 0)
        handle_create_plan(c, hm);
      else if (mg_strcmp(hm->method, mg_str("GET")) == 0)
        handle_get_plans(c, hm, user_id);
      else if (mg_strcmp(hm->method, mg_str("DELETE")) == 0)
        handle_delete_plan(c, hm, user_id);
      else
        reply_error(c, 405, "Method Not Allowed");
    } else if (mg_http_match_uri(hm, "/checklists")) {
      if (mg_strcmp(hm->method, mg_str("POST")) == 0)
        handle_create_checklist(c, hm);
      else if (mg_strcmp(hm->method, mg_str("GET")) == 0)
        handle_get_checklists(c, user_id);
      else if (mg_strcmp(hm->method, mg_str("DELETE")) == 0)
        handle_delete_checklist(c, hm, user_id);
      else
        reply_error(c, 405, "Method Not Allowed");
    } else if (mg_http_match_uri(hm, "/checklist_items")) {
      if (mg_strcmp(hm->method, mg_str("POST")) == 0)
        handle_add_item(c, hm, user_id);
      else
        reply_error(c, 405, "Method Not Allowed");
    } else if (mg_http_match_uri(hm, "/challenges")) {
      if (mg_strcmp(hm->method, mg_str("POST")) == 0)
        handle_create_challenge(c, hm, user_id);
      else if (mg_strcmp(hm->method, mg_str("GET")) == 0)
        handle_get_challenges(c, user_id);
      else
        reply_error(c, 405, "Method Not Allowed");
    } else if (mg_http_match_uri(hm, "/dashboard/stats")) {
      if (mg_strcmp(hm->method, mg_str("GET")) == 0)
        handle_get_dashboard_stats(c, user_id);
      else
        reply_error(c, 405, "Method Not Allowed");
    } else {
      reply_error(c, 404, "Not Found");
    }
  }
}

int main(void) {
  struct mg_mgr mgr;

  printf("Starting Word Tracker Backend...\n");

  auth_init();
  if (!db_init()) {
    char err_msg[256];
    db_get_last_error(err_msg, sizeof(err_msg));
    fprintf(stderr, "Database initialization failed: %s\n", err_msg);
    return 1;
  }

  mg_mgr_init(&mgr);
  if (!mg_http_listen(&mgr, LISTENING_ADDR, fn, NULL)) {
    fprintf(stderr, "Cannot listen on %s\n", LISTENING_ADDR);
    return 1;
  }

  printf("Server running on %s\n", LISTENING_ADDR);

  for (;;)
    mg_mgr_poll(&mgr, 1000);

  mg_mgr_free(&mgr);
  db_close();
  return 0;
}
