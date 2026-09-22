import urllib.request

url = 'https://www.mef.gob.pe/es/aplicativos-invierte-pe?id=5455'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=10) as res:
        print(res.read().decode('utf-8', errors='ignore'))
except Exception as e:
    print('err:', e)
