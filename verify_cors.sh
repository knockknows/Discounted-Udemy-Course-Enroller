#!/bin/bash

echo "Verifying CORS Configuration..."
echo "Ensure your docker containers are running (docker-compose up)"

# Check if backend is reachable
echo "Checking Backend Reachability..."
if curl -s -I http://localhost:8000/docs > /dev/null; then
    echo "[OK] Backend is reachable."
else
    echo "[FAIL] Backend is not reachable. Is it running?"
    exit 1
fi

# Check Allowed Origin
echo "Checking Allowed Origin (http://localhost:3000)..."
RESPONSE=$(curl -s -I -H "Origin: http://localhost:3000" http://localhost:8000/courses)
if echo "$RESPONSE" | grep -q "access-control-allow-origin: http://localhost:3000"; then
    echo "[OK] CORS allows localhost:3000"
else
    echo "[FAIL] CORS did not return expected allow-origin header."
    echo "Response headers:"
    echo "$RESPONSE"
fi

# Check Blocked Origin
echo "Checking Blocked Origin (http://evil.com)..."
RESPONSE_EVIL=$(curl -s -I -H "Origin: http://evil.com" http://localhost:8000/courses)
if echo "$RESPONSE_EVIL" | grep -q "access-control-allow-origin"; then
    echo "[FAIL] CORS allowed evil.com (unexpected)"
    echo "$RESPONSE_EVIL"
else
    echo "[OK] CORS did not allow evil.com (as expected)"
fi
