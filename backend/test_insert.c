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

  if (mysql_query(conn, "DESCRIBE plans")) {
    fprintf(stderr, "DESCRIBE failed: %s\n", mysql_error(conn));
    return 1;
  }

  MYSQL_RES *res = mysql_store_result(conn);
  MYSQL_ROW row;
  printf("%-20s %-20s\n", "Field", "Type");
  printf("----------------------------------------\n");
  while ((row = mysql_fetch_row(res))) {
    printf("%-20s %-20s\n", row[0], row[1]);
  }

  mysql_free_result(res);
  mysql_close(conn);
  return 0;
}
