"""Dummy telemetry for the queue-drops alert test: series with random, incompressible label
values, written to one vmagent replica until its queue for the refusing destination drops a
block, or a byte cap is reached.

The load is paced at RATE bytes a second, so the agent buffers it within its memory limit.

Environment: TARGET (the replica's base URL), QUEUE (a path fragment naming the queue, such as
"/2_"), METRIC (the dummy metric's name), MAX_BYTES (the cap), RATE (bytes a second).
"""

import base64
import os
import re
import sys
import time
import urllib.request

TARGET = os.environ["TARGET"].rstrip("/")
QUEUE = os.environ["QUEUE"]
METRIC = os.environ["METRIC"]
MAX_BYTES = int(os.environ["MAX_BYTES"])
RATE = int(os.environ["RATE"])
LINES = 100
MAX_FAILURES = 10
DROPPED = re.compile(r'^vm_persistentqueue_blocks_dropped_total\{([^}]*)\} (\S+)$', re.M)


def dropped():
    with urllib.request.urlopen(TARGET + "/metrics", timeout=10) as response:
        text = response.read().decode()
    return sum(float(value) for labels, value in DROPPED.findall(text) if QUEUE in labels)


def send(payload):
    request = urllib.request.Request(TARGET + "/api/v1/import/prometheus", data=payload, method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        response.read()


start = dropped()
sent = 0
failures = 0
began = time.monotonic()
print(f"queue {QUEUE}: {start:.0f} blocks dropped before the load; sending {RATE >> 20} MiB/s", flush=True)
while sent < MAX_BYTES:
    # 3 KiB of random bytes per sample, base64 encoded, so the queue cannot compress them.
    payload = "".join(
        f'{METRIC}{{noise="{base64.b64encode(os.urandom(3072)).decode()}"}} 1\n' for _ in range(LINES)
    ).encode()
    try:
        send(payload)
        failures = 0
    except OSError as error:
        failures += 1
        print(f"write failed ({failures}/{MAX_FAILURES}): {error}", flush=True)
        if failures >= MAX_FAILURES:
            sys.exit(2)
        time.sleep(2)
        continue
    sent += len(payload)
    ahead = sent / RATE - (time.monotonic() - began)
    if ahead > 0:
        time.sleep(ahead)
    if sent // (32 << 20) != (sent - len(payload)) // (32 << 20):
        now = dropped()
        print(f"{time.monotonic() - began:6.1f}s sent {sent >> 20} MiB, dropped {now:.0f}", flush=True)
        if now > start:
            print(f"queue {QUEUE} dropped {now - start:.0f} blocks; stopping the load", flush=True)
            sys.exit(0)
print(f"reached the {MAX_BYTES >> 20} MiB cap without a drop", flush=True)
sys.exit(1)
