#include "db.h"
#include <stdio.h>

int main() {
  printf("Testing database connection...\n");
  if (db_init()) {
    printf("Database connection successful!\n");
    db_close();
  } else {
    printf("Database connection failed!\n");
  }
  return 0;
}
