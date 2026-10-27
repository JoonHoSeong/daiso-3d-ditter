import httpx
import re

url = "https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo=1066460"
resp = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"})
scripts = re.findall(r'src="(https://cdn\.daisomall\.co\.kr/apps/f/a629ae4834/[^"]+?\.js)"', resp.text)

print(f"Checking {len(scripts)} scripts...")
for s in scripts:
    try:
        t = httpx.get(s, timeout=5.0).text
        matches = [m for m in re.findall(r'["\'](/[a-zA-Z0-9_\-/]+)["\']', t) if any(x in m for x in ['/pd/', '/ds/', '/goods', '/product', '/item'])]
        if matches:
            print(s.split("/")[-1], "->", set(matches))
    except Exception as e:
        pass
