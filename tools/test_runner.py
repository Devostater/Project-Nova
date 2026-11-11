#!/usr/bin/env python3
"""
Project Nova - Unified Quest & PC Test Runner
Serves public/ on port 8011 with no-cache headers, sets up ADB reverse, and launches Quest Browser.
"""
import os
import sys
import time
import random
import shutil
import socket
import subprocess
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial

PORT = 8011
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DIR = os.path.join(REPO_ROOT, "public")

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    # Construction Bay fix requests (modules/construct.js): append-only, one JSON object per line, size-limited.
    # This is the only thing the server writes; it never runs anything it receives.
    def do_POST(self):
        if self.path != "/__nova/fix":
            self.send_response(404); self.end_headers(); return
        try:
            n = int(self.headers.get("Content-Length", "0"))
            if n <= 0 or n > 20000:
                raise ValueError("bad size")
            import json
            data = json.loads(self.rfile.read(n).decode("utf-8"))
            if not isinstance(data, dict):
                raise ValueError("not an object")
            data["received"] = time.strftime("%Y-%m-%dT%H:%M:%S")
            out_dir = os.path.join(REPO_ROOT, "requests")
            os.makedirs(out_dir, exist_ok=True)
            out = os.path.join(out_dir, "fix_requests.jsonl")
            if os.path.exists(out) and os.path.getsize(out) > 2_000_000:
                raise ValueError("queue full")
            with open(out, "a", encoding="utf-8") as f:
                f.write(json.dumps(data, ensure_ascii=False) + "\n")
            print(f"  [FIX] {data.get('cat', '?')}: {str(data.get('text', ''))[:80]}")
            self.send_response(200); self.end_headers(); self.wfile.write(b"ok")
        except Exception as e:
            self.send_response(400); self.end_headers(); self.wfile.write(str(e).encode("utf-8")[:200])

    def log_message(self, format, *args):
        # Concise logging
        sys.stdout.write(f"  [{time.strftime('%H:%M:%S')}] {args[0]} - {args[1]}\n")
        sys.stdout.flush()

def sync_html():
    sync_script = os.path.join(REPO_ROOT, "tools", "sync_html.mjs")
    node_exe = shutil.which("node")
    if node_exe and os.path.isfile(sync_script):
        try:
            res = subprocess.run([node_exe, sync_script], cwd=REPO_ROOT, capture_output=True, text=True)
            if res.returncode == 0:
                print("  [OK] HTML files synced (public/standalone.html & index.html)")
            else:
                print(f"  [WARN] HTML sync returned non-zero:\n{res.stderr.strip()}")
        except Exception as e:
            print(f"  [WARN] Failed to run sync_html.mjs: {e}")

def find_adb():
    adb = shutil.which("adb")
    if adb:
        return adb
    candidates = [
        os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"),
        os.path.expandvars(r"%ProgramFiles%\Meta Quest Developer Hub\resources\bin\adb.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\SideQuest\resources\app.asar.unpacked\build\platform-tools\adb.exe"),
        os.path.join(REPO_ROOT, "tools", "platform-tools", "adb.exe"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return None

def setup_quest(adb_path, sync_id):
    if not adb_path:
        print("  [i] ADB not found. If using USB, ensure Android SDK platform-tools is installed.")
        return False
    try:
        subprocess.run([adb_path, "start-server"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        out = subprocess.check_output([adb_path, "devices"], text=True)
        devices = [line.split()[0] for line in out.splitlines() if "\tdevice" in line]
        if not devices:
            print("  [i] No authorized Quest found over USB.")
            print("      Connect Quest by USB cable and accept 'Allow USB Debugging' inside headset.")
            return False

        device_id = devices[0]
        print(f"  [OK] Meta Quest connected: {device_id}")

        # Setup port reverse
        subprocess.run([adb_path, "-s", device_id, "reverse", f"tcp:{PORT}", f"tcp:{PORT}"], check=True)
        print(f"  [OK] USB Reverse forwarded: Quest port {PORT} -> PC port {PORT}")

        # Wake up display
        subprocess.run([adb_path, "-s", device_id, "shell", "input", "keyevent", "KEYCODE_WAKEUP"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Launch Quest Browser
        url = f"http://localhost:{PORT}/standalone.html?sync={sync_id}"
        subprocess.run([adb_path, "-s", device_id, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", url, "com.oculus.browser"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"  [OK] Launched on Quest Browser: {url}")
        return True
    except Exception as e:
        print(f"  [WARN] Quest ADB setup encountered an issue: {e}")
        return False

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def main():
    os.chdir(REPO_ROOT)
    print("=" * 68)
    print("  PROJECT NOVA - LIVE QUEST & PC TEST RUNNER")
    print("=" * 68)

    sync_html()
    adb_exe = find_adb()
    sync_id = hex(random.getrandbits(32))[2:]

    quest_connected = setup_quest(adb_exe, sync_id)
    lan_ip = get_lan_ip()

    desktop_url = f"http://localhost:{PORT}/standalone.html?sync={sync_id}"
    try:
        webbrowser.open(desktop_url)
        print(f"  [OK] Opened Desktop Browser: {desktop_url}")
    except Exception as e:
        print(f"  [WARN] Could not auto-launch browser: {e}")

    print("-" * 68)
    print(f"  Local PC URL:   http://localhost:{PORT}/standalone.html")
    if quest_connected:
        print(f"  Quest USB URL:  http://localhost:{PORT}/standalone.html?sync={sync_id}")
    print(f"  Quest Wi-Fi URL: http://{lan_ip}:{PORT}/standalone.html?sync={sync_id}")
    print("  Serving folder: public/")
    print("  Cache-Control:  no-cache, no-store (instant live updates)")
    print("=" * 68)
    print("  Keep this window OPEN while testing.")
    print("  Press Ctrl+C to stop the test server.")
    print("=" * 68 + "\n")

    handler_factory = partial(NoCacheHandler, directory=PUBLIC_DIR)
    
    # Try binding to port, retrying if in use
    server = None
    for attempt in range(5):
        try:
            server = ThreadingHTTPServer(("", PORT), handler_factory)
            break
        except OSError as e:
            if attempt < 4:
                print(f"  [!] Port {PORT} busy, waiting 1s...")
                time.sleep(1)
            else:
                print(f"  [ERROR] Could not bind to port {PORT}: {e}")
                sys.exit(1)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  [*] Stopping server. Fly safe, pilot!")
        server.shutdown()
        server.server_close()

if __name__ == "__main__":
    main()
