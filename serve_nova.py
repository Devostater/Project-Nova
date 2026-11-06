# Nova dev server: HTTPS on 8443 (WebXR on Quest needs HTTPS). Serves the folder this file is in.
import http.server, ssl, os, sys, socket, functools

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 8443
os.chdir(ROOT)

class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html',
        '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.json': 'application/json',
        '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '': 'application/octet-stream'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')   # always fresh while developing
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    def log_message(self, fmt, *a):
        if '--quiet' not in sys.argv:
            sys.stderr.write('  %s\n' % (fmt % a))

def lan_ips():
    ips = set()
    try:
        for i in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(i[4][0])
    except Exception: pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.255.255.255', 1)); ips.add(s.getsockname()[0]); s.close()
    except Exception: pass
    return sorted(i for i in ips if not i.startswith('127.') and not i.startswith('169.254.'))


# ---- make sure ./vendor exists (three.js, cannon-es, GLTFLoader) ----
import re, shutil, urllib.request
V = os.path.join(ROOT, 'vendor')
def have(p): return os.path.exists(os.path.join(V, p))
if not have('three.module.js'):
    # look for an existing vendor folder next to this one (e.g. your old game folders)
    parent = os.path.dirname(ROOT)
    for d in sorted(os.listdir(parent)):
        c = os.path.join(parent, d, 'vendor')
        if os.path.exists(os.path.join(c, 'three.module.js')):
            print('  Copying existing vendor folder from', c)
            shutil.copytree(c, V, dirs_exist_ok=True); break
def fetch(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print('  Downloading', url)
    urllib.request.urlretrieve(url, dest)
try:
    rev = '160'
    if have('three.module.js'):
        m = re.search(r"REVISION\s*=\s*['\"](\d+)", open(os.path.join(V, 'three.module.js'), encoding='utf8', errors='ignore').read(20000))
        if m: rev = m.group(1)
    t = 'https://cdn.jsdelivr.net/npm/three@0.%s.0' % rev
    if not have('three.module.js'): fetch(t + '/build/three.module.js', os.path.join(V, 'three.module.js'))
    if not have('cannon-es.js'): fetch('https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js', os.path.join(V, 'cannon-es.js'))
    if not have('loaders/GLTFLoader.js'): fetch(t + '/examples/jsm/loaders/GLTFLoader.js', os.path.join(V, 'loaders', 'GLTFLoader.js'))
    if not have('utils/BufferGeometryUtils.js'): fetch(t + '/examples/jsm/utils/BufferGeometryUtils.js', os.path.join(V, 'utils', 'BufferGeometryUtils.js'))
    print('  three.js revision:', rev)
except Exception as e:
    print('  Could not download vendor files:', e)

cert, key = os.path.join(ROOT, 'cert.pem'), os.path.join(ROOT, 'key.pem')
if not (os.path.exists(cert) and os.path.exists(key)):
    print('Missing cert.pem / key.pem - run start_server.bat instead.'); sys.exit(1)

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(cert, key)
srv = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), H)
srv.socket = ctx.wrap_socket(srv.socket, server_side=True)

print()
print('  NOVA server running.  Folder:', ROOT)
for need in ('vendor/three.module.js', 'vendor/cannon-es.js'):
    if not os.path.exists(os.path.join(ROOT, need)):
        print('  WARNING: missing', need, '- the game will not load until it is in this folder.')
print()
print('  On this PC:   https://localhost:%d/standalone.html' % PORT)
for ip in lan_ips():
    print('  On Quest:     https://%s:%d/standalone.html' % (ip, PORT))
print()
print('  Quest browser will warn about the certificate: Advanced > Proceed.')
print('  Quest and PC must be on the same Wi-Fi. Press Ctrl+C to stop.')
print()
try:
    srv.serve_forever()
except KeyboardInterrupt:
    print('Stopped.')
