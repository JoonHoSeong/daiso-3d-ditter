import httpx
import json

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json"
}

pd_no = "1066460" # 일본제 길이 조정 수납 트레이 33 cm 넓은형
endpoints = [
    "https://www.daisomall.co.kr/pd/pdr/pdDtl/selPdDtlInfo",
    "https://www.daisomall.co.kr/pd/pdr/pdDtl/selPdDtlDesc",
    "https://www.daisomall.co.kr/pd/pdr/pdDtl/selPdDtlNtfc"
]

with httpx.Client(headers=headers, timeout=10.0) as client:
    for ep in endpoints:
        print("=== Calling", ep, "===")
        # Try GET and POST
        try:
            r_get = client.get(ep, params={"pdNo": pd_no})
            print("GET status:", r_get.status_code, "len:", len(r_get.text))
            if r_get.status_code == 200:
                print("GET snippet:", r_get.text[:300])
        except Exception as e:
            print("GET err:", e)
        try:
            r_post = client.post(ep, json={"pdNo": pd_no})
            print("POST status:", r_post.status_code, "len:", len(r_post.text))
            if r_post.status_code == 200:
                print("POST snippet:", r_post.text[:300])
                try:
                    data = r_post.json()
                    # print top keys
                    if isinstance(data, dict):
                        print("Keys:", list(data.keys()))
                except:
                    pass
        except Exception as e:
            print("POST err:", e)
