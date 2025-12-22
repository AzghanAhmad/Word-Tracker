CC = gcc
CFLAGS = -Wall -Wextra -O2
LIBS = -lmysqlclient -lsodium

# Source files
SRCS = main.c db.c auth.c mongoose.c cJSON.c
OBJS = $(SRCS:.c=.o)
TARGET = server

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS) $(LIBS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: all clean
