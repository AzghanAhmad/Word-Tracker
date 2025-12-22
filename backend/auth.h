#ifndef AUTH_H
#define AUTH_H

#include "cJSON.h" // For parsed payloads
#include <stdbool.h>

// Password Hashing
#define AUTH_HASH_LEN 128

// Returns true on success, hash is stored in output buffer (must be at least
// AUTH_HASH_LEN)
bool auth_hash_password(const char *password, char *hash_out);

// Returns true if password matches hash
bool auth_verify_password(const char *password, const char *hash);

// JWT Operations
// Returns a heap-allocated string (caller must free) containing the JWT
// user_id is embedded in the token
char *auth_generate_jwt(int user_id, const char *secret_key);

// Returns the user_id from the token if valid, or -1 if invalid/expired
int auth_validate_jwt(const char *token, const char *secret_key);

void auth_init(); // Initialize libsodium

#endif
