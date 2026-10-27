import json
from pathlib import Path

def sync():
    root = Path(__file__).resolve().parent
    json_path = root / "backend" / "data" / "daiso_organizers.json"
    frontend_json_path = root / "frontend" / "src" / "data" / "daisoProducts.json"
    redundant_frontend_org_path = root / "frontend" / "src" / "data" / "daiso_organizers.json"

    if not json_path.exists():
        print("daiso_organizers.json not found!")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    print(f"Loaded {len(items):,} items from {json_path}")

    converted = []
    for item in items:
        converted.append({
            "id": item.get("id"),
            "itemCode": str(item.get("item_code", "")),
            "name": item.get("name"),
            "category": item.get("category", "storage"),
            "categoryLabel": item.get("category_label", "수납/정리함"),
            "width": float(item.get("width", 10.0)),
            "depth": float(item.get("depth", 10.0)),
            "height": float(item.get("height", 5.0)),
            "dimSource": item.get("dim_source", "official_spec"),
            "price": int(item.get("price", 1000)),
            "color": item.get("color", "#93C5FD"),
            "imageUrl": item.get("image_url", ""),
            "isSoldOut": bool(item.get("is_sold_out", False)),
            "description": item.get("description", ""),
            "mallUrl": item.get("mall_url", f"https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo={item.get('item_code')}")
        })

    with open(frontend_json_path, "w", encoding="utf-8") as f:
        json.dump(converted, f, ensure_ascii=False, indent=2)

    # Remove redundant duplicate JSON in frontend/src/data if present
    if redundant_frontend_org_path.exists():
        redundant_frontend_org_path.unlink()
        print(f"Removed redundant duplicate file: {redundant_frontend_org_path}")

    print(f"Successfully synced {len(converted):,} products to {frontend_json_path}")

if __name__ == "__main__":
    sync()
