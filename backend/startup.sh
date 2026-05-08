#!/bin/bash

echo "========================================="
echo "Container starting at $(date)"
echo "========================================="

cd /home/site/wwwroot
ls -la

echo "Python version:"
python3 --version

echo "Installing dependencies..."
pip install --no-cache-dir -r requirements.txt 2>&1

if [ $? -eq 0 ]; then
    echo "Dependencies installed successfully!"
else
    echo "Failed to install dependencies!"
    exit 1
fi

echo "Starting application..."
echo "Directory contents:"
ls -la /home/site/wwwroot

exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level debug