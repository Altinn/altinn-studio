"""Records the webhook notifications the local Grafana sends, in place of Slack.

POST to any path stores the request: its time, path and JSON body, and answers 200 "ok", as a
Slack incoming webhook does. The path names the Secret key the contact point read its URL from.

GET /api/messages     every stored notification, oldest first, as JSON
DELETE /api/messages  forget them
GET /                 the notifications as readable Slack messages, newest first, with each raw
                      payload

At most MAX_MESSAGES are kept, in memory only: the recorder is for local testing.
"""

import html
import json
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_MESSAGES = 500
MAX_BODY_BYTES = 1024 * 1024
# Slack's link markup, <url|label> or <url>.
SLACK_LINK = re.compile(r"&lt;(https?://[^|]*?)(?:\|(.*?))?&gt;")
PAGE = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Local alert notifications</title><style>
body {{ font: 15px/1.45 system-ui, sans-serif; max-width: 920px; margin: 24px auto; padding: 0 16px; }}
section {{ border-top: 1px solid #ccc; padding: 10px 0; }}
.meta, summary {{ color: #666; font-size: 13px; }}
.attachment {{ border-left: 4px solid #888; padding-left: 12px; margin: 6px 0; white-space: pre-wrap; }}
pre {{ background: #f4f4f4; padding: 8px; overflow-x: auto; font-size: 12px; }}
</style></head><body><h1>Local alert notifications</h1>
<p>What the local Grafana sent to Slack webhooks, newest first. A preview, not the Slack app.</p>
{messages}</body></html>
"""

messages = []
lock = threading.Lock()


def slack_text(text):
    return SLACK_LINK.sub(lambda m: f'<a href="{m[1]}">{m[2] or m[1]}</a>', html.escape(text or ""))


def render(message):
    body = message["body"] if isinstance(message["body"], dict) else {}
    parts = [f'<section><div class="meta">{message["receivedAt"]} to {html.escape(message["path"])}</div>']
    for attachment in body.get("attachments", []):
        title = html.escape(attachment.get("title", ""))
        if attachment.get("title_link"):
            title = f'<a href="{html.escape(attachment["title_link"])}">{title}</a>'
        color = html.escape(attachment.get("color", "#888"))
        parts.append(
            f'<div class="attachment" style="border-color: {color}"><strong>{title}</strong>\n'
            f'{slack_text(attachment.get("text"))}</div>'
        )
    raw = html.escape(json.dumps(message["body"], indent=2, ensure_ascii=False))
    parts.append(f"<details><summary>Raw payload</summary><pre>{raw}</pre></details></section>")
    return "".join(parts)


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
        record = {"receivedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "path": self.path, "body": body}
        with lock:
            messages.append(record)
            del messages[:-MAX_MESSAGES]
        self.reply(200, "text/plain", b"ok")

    def do_GET(self):
        with lock:
            current = list(messages)
        if self.path == "/api/messages":
            self.reply(200, "application/json", json.dumps(current).encode())
        elif self.path == "/":
            rendered = "".join(render(message) for message in reversed(current)) or "<p>No notifications yet.</p>"
            self.reply(200, "text/html; charset=utf-8", PAGE.format(messages=rendered).encode())
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
