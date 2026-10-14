"""A remote-write destination for the queue-drops alert test: it refuses every write with
HTTP 503 until told to accept, then answers 204 and discards what it receives.

POST /mode?status=204   switch to accepting (or back, with 503)
GET  /status            the current status and how much was received
POST anything else      a write, answered with the current status
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

state = {"status": 503, "requests": 0, "bytes": 0}
lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        url = urlparse(self.path)
        if url.path == "/mode":
            status = int(parse_qs(url.query).get("status", ["503"])[0])
            with lock:
                state["status"] = status
            self.reply(200, json.dumps(state).encode())
            return
        remaining = int(self.headers.get("Content-Length") or 0)
        received = 0
        while remaining > 0:
            chunk = self.rfile.read(min(remaining, 1 << 20))
            if not chunk:
                break
            remaining -= len(chunk)
            received += len(chunk)
        with lock:
            state["requests"] += 1
            state["bytes"] += received
            status = state["status"]
        self.send_response(status)
        self.end_headers()

    def do_GET(self):
        with lock:
            body = json.dumps(state).encode()
        self.reply(200, body)

    def reply(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
