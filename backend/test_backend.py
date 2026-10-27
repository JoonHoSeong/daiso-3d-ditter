from fastapi.testclient import TestClient
from app.main import app
from app.scraper.parser import DimensionParser
from app.algorithms.packer import DrawerPacker
from app.models.schemas import DrawerDimension, DaisoProduct

client = TestClient(app)

def test_dimension_parser():
    # Test case 1: Standard cm format
    res1 = DimensionParser.parse_dimensions_cm("약 16 x 24 x 4.5 cm 크기입니다.")
    assert res1 == (16.0, 24.0, 4.5)

    # Test case 2: mm format conversion
    res2 = DimensionParser.parse_dimensions_cm("사이즈: 80*160*45mm")
    assert res2 == (8.0, 16.0, 4.5)

    # Test case 3: Labeled format
    res3 = DimensionParser.parse_dimensions_cm("가로: 13.5cm / 세로: 27cm / 높이: 8.5cm")
    assert res3 == (13.5, 27.0, 8.5)

def test_drawer_packer():
    drawer = DrawerDimension(width=32.0, depth=40.0, height=7.0)
    prods = [
        DaisoProduct(
            id="tray-slim",
            item_code="1032841",
            name="슬림 트레이",
            category="tray",
            category_label="트레이",
            width=8.0,
            depth=16.0,
            height=4.5,
            price=1000,
            color="#E0F2FE"
        )
    ]
    items, metrics = DrawerPacker.pack(drawer, prods)
    assert len(items) > 0
    assert metrics.floor_utilization > 0
    assert metrics.total_price == len(items) * 1000

def test_api_endpoints():
    # 1. Health
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

    # 2. Products
    r = client.get("/api/products")
    assert r.status_code == 200
    products = r.json()
    assert len(products) > 0
    assert "item_code" in products[0]

    # 3. Fit calculation
    fit_payload = {
        "drawer": {"width": 32.0, "depth": 40.0, "height": 7.0},
        "strategy": "balanced"
    }
    r = client.post("/api/fit", json=fit_payload)
    assert r.status_code == 200
    fit_data = r.json()
    assert "items" in fit_data
    assert "metrics" in fit_data
    assert fit_data["metrics"]["floor_utilization"] >= 80

if __name__ == "__main__":
    print("Running tests...")
    test_dimension_parser()
    test_drawer_packer()
    test_api_endpoints()
    print("All backend tests passed successfully!")
