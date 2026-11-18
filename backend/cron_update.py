"""
Daiso 3D Fitter - 자동 제품 업데이트 크론 스크립트
시스템 크론(CRON)에 의해 정기적으로 실행되어 다이소 제품 카탈로그를 최신 상태로 유지합니다.
"""
import json
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

# 절대 경로로 기본 디렉토리 설정 (이 스크립트는 /Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter/backend에서 실행됨)
PROJECT_ROOT = Path("/Users/joonhoseong/Desktop/workspace/Personal/daiso-3d-fitter")
BACKEND_DATA = PROJECT_ROOT / "backend" / "data" / "daiso_organizers.json"
FRONTEND_DATA = PROJECT_ROOT / "frontend" / "src" / "data" / "daisoProducts.json"
SYNC_SCRIPT = PROJECT_ROOT / "sync_to_frontend.py"
META_PATH = PROJECT_ROOT / "backend" / "data" / "sync_meta.json"


def extract_synced_count(output: str) -> int:
    """출력에서 업데이트된 상품 수 추출"""
    # "Successfully synced 27,497 products" 패턴 처리
    match = re.search(r'Successfully synced [\d,]+ products', output)
    if match:
        # 콤마가 있는 숫자 처리 (예: "27,497" -> 27497)
        num_str = match.group(0).replace("Successfully synced ", "").replace(" products", "")
        try:
            return int(num_str.replace(",", ""))
        except ValueError:
            pass
    
    # 대안: 출력에서 가장 큰 숫자 찾기 (대부분의 경우 이것이 제품 수)
    numbers = re.findall(r'\d+', output)
    if numbers:
        # 콤마가 있는 숫자 처리
        for num_str in numbers:
            try:
                val = int(num_str.replace(",", ""))
                if val > 100:  # 상품 수는 100 이상이어야 함
                    return val
            except ValueError:
                continue
    
    return 0


def run_cron_job() -> Dict[str, Any]:
    """
    크론 작업 메인 함수
    - 동기화 스크립트 실행
    - 프론트엔드 데이터 업데이트 확인
    - 상태 메타 기록
    """
    result = {
        "start_time": time.strftime("%Y-%m-%d %H:%M:%S"),
        "steps": []
    }
    
    result["steps"].append({"step": "run_sync", "status": "running"})
    
    # 동기화 스크립트 실행 (절대 경로 사용)
    try:
        result_sub = subprocess.run(
            [sys.executable, str(SYNC_SCRIPT)],
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result_sub.returncode == 0:
            synced_count = extract_synced_count(result_sub.stdout)
            result["steps"].append({"step": "run_sync", "status": "success", "detail": synced_count, "output": result_sub.stdout[-300:]})
            result["synced_count"] = synced_count
        else:
            result["steps"].append({"step": "run_sync", "status": "failed", "detail": result_sub.stderr[-300:] if result_sub.stderr else "Unknown error"})
            result["synced_count"] = 0
    except subprocess.TimeoutExpired:
        result["steps"].append({"step": "run_sync", "status": "timeout", "detail": "Sync took longer than 5 minutes"})
        result["synced_count"] = 0
    except Exception as e:
        result["steps"].append({"step": "run_sync", "status": "error", "detail": str(e)})
        result["synced_count"] = 0
    
    if result["synced_count"] > 0:
        result["steps"].append({"step": "update_meta", "status": "running"})
        try:
            with open(META_PATH, "w", encoding="utf-8") as f:
                json.dump({
                    "last_cron": result["start_time"],
                    "products_synced": result.get("synced_count", 0),
                    "last_sync_script": "sync_to_frontend.py"
                }, f, ensure_ascii=False, indent=2)
            result["steps"].append({"step": "update_meta", "status": "success"})
        except Exception as e:
            result["steps"].append({"step": "update_meta", "status": "error", "detail": str(e)})
    else:
        result["steps"].append({"step": "update_meta", "status": "skipped", "detail": "No products synced"})
    
    result["end_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
    
    step_statuses = [s.get("status", "unknown") for s in result["steps"] if "status" in s and s.get("status") != "running"]
    if "error" in step_statuses or "failed" in step_statuses or "timeout" in step_statuses:
        result["final_status"] = "partial_error"
    elif "success" in step_statuses:
        result["final_status"] = "success"
    else:
        result["final_status"] = "running"
    
    return result


if __name__ == "__main__":
    result = run_cron_job()
    print(f"\n=== 크론 작업 결과 ===")
    print(f"시작: {result.get('start_time')}")
    print(f"종료: {result.get('end_time')}")
    print(f"최종 상태: {result.get('final_status')}")
    print(f"업데이트된 상품 수: {result.get('synced_count', 0)}")
    print(f"\n단계별 진행 상황:")
    for step in result.get("steps", []):
        step_name = list(step.keys())[0] if step else "unknown"
        step_status = step.get("status", "unknown") if "status" in step else "unknown"
        print(f"  - {step_name}: {step_status}")
