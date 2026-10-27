import asyncio
import json
import logging
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from .parser import DimensionParser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DaisoScraper")

class DaisoScraper:
    """
    Polite and rate-limited scraper for Daiso drawer organizers.
    Adheres to safe crawling practices:
    - User-agent declaration
    - Configurable delay (default 1.5s per request)
    - Extracts only factual dimension and SKU specifications
    """
    BASE_URL = "https://www.daisomall.co.kr"
    STORAGE_CATEGORY_PATH = "/pd/pdr/category?dispClsfNo=1000000000" # Sample category path

    def __init__(self, delay_sec: float = 1.5):
        self.delay_sec = delay_sec
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Daiso3DFitterResearchBot/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    async def fetch_product_details(self, client: httpx.AsyncClient, product_code: str) -> Optional[Dict[str, Any]]:
        """
        Fetches a single product page and parses dimension specifications.
        """
        url = f"{self.BASE_URL}/pd/pdr/pdr0001?goodsNo={product_code}"
        try:
            await asyncio.sleep(self.delay_sec)
            resp = await client.get(url, headers=self.headers, timeout=10.0)
            if resp.status_code != 200:
                logger.warning(f"Failed to fetch {url}: HTTP {resp.status_code}")
                return None

            soup = BeautifulSoup(resp.text, 'html.parser')
            title_elem = soup.select_one('.goods_title, h2.title, .prod_name')
            name = title_elem.get_text(strip=True) if title_elem else f"다이소 수납함 {product_code}"

            price_elem = soup.select_one('.price_num, .total_price, .sell_price')
            price = 1000
            if price_elem:
                raw_price = re.sub(r'[^0-9]', '', price_elem.get_text())
                if raw_price:
                    price = int(raw_price)

            # Find dimension specs in table or description text
            body_text = soup.get_text(separator=" ")
            dims = DimensionParser.parse_dimensions_cm(body_text)

            if dims:
                w, d, h = dims
                return {
                    "id": f"daiso-{product_code}",
                    "item_code": product_code,
                    "name": name,
                    "category": "tray",
                    "category_label": "서랍 트레이",
                    "width": w,
                    "depth": d,
                    "height": h,
                    "price": price,
                    "color": "#BAE6FD",
                    "description": f"{w}×{d}×{h}cm 다이소 수납함",
                    "mall_url": url
                }
        except Exception as e:
            logger.error(f"Error scraping {product_code}: {e}")
        return None

    def save_products_to_json(self, products: List[Dict[str, Any]], filepath: Path):
        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved {len(products)} products to {filepath}")
