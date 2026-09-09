#!/usr/bin/env python3

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class CorsRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


if len(sys.argv) != 2:
    raise SystemExit("usage: serve-frontend.py DIST_DIRECTORY")

handler = partial(CorsRequestHandler, directory=sys.argv[1])
ThreadingHTTPServer(("0.0.0.0", 8080), handler).serve_forever()
