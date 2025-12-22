#include <mysql/mysql.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
  MYSQL *conn = mysql_init(NULL);
  if (conn == NULL) {
    fprintf(stderr, "mysql_init() failed\n");
    return 1;
  }

  if (mysql_real_connect(conn, "127.0.0.1", "root", "", "word_tracker", 3306,
                         NULL, 0) == NULL) {
    fprintf(stderr, "mysql_real_connect() failed: %s\n", mysql_error(conn));
    mysql_close(conn);
    return 1;
  }

  // Add algorithm_type
  if (mysql_query(conn, "ALTER TABLE plans ADD COLUMN algorithm_type "
                        "VARCHAR(50) DEFAULT 'steady'")) {
    // Only print if not "Duplicate column name"
    fprintf(stderr, "Query 1 (algorithm_type) result: %s\n", mysql_error(conn));
  } else {
    printf("Added algorithm_type\n");
  }

  // Add show_historical_data
  if (mysql_query(conn, "ALTER TABLE plans ADD COLUMN show_historical_data "
                        "BOOLEAN DEFAULT TRUE")) {
    fprintf(stderr, "Query 2 (show_historical_data) result: %s\n",
            mysql_error(conn));
  } else {
    printf("Added show_historical_data\n");
  }

  // Add progress_tracking_type
  if (mysql_query(conn, "ALTER TABLE plans ADD COLUMN progress_tracking_type "
                        "VARCHAR(50) DEFAULT 'Daily Goals'")) {
    fprintf(stderr, "Query 3 (progress_tracking_type) result: %s\n",
            mysql_error(conn));
  } else {
    printf("Added progress_tracking_type\n");
  }

  // Add display_view_type
  if (mysql_query(conn, "ALTER TABLE plans ADD COLUMN display_view_type "
                        "VARCHAR(20) DEFAULT 'Table'")) {
    fprintf(stderr, "Query 4 (display_view_type) result: %s\n",
            mysql_error(conn));
  } else {
    printf("Added display_view_type\n");
  }

  printf("Schema update finished.\n");
  mysql_close(conn);
  return 0;
}
