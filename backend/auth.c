#include "auth.h"
#include "cJSON.h"
#include <sodium.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>


#define JWT_HEADER "{\"alg\":\"HS256\",\"typ\":\"JWT\"}"

static char *base64url_encode(const unsigned char *data, size_t input_length) {
  size_t output_length = 4 * ((input_length + 2) / 3);
  char *encoded_data = malloc(output_length + 1);
  if (!encoded_data)
    return NULL;

  // Use libsodium's base64 then replace chars for URL safety
  if (sodium_bin2base64(encoded_data, output_length + 1, data, input_length,
                        sodium_base64_VARIANT_URLSAFE_NO_PADDING) == NULL) {
    free(encoded_data);
    return NULL;
  }
  return encoded_data;
}

// Simple JSON-like base64 decode for the specific structure of JWT (not a full
// generic implementation) Actually sodium has urlsafe decode too.
static unsigned char *base64url_decode(const char *data, size_t *out_len) {
  size_t len = strlen(data);
  size_t max_len = len * 3 / 4 + 1; // Approximation
  unsigned char *decoded = malloc(max_len);
  if (!decoded)
    return NULL;

  if (sodium_base642bin(decoded, max_len, data, len, NULL, out_len, NULL,
                        sodium_base64_VARIANT_URLSAFE_NO_PADDING) != 0) {
    free(decoded);
    return NULL;
  }
  return decoded;
}

void auth_init() {
  if (sodium_init() < 0) {
    fprintf(stderr, "libsodium initialization failed!\n");
    exit(1);
  }
}

bool auth_hash_password(const char *password, char *hash_out) {
  if (crypto_pwhash_str(hash_out, password, strlen(password),
                        crypto_pwhash_OPSLIMIT_INTERACTIVE,
                        crypto_pwhash_MEMLIMIT_INTERACTIVE) != 0) {
    return false;
  }
  return true;
}

bool auth_verify_password(const char *password, const char *hash) {
  if (crypto_pwhash_str_verify(hash, password, strlen(password)) != 0) {
    return false;
  }
  return true;
}

char *auth_generate_jwt(int user_id, const char *secret_key) {
  // 1. Header
  char *header_enc =
      base64url_encode((unsigned char *)JWT_HEADER, strlen(JWT_HEADER));

  // 2. Payload
  // exp = 24 hours from now
  time_t exp = time(NULL) + (24 * 60 * 60);
  char payload[100];
  snprintf(payload, sizeof(payload), "{\"sub\":%d,\"exp\":%ld}", user_id, exp);
  char *payload_enc =
      base64url_encode((unsigned char *)payload, strlen(payload));

  // 3. Signature Input
  size_t sig_input_len = strlen(header_enc) + 1 + strlen(payload_enc);
  char *sig_input = malloc(sig_input_len + 1);
  snprintf(sig_input, sig_input_len + 1, "%s.%s", header_enc, payload_enc);

  // 4. Sign
  unsigned char sig[crypto_auth_hmacsha256_BYTES];
  crypto_auth_hmacsha256(sig, (unsigned char *)sig_input, strlen(sig_input),
                         (unsigned char *)secret_key);

  // 5. Encode Signature
  char *sig_enc = base64url_encode(sig, sizeof(sig));

  // 6. Concatenate
  size_t jwt_len = strlen(sig_input) + 1 + strlen(sig_enc);
  char *jwt = malloc(jwt_len + 1);
  snprintf(jwt, jwt_len + 1, "%s.%s", sig_input, sig_enc);

  free(header_enc);
  free(payload_enc);
  free(sig_input);
  free(sig_enc);

  return jwt;
}

int auth_validate_jwt(const char *token, const char *secret_key) {
  // Simple parsing: Header.Payload.Signature
  // We verify signature first.

  char *token_copy = strdup(token);
  char *dot1 = strchr(token_copy, '.');
  if (!dot1) {
    free(token_copy);
    return -1;
  }
  char *dot2 = strchr(dot1 + 1, '.');
  if (!dot2) {
    free(token_copy);
    return -1;
  }

  *dot2 = '\0'; // Split signature from header.payload
  char *sig_input = token_copy;
  char *provided_sig_b64 = dot2 + 1;

  // Verify signature
  unsigned char expected_sig[crypto_auth_hmacsha256_BYTES];
  crypto_auth_hmacsha256(expected_sig, (unsigned char *)sig_input,
                         strlen(sig_input), (unsigned char *)secret_key);

  // Encode expected signature to compare strings (cleaner handling of variable
  // lengths) Or decode provided signature. Let's decode provided.
  size_t sig_len;
  unsigned char *provided_sig = base64url_decode(provided_sig_b64, &sig_len);
  if (!provided_sig || sig_len != sizeof(expected_sig)) {
    free(provided_sig);
    free(token_copy);
    return -1;
  }

  // Constant time comparison
  if (sodium_memcmp(expected_sig, provided_sig, sizeof(expected_sig)) != 0) {
    free(provided_sig);
    free(token_copy);
    return -1;
  }
  free(provided_sig);

  // Now parse payload
  *dot1 = '\0'; // Split header
  char *payload_b64 = dot1 + 1;
  size_t payload_len;
  unsigned char *payload_json = base64url_decode(payload_b64, &payload_len);
  // Be careful, payload_json is not null terminated from bin decode
  // necessarily, but base64url_decode allocates buffer. We should likely append
  // \0 if we treat as string. My base64url_decode helper allocates. I should
  // zero pad it or realloc. Let's just assume simple decode has enough room or
  // force null term in helper? Let's use cJSON_Parse. cJSON expects string.

  // Safer:
  char *json_str = malloc(payload_len + 1);
  memcpy(json_str, payload_json, payload_len);
  json_str[payload_len] = '\0';
  free(payload_json);

  cJSON *json = cJSON_Parse(json_str);
  free(json_str);
  free(token_copy); // Done with splitting

  if (!json)
    return -1;

  // Check expiration
  cJSON *exp_item = cJSON_GetObjectItem(json, "exp");
  if (cJSON_IsNumber(exp_item)) {
    time_t now = time(NULL);
    if (now > (time_t)exp_item->valuedouble) { // cJSON numbers are doubles
      cJSON_Delete(json);
      return -1; // Expired
    }
  }

  // Get user id
  int user_id = -1;
  cJSON *sub_item = cJSON_GetObjectItem(json, "sub");
  if (cJSON_IsNumber(sub_item)) {
    user_id = sub_item->valueint;
  }

  cJSON_Delete(json);
  return user_id;
}
