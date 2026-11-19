"""
Daiso 3D Fitter - periodic product fetch & sync (cron entry).

Two-stage pipeline (launchd/cron -> cron_exec.sh -> this script):

  Stage A (FETCH)  : run the Daiso Mall crawler (collect_all.py) with the
                     backend virtualenv python so httpx et al. are available.
                     This rewrites backend/data/daiso_organizers.json with the
                     freshest catalog, dimensions, prices and stock flags.
  Stage B (SYNC)   : run sync_to_frontend.py to mirror the refreshed backend
                     JSON into frontend/src/data/daisoProducts.json.

If Stage A fails (network down, rate-limited, backend lib missing) we log it
and fall back to syncing whatever currently exists, so the pipeline never
hard-fails the schedule. A 30-minute stale lock (in cron_exec.sh) guards
against overlapping runs.
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
BACKEND_DATA = BACKEND_DIR / "data" / "daiso_organizers.json"
FRONTEND_DATA = PROJECT_ROOT / "frontend" / "src" / "data" / "daisoProducts.json"
SYNC_SCRIPT = PROJECT_ROOT / "sync_to_frontend.py"
CRAWL_SCRIPT = BACKEND_DIR / "app" / "scraper" / "collect_all.py"
META_PATH = BACKEND_DIR / "data" / "sync_meta.json"
LOG = open(__file__.replace("cron_update.py", "cron_run.log"), "a", encoding="utf-8")

def log(msg):
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    try:
        LOG.write(line + "\n"); LOG.flush()
    except Exception:
        pass

def pick_python():
    """Prefer the backend venv python (has httpx), else system python3."""
    venv = BACKEND_DIR / "venv" / "bin" / "python"
    if venv.exists():
        return str(venv)
    return sys.executable or "python3"

def count_products(path: Path) -> int:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return len(data) if isinstance(data, list) else 0
    except Exception:
        return 0

def stage_a_crawl() -> dict:
    py = pick_python()
    log(f"Stage A: crawl via python={py}")
    before = count_products(BACKEND_DATA)
    start = time.time()
    try:
        proc = subprocess.run(
            [py, "-m", "app.scraper.collect_all"],
            cwd=str(BACKEND_DIR),
            capture_output=True, text=True, timeout=1500,
        )
        dt = time.time() - start
        after = count_products(BACKEND_DATA)
        detail = (proc.stdout or "")[-400:]
        err = (proc.stderr or "")[-400:]
        ok = proc.returncode == 0 and after > 0
        log(f"Stage A: rc={proc.returncode} before={before} after={after} "
            f"delta={after - before} took={dt:.1f}s ok={ok}")
        if err:
            log("Stage A stderr(tail): " + err.replace("\n", " | "))
        if detail:
            log("Stage A stdout(tail): " + detail.replace("\n", " | "))
        return {"status": "success" if ok else "failed",
                "products": after, "delta": after - before,
                "detail": err or detail}
    except subprocess.TimeoutExpired:
        after = count_products(BACKEND_DATA)
        log(f"Stage A: TIMEOUT(1500s) after={after}")
        return {"status": "timeout", "products": after, "delta": after - before,
                "detail": "crawl timeout"}
    except Exception as e:
        log(f"Stage A: ERROR {e}")
        return {"status": "error", "products": count_products(BACKEND_DATA),
                "delta": 0, "detail": str(e)}

def stage_b_sync() -> dict:
    log("Stage B: sync backend -> frontend")
    start = time.time()
    try:
        proc = subprocess.run(
            [sys.executable, str(SYNC_SCRIPT)],
            capture_output=True, text=True, timeout=300,
        )
        dt = time.time() - start
        detail = (proc.stdout or "")[-300:]
        err = (proc.stderr or "")[-300:]
        ok = proc.returncode == 0
        synced = count_products(FRONTEND_DATA)
        log(f"Stage B: rc={proc.returncode} frontend_products={synced} took={dt:.1f}s")
        if detail:
            log("Stage B stdout(tail): " + detail.replace("\n", " | "))
        if err:
            log("Stage B stderr(tail): " + err.replace("\n", " | "))
        return {"status": "success" if ok else "failed",
                "synced": synced, "detail": err or detail}
    except subprocess.TimeoutExpired:
        return {"status": "timeout", "synced": count_products(FRONTEND_DATA),
                "detail": "sync timeout"}
    except Exception as e:
        return {"status": "error", "synced": count_products(FRONTEND_DATA),
                "detail": str(e)}

def update_meta(fetched, synced):
    try:
        META_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(META_PATH, "r", encoding="utf-8") as f:
            meta = json.load(f)
    except Exception:
        meta = {}
    meta["last_cron"] = time.strftime("%Y-%m-%d %H:%M:%S")
    meta["crawl_status"] = fetched.get("status")
    meta["crawl_products"] = fetched.get("products")
    meta["crawl_delta"] = fetched.get("delta")
    meta["sync_status"] = (synced or {}).get("status")
    meta["frontend_products"] = (synced or {}).get("synced")
    try:
        with open(META_PATH, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"meta write failed: {e}")

def run_cron_job():
    start = time.strftime("%Y-%m-%d %H:%M:%S")
    log(f"=== CRON START {start} ===")
    fetched = stage_a_crawl()
    # Always mirror backend->frontend (best effort), even if the crawl
    # step failed this run, so the frontend never falls behind the backend.
    synced = stage_b_sync()
    update_meta(fetched, synced)
    crawl_ok = fetched.get("status") == "success"
    sync_ok = (synced or {}).get("status") == "success"
    final = "success" if (crawl_ok and sync_ok) else \
            "partial" if (sync_ok or fetched.get("products", 0) > 0) else "failed"
    log(f"=== CRON END crawl={fetched.get('status')} "
        f"sync={(synced or {}).get('status')} final={final} ===")
    return {"final_status": final, "crawl": fetched, "sync": synced}

if __name__ == "__main__":
    result = run_cron_job()
    print("\n=== 크론 작업 결과 ===")
    print(f"final_status : {result['final_status']}")
    print(f"crawl (FETCH): {result['crawl'].get('status')}  "
          f"products={result['crawl'].get('products')}  "
          f"delta={result['crawl'].get('delta')}")
    print(f"sync  (MIRROR):{result['sync'].get('status')}  "
          f"frontend_products={result['sync'].get('synced')}")
