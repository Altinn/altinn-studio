"""OTLP traffic for the alert tests: an empty log export to observability-proxy every INTERVAL
seconds, as a collector sends one, until the pod is deleted. Prints each status code's count
once a minute.

An empty ExportLogsServiceRequest is a valid protobuf message, so a healthy path answers 200
and stores nothing.

Environment: TARGET (the proxy's OTLP logs URL), TOKEN (the bearer token), INTERVAL (seconds).
"""

import collections
import os
import time
import urllib.error
import urllib.request

TARGET = os.environ["TARGET"]
TOKEN = os.environ["TOKEN"]
INTERVAL = float(os.environ["INTERVAL"])

counts = collections.Counter()
reported = time.monotonic()
print(f"sending an empty log export to {TARGET} every {INTERVAL}s", flush=True)
while True:
    request = urllib.request.Request(
        TARGET,
        data=b"",
        method="POST",
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/x-protobuf"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            response.read()
            counts[response.status] += 1
    except urllib.error.HTTPError as error:
        counts[error.code] += 1
    except OSError as error:
        counts[type(error).__name__] += 1
    if time.monotonic() - reported >= 60:
        print(dict(counts), flush=True)
        counts.clear()
        reported = time.monotonic()
    time.sleep(INTERVAL)
