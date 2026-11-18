#!/usr/bin/env bash
#!/usr/bin/env bash
set -euo pipefail
LOCK="/Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter/backend/data/cron.lock"
STALE_SECONDS=1800  # 30분
PID_FILE="${LOCK}.pid"

# 오래된 잠금 해제 (30분 이상)
if [ -f "$LOCK" ]; then
  MTIME=$(stat -f %m "$LOCK" 2>/dev/null || stat -c %Y "$LOCK" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  if [ $((NOW - MTIME)) -gt $STALE_SECONDS ]; then
    echo "[$(date '+%F %T')] stale lock removed" >> "/Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter/backend/data/cron.log"
    rm -f "$LOCK" "$PID_FILE"
  fi
fi

# 이미 실행 중이면 종료
if [ -e "$LOCK" ]; then
  echo "[$(date '+%F %T')] already running, skipping" >> "/Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter/backend/data/cron.log"
  exit 0
fi

mkdir -p "$(dirname "$LOCK")"
touch "$LOCK"
echo $$ > "$PID_FILE"

echo "=== [$(date '+%F %T')] cron sync started ===" >> "/Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter/backend/data/cron.log"
/usr/bin/env python3 "/Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter/backend/cron_update.py" >> "/Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter/backend/data/cron.log" 2>&1
RC=$?

rm -f "$LOCK" "$PID_FILE"
echo "=== [$(date '+%F %T')] cron sync finished (rc=$RC) ===" >> "/Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter/backend/data/cron.log"
exit $RC
