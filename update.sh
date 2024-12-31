#!/bin/bash

REPO_URL="https://github.com/sift732/echo-Bot"
TARGET_DIR="$HOME/echo-bot"
EXCLUDE_FILES=("Lavalink.jar" ".env")

if [ ! -d "$TARGET_DIR/.git" ]; then
  echo "Git repository not found. Cloning the repository..."
  git clone "$REPO_URL" "$TARGET_DIR"
else
  echo "Updating repository..."
  cd "$TARGET_DIR" || exit
  git pull origin main
fi

cd "$TARGET_DIR" || exit
for file in "${EXCLUDE_FILES[@]}"; do
  if [ -f "$TARGET_DIR/$file" ]; then
    mv "$TARGET_DIR/$file" "$TARGET_DIR/.${file}.bak"
  fi
done

git checkout -- .

for file in "${EXCLUDE_FILES[@]}"; do
  if [ -f "$TARGET_DIR/.${file}.bak" ]; then
    mv "$TARGET_DIR/.${file}.bak" "$TARGET_DIR/$file"
  fi
done

for file in $(ls -A "$TARGET_DIR"); do
  if [[ ! " ${EXCLUDE_FILES[@]} " =~ " ${file} " && ! -d "$file" ]]; then
    echo "Deleting file: $file"
    rm -rf "$TARGET_DIR/$file"
  fi
done

for dir in $(find . -type d); do
  if [ ! -d "$TARGET_DIR/$dir" ]; then
    mkdir -p "$TARGET_DIR/$dir"
  fi
done

if [ -f "$TARGET_DIR/run.sh" ]; then
  echo "Running run.sh..."
  bash "$TARGET_DIR/run.sh"
else
  echo "run.sh not found!"
fi
