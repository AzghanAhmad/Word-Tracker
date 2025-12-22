#!/bin/bash
echo "Compiling Word Tracker Backend with MongoDB..."

# pkg-config failed, using explicit flags
FLAGS="-I/usr/include/libmongoc-1.0 -I/usr/include/libbson-1.0 -lmongoc-1.0 -lbson-1.0"

# Compile
gcc -o server main.c auth.c db.c cJSON.c mongoose.c $FLAGS -lsodium -lm

if [ $? -eq 0 ]; then
    echo "Build successful! Created 'server'."
else
    echo "Build failed."
    exit 1
fi
