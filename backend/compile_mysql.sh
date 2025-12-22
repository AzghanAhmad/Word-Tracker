#!/bin/bash
echo "Compiling Word Tracker Backend with MySQL..."

# Compile with MySQL client library
gcc -o server main.c auth.c db.c cJSON.c mongoose.c -lmysqlclient -lsodium -lm

if [ $? -eq 0 ]; then
    echo "Build successful! Created 'server'."
else
    echo "Build failed."
    exit 1
fi
