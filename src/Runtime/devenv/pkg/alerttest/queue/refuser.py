"""A remote-write destination for the queue alert tests: it answers every write with HTTP 503,
until POST /mode?status=204 makes it accept and discard them.
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

status = 503


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        global status
        url = urlparse(self.path)
        remaining = int(self.headers.get("Content-Length") or 0)
        while remaining > 0:
            chunk = self.rfile.read(min(remaining, 1 << 20))
            if not chunk:
                break
            remaining -= len(chunk)
        if url.path == "/mode":
            status = int(parse_qs(url.query).get("status", ["503"])[0])
            self.send_response(200)
        else:
            self.send_response(status)
        self.end_headers()

    def log_message(self, *args):
        pass


ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
