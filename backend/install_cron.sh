#!/usr/bin/env bash
# Daiso 3D Fitter - 크론 자동 업데이트 설치 스크립트
#
# 사용법:
#   bash install_cron.sh install    # 매일 오전 6시에 크론 작업 등록
#   bash install_cron.sh uninstall  # 크론 작업 제거
#   bash install_cron.sh run-now    # 지금 바로 크론 작업 실행 (테스트용)
#   bash install_cron.sh list       # 등록된 크론 작업 목록 확인
#
# 동작 방식:
#   cron → cron_update.py → sync_to_frontend.py 실행
#   다이소몰 백엔드에서 JSON 재다운로드 후 프론트엔드 daisoProducts.json 동기화

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PYTHON_BIN="${PYTHON_BIN:-/usr/bin/env python3}"
LOCK_FILE="$PROJECT_ROOT/backend/data/cron.lock"
LOG_FILE="$PROJECT_ROOT/backend/data/cron.log"
CRON_TAG="DAISO_3D_FITTER_SYNC"

# 중복 실행 방지 래퍼: 잠금 파일 기준 30분 동안만 한 개의 작업만 실행
EXEC_SCRIPT="$PROJECT_ROOT/backend/cron_exec.sh"

ensure_exec_script() {
  cat > "$EXEC_SCRIPT" <<EOF
#!/usr/bin/env bash
#!/usr/bin/env bash
set -euo pipefail
LOCK="$LOCK_FILE"
STALE_SECONDS=1800  # 30분
PID_FILE="\${LOCK}.pid"

# 오래된 잠금 해제 (30분 이상)
if [ -f "\$LOCK" ]; then
  MTIME=\$(stat -f %m "\$LOCK" 2>/dev/null || stat -c %Y "\$LOCK" 2>/dev/null || echo 0)
  NOW=\$(date +%s)
  if [ \$((NOW - MTIME)) -gt \$STALE_SECONDS ]; then
    echo "[\$(date '+%F %T')] stale lock removed" >> "$LOG_FILE"
    rm -f "\$LOCK" "\$PID_FILE"
  fi
fi

# 이미 실행 중이면 종료
if [ -e "\$LOCK" ]; then
  echo "[\$(date '+%F %T')] already running, skipping" >> "$LOG_FILE"
  exit 0
fi

mkdir -p "\$(dirname "\$LOCK")"
touch "\$LOCK"
echo \$\$ > "\$PID_FILE"

echo "=== [\$(date '+%F %T')] cron sync started ===" >> "$LOG_FILE"
$PYTHON_BIN "$PROJECT_ROOT/backend/cron_update.py" >> "$LOG_FILE" 2>&1
RC=\$?

rm -f "\$LOCK" "\$PID_FILE"
echo "=== [\$(date '+%F %T')] cron sync finished (rc=\$RC) ===" >> "$LOG_FILE"
exit \$RC
EOF
  chmod +x "$EXEC_SCRIPT"
  echo "Created $EXEC_SCRIPT"
}

cmd="${1:-}"

case "$cmd" in
  install)
    ensure_exec_script
    EXPR="$CRON_TAG $EXEC_SCRIPT"
    # 06:00 daily
    ( crontab -l 2>/dev/null | grep -v "$CRON_TAG" ; echo "0 6 * * * $EXPR" ) | crontab -
    echo "✅ 크론 등록 완료: 매일 06:00 자동 실행"
    crontab -l | grep "$CRON_TAG" || true
    ;;
  uninstall)
    crontab -l 2>/dev/null | grep -v "$CRON_TAG" | crontab -
    echo "✅ 크론 등록 해제"
    ;;
  run-now)
    ensure_exec_script
    "$EXEC_SCRIPT"
    echo "✅ 작업 실행 완료. 로그: $LOG_FILE"
    tail -20 "$LOG_FILE" 2>/dev/null || true
    ;;
  list)
    crontab -l 2>/dev/null | grep "$CRON_TAG" || echo "(등록된 크론 없음)"
    ;;
  *)
    echo "사용법: bash install_cron.sh {install|uninstall|run-now|list}"
    ;;
esac
