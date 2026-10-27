import asyncio
import httpx
import json
import logging
import re
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PreciseDimUpdater")

def parse_detail_text(txt: str) -> Optional[Tuple[float, float, float]]:
    if not txt:
        return None

    # 1. 3D patterns: 32X19.5X4.5cm / 12x11x7cm / 19 X 10 X 10 cm / 14.5 * 10.5 * 9.5
    m3d = re.findall(
        r'(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*[\*xX×]\s*([0-9]+(?:\.[0-9]+)?)\s*[\*xX×]\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?',
        txt
    )
    if m3d:
        for w_s, d_s, h_s, unit in reversed(m3d):
            w, d, h = float(w_s), float(d_s), float(h_s)
            if (unit or "cm").lower() == "mm":
                w, d, h = w / 10.0, d / 10.0, h / 10.0
            if 1.0 <= w <= 200.0 and 1.0 <= d <= 200.0 and 0.5 <= h <= 150.0:
                return round(w, 1), round(d, 1), round(h, 1)

    # 2. Labeled dimensions (가로, 세로/깊이, 높이/두께)
    w_m = re.search(r'(?:가로|폭|W|w)[:\s]*약?\s*([0-9]+(?:\.[0-9]+)?)(?:\s*~[0-9]+(?:\.[0-9]+)?)?\s*(cm|mm)?', txt)
    d_m = re.search(r'(?:세로|깊이|길이|D|d)[:\s]*약?\s*(?:[0-9]+(?:\.[0-9]+)?\s*~)?\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?', txt)
    h_m = re.search(r'(?:높이|두께|H|h)[:\s]*약?\s*([0-9]+(?:\.[0-9]+)?)(?:\s*~[0-9]+(?:\.[0-9]+)?)?\s*(cm|mm)?', txt)

    if w_m and d_m and h_m:
        w = float(w_m.group(1))
        d = float(d_m.group(1))
        h = float(h_m.group(1))
        w_unit = (w_m.group(2) or "cm").lower()
        d_unit = (d_m.group(2) or "cm").lower()
        h_unit = (h_m.group(2) or "cm").lower()
        if w_unit == "mm": w /= 10.0
        if d_unit == "mm": d /= 10.0
        if h_unit == "mm": h /= 10.0
        if 1.0 <= w <= 200.0 and 1.0 <= d <= 200.0 and 0.5 <= h <= 150.0:
            return round(w, 1), round(d, 1), round(h, 1)

    # 3. Circular/round trays or turntables: 지름/직경 XX cm
    circ_m = re.search(r'(?:지름|직경|원형)[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?', txt)
    if circ_m:
        dia = float(circ_m.group(1))
        u = (circ_m.group(2) or "cm").lower()
        if u == "mm": dia /= 10.0
        h = 4.0
        if h_m:
            h = float(h_m.group(1))
            if (h_m.group(2) or "cm").lower() == "mm": h /= 10.0
        if 4.0 <= dia <= 150.0 and 0.5 <= h <= 100.0:
            return round(dia, 1), round(dia, 1), round(h, 1)

    # 4. Labeled 2D (mats, liners, trays with w & d):
    if w_m and d_m:
        w = float(w_m.group(1))
        d = float(d_m.group(1))
        w_unit = (w_m.group(2) or "cm").lower()
        d_unit = (d_m.group(2) or "cm").lower()
        if w_unit == "mm": w /= 10.0
        if d_unit == "mm": d /= 10.0
        h = 0.3 if any(k in txt for k in ["매트", "시트", "깔개", "패드", "라이너"]) else 4.0
        if 2.0 <= w <= 200.0 and 2.0 <= d <= 200.0:
            return round(w, 1), round(d, 1), round(h, 1)

    # 5. 2D pattern: XX x YY cm
    m2d = re.findall(r'(?:약\s*)?([0-9]+(?:\.[0-9]+)?)\s*[\*xX×]\s*([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)?', txt)
    if m2d:
        for w_s, d_s, unit in reversed(m2d):
            w, d = float(w_s), float(d_s)
            if (unit or "cm").lower() == "mm":
                w, d = w / 10.0, d / 10.0
            h = 0.3 if any(k in txt for k in ["매트", "시트", "깔개", "패드", "라이너"]) else 4.5
            if 2.0 <= w <= 200.0 and 2.0 <= d <= 200.0:
                return round(w, 1), round(d, 1), round(h, 1)

    return None

async def test_sample():
    test_codes = [
        "1066460", "1066461", "1066459", "1017142", "1059295",
        "52965", "1020404", "1064191", "1070255", "1060684",
        "58367", "1003729", "1016218", "1031758", "1057969"
    ]
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    async with httpx.AsyncClient(limits=httpx.Limits(max_connections=10), timeout=10.0) as client:
        for code in test_codes:
            try:
                resp = await client.post("https://www.daisomall.co.kr/api/pd/pdr/pdDtl/selPdDtlDesc", json={"pdNo": code}, headers=headers)
                if resp.status_code == 200:
                    txt = resp.json().get("data", {}).get("pdDtlDesc", {}).get("vsipPdDtl", "")
                    dims = parse_detail_text(txt)
                    print(f"[{code}] parsed -> {dims}")
            except Exception as e:
                print(f"[{code}] error: {e}")

if __name__ == "__main__":
    asyncio.run(test_sample())
