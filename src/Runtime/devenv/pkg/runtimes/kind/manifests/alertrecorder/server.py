"""Records the webhook notifications the local Grafana sends, in place of Slack.

POST to any path stores the request: its time, path and JSON body. Each notification is
answered with 200 "ok", as a Slack incoming webhook answers.

GET /api/messages     every stored notification, oldest first, as JSON
DELETE /api/messages  forget them
GET /                 a readable preview of the Slack messages, from /api/messages

At most MAX_MESSAGES are kept, in memory only: the recorder is for local testing.
"""

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MAX_MESSAGES = 500
MAX_BODY_BYTES = 1024 * 1024
PREVIEW = Path(__file__).with_name("preview.html")

messages = []
lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY_BYTES:
            self.reply(413, "text/plain", b"too large")
            return
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw)
        except ValueError:
            body = raw.decode(errors="replace")
        record = {
            "receivedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "path": self.path,
            "body": body,
        }
        with lock:
            messages.append(record)
            del messages[:-MAX_MESSAGES]
        self.reply(200, "text/plain", b"ok")

    def do_GET(self):
        if self.path == "/api/messages":
            with lock:
                data = json.dumps(messages).encode()
            self.reply(200, "application/json", data)
        elif self.path in ("/", "/index.html"):
            self.reply(200, "text/html; charset=utf-8", PREVIEW.read_bytes())
        elif self.path == "/healthz":
            self.reply(200, "text/plain", b"ok")
        else:
            self.reply(404, "text/plain", b"not found")

    def do_DELETE(self):
        if self.path != "/api/messages":
            self.reply(404, "text/plain", b"not found")
            return
        with lock:
            messages.clear()
        self.reply(204, "text/plain", b"")

    def reply(self, status, content_type, body):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
