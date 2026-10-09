#!/usr/bin/env python3
"""Reproducible real-worker exploration; stdlib only, synthetic public fixtures.

Default: first request per fixture/variant reported separately, then 40 paired
requests in alternating order. Optional fixed-arrival runs emulate proxy retries.
The bundle fixtures exercise compilation/load, not a real app with backend data.
Requires existing baseline/optimized containers; never starts/restarts them.
"""

import argparse
import concurrent.futures
import datetime
import hashlib
import http.server
import json
import pathlib
import re
import shlex
import statistics
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request


FIXTURES = ("minimal", "local_bundle", "public_bundle", "public_version4.21.3", "query_bundle", "light")
PUBLIC = "https://altinncdn.no/toolkits/altinn-app-frontend/{version}/altinn-app-frontend.js"


def duration_ms(value):
    """Parse Go duration strings, including compounds such as 1m2.3s."""
    factors = {"ns": 0.000001, "us": 0.001, "µs": 0.001, "μs": 0.001, "ms": 1, "s": 1000, "m": 60000, "h": 3600000}
    return sum(float(number) * factors[unit] for number, unit in re.findall(r"([\d.]+)(ns|us|µs|μs|ms|s|m|h)", value))


def log_fields(line):
    try:
        return dict(part.split("=", 1) for part in shlex.split(line) if "=" in part)
    except ValueError:
        return {}


def summary(values):
    if not values:
        return {"n": 0}
    ordered = sorted(values)
    def percentile(p):
        index = (len(ordered) - 1) * p
        lo = int(index)
        hi = min(lo + 1, len(ordered) - 1)
        return ordered[lo] + (ordered[hi] - ordered[lo]) * (index - lo)
    return {"n": len(values), "mean_ms": statistics.mean(values), "median_ms": statistics.median(values), "p95_ms": percentile(.95), "p99_ms": percentile(.99), "min_ms": ordered[0], "max_ms": ordered[-1]}


class WorkerLogs:
    def __init__(self, name, optimized):
        self.name = name
        self.optimized = optimized
        self.condition = threading.Condition()
        self.lines = []
        self.busy = []
        self.prepared = []
        self.process = subprocess.Popen(["docker", "logs", "--follow", name], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        self.thread = threading.Thread(target=self.read, daemon=True)
        self.thread.start()

    def read(self):
        for line in self.process.stdout:
            fields = log_fields(line)
            with self.condition:
                self.lines.append(line.rstrip())
                expected = "Worker ready for next request" if self.optimized else "Completed PDF request"
                if fields.get("msg") == expected:
                    field = "busy_duration" if self.optimized else "duration"
                    self.busy.append({"worker_busy_ms": duration_ms(fields.get(field, "")), "worker_log": line.rstrip(), "url": fields.get("url"), "received_at_monotonic": time.perf_counter()})
                if fields.get("msg") == "Prepared frontend compilation cache":
                    self.prepared.append({"url": fields.get("url"), "bytes": int(fields.get("bytes", 0)), "worker_log": line.rstrip()})
                self.condition.notify_all()

    def busy_count(self):
        with self.condition:
            return len(self.busy)

    def wait_busy(self, count, timeout=35):
        deadline = time.monotonic() + timeout
        with self.condition:
            while len(self.busy) <= count:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return {"worker_busy_ms": None, "worker_log_error": "No completion log before timeout"}
                self.condition.wait(remaining)
            return dict(self.busy[count])

    def wait_prepared(self, url, timeout):
        deadline = time.monotonic() + timeout
        with self.condition:
            while not any(item["url"] == url for item in self.prepared):
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return False
                self.condition.wait(remaining)
            return True

    def stop(self):
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5)
        self.thread.join(timeout=2)


def make_handler(bundle):
    class Handler(http.server.BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def do_GET(self):
            path = urllib.parse.urlsplit(self.path).path
            if path == "/bundle.js":
                body, mime = bundle, "application/javascript"
            elif path == "/fixture":
                fixture = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get("fixture", ["minimal"])[0]
                scripts = {
                    "local_bundle": "/bundle.js",
                    "public_bundle": PUBLIC.format(version="4.21.4"),
                    "public_version4.21.3": PUBLIC.format(version="4.21.3"),
                    "query_bundle": PUBLIC.format(version="4.21.4") + "?benchmark=ineligible",
                }
                script = f'<script src="{scripts[fixture]}"></script>' if fixture in scripts else ""
                if fixture == "light":
                    script = '<script>setTimeout(()=>{const ready=document.createElement("div");ready.id="readyForPrint";document.body.appendChild(ready)},500)</script>'
                # No #root: load the real bundle without mounting the app/router or
                # initiating backend calls. This isolates load/compile/render costs.
                body = ('<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Public PDF compilation fixture</h1><p>Fixed synthetic content; no authenticated data.</p>' + script + '</body></html>').encode()
                mime = "text/html; charset=utf-8"
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=31536000" if path == "/bundle.js" else "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_):
            pass
    return Handler


def request(variant, fixture, identifier, args, retry=False, scheduled=None):
    origin = args.container_origin or f"http://host.containers.internal:{args.port}"
    url = origin + "/fixture?" + urllib.parse.urlencode({"fixture": fixture, "request": identifier})
    payload = {"url": url, "cookies": [], "waitFor": "#readyForPrint" if fixture == "light" else None, "setJavaScriptEnabled": True, "options": {"format": "A4", "margin": dict.fromkeys(("top", "right", "bottom", "left"), "0.75in"), "printBackground": True, "displayHeaderFooter": False}}
    data = json.dumps(payload).encode()
    started = time.perf_counter()
    row = {"variant": variant["label"], "fixture": fixture, "request_id": identifier, "url": url, "started_at_monotonic": started, "scheduled_at_monotonic": scheduled, "scheduler_delay_ms": (started - scheduled) * 1000 if scheduled is not None else None, "attempts": []}
    for attempt in range(1, 41 if retry else 2):
        attempt_start = time.perf_counter()
        http_request = urllib.request.Request(variant["endpoint"] + "/generate", data, {"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(http_request, timeout=40) as response:
                status, body = response.status, response.read()
        except urllib.error.HTTPError as error:
            status, body = error.code, error.read()
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            status, body = 0, str(error).encode()
        row["attempts"].append({"status": status, "latency_ms": (time.perf_counter() - attempt_start) * 1000})
        if retry and status == 429 and attempt < 40:
            time.sleep(.250)
            continue
        row.update({"status": status, "pdf_valid": status == 200 and body.startswith(b"%PDF"), "pdf_bytes": len(body) if status == 200 else None, "error_body": body[:1200].decode(errors="replace") if status != 200 else None, "client_latency_ms": (time.perf_counter() - started) * 1000, "finished_at_monotonic": time.perf_counter()})
        break
    return row


def memory_snapshot(container):
    command = 'for path in /proc/[0-9]*/status; do cat "$path" 2>/dev/null; printf "\\n---PROCESS---\\n"; done'
    result = subprocess.run(["docker", "exec", container, "sh", "-c", command], text=True, capture_output=True, timeout=20)
    processes = []
    for block in result.stdout.split("---PROCESS---"):
        fields = dict(line.split(":", 1) for line in block.splitlines() if ":" in line)
        if "VmRSS" in fields and "Pid" in fields:
            processes.append({"pid": int(fields["Pid"].strip()), "name": fields.get("Name", "").strip(), "rss_kib": int(fields["VmRSS"].split()[0])})
    return {"container": container, "rss_sum_kib": sum(item["rss_kib"] for item in processes), "process_count": len(processes), "processes": processes, "returncode": result.returncode, "error": result.stderr if result.returncode else None, "caveat": "Summed process RSS double-counts shared pages; not container working set or PSS."}


def summarize_rows(rows):
    return {"requests": len(rows), "valid_pdfs": sum(row["pdf_valid"] for row in rows), "failures": sum(not row["pdf_valid"] for row in rows), "status_counts": {str(code): sum(row["status"] == code for row in rows) for code in sorted({row["status"] for row in rows})}, "retry_429s": sum(sum(attempt["status"] == 429 for attempt in row["attempts"]) for row in rows), "client_latency": summary([row["client_latency_ms"] for row in rows]), "worker_busy": summary([row["worker_busy_ms"] for row in rows if row.get("worker_busy_ms") is not None])}


def save(result, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(result, indent=2))
    temporary.replace(path)


def wait_ready(variant):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(variant["endpoint"] + "/health/ready", timeout=2) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, OSError):
            pass
        time.sleep(.1)
    raise RuntimeError(f"Worker not ready: {variant['endpoint']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=pathlib.Path, default=pathlib.Path(__file__).with_name("worker-benchmark-results.json"))
    parser.add_argument("--bundle", type=pathlib.Path, required=True, help="Downloaded real frontend JS for the local bundle fixture")
    parser.add_argument("--port", type=int, default=9341)
    parser.add_argument("--container-origin", help="Fixture origin reachable from containers")
    parser.add_argument("--base", default="http://127.0.0.1:9361")
    parser.add_argument("--optimized", default="http://127.0.0.1:9362")
    parser.add_argument("--base-container", default="pdf3-bench-base")
    parser.add_argument("--optimized-container", default="pdf3-bench-optimized")
    parser.add_argument("--samples", type=int, default=40)
    parser.add_argument("--fixtures", nargs="+", choices=FIXTURES, default=list(FIXTURES))
    parser.add_argument("--wait-prepared", type=float, default=0, metavar="SECONDS", help="After each first public/version render, wait for optimized compilation seed")
    parser.add_argument("--load", action="store_true", help="Also run fixed-arrival light fixture with proxy-like 250ms retries")
    parser.add_argument("--load-only", action="store_true")
    parser.add_argument("--rates", nargs="+", type=float, default=[1, 1.5, 1.75])
    parser.add_argument("--load-samples", type=int, default=60)
    args = parser.parse_args()
    if args.samples <= 0 or args.load_samples <= 0 or any(rate <= 0 for rate in args.rates):
        parser.error("Samples and rates must be positive")
    bundle = args.bundle.read_bytes()
    server = http.server.ThreadingHTTPServer(("0.0.0.0", args.port), make_handler(bundle))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    variants = [{"label": "base", "endpoint": args.base.rstrip("/"), "container": args.base_container}, {"label": "optimized", "endpoint": args.optimized.rstrip("/"), "container": args.optimized_container}]
    result = {"started_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "settings": vars(args) | {"output": str(args.output), "bundle": str(args.bundle)}, "notes": ["Bundle fixtures have no #root/backend: compilation/load exploration, not a complete real app.", "First fixture render is separated; only an externally restarted worker is globally cold.", "Alternating warm runs await worker completion, including cleanup/preparation, before the next request.", "Baseline Completed PDF request duration and optimized Worker ready for next request busy_duration have different log sources; retained raw logs allow audit.", "Load successes correlate to ordered completion logs by URL when present, otherwise response-completion order. Multiple concurrent accepted requests could make optimized pairing approximate.", "Single host with external CDN and intercepted TLS; numbers are indicative."], "bundle_bytes": len(bundle), "bundle_sha256": hashlib.sha256(bundle).hexdigest(), "rows": [], "summaries": {}, "memory": [], "cache_logs": {}}
    logs = {}
    try:
        for variant in variants:
            wait_ready(variant)
            logs[variant["label"]] = WorkerLogs(variant["container"], variant["label"] == "optimized")
        time.sleep(.1)  # Drain already-written startup logs before sequence counters.
        result["memory"].append({"phase": "before", "variants": {v["label"]: memory_snapshot(v["container"]) for v in variants}})
        if not args.load_only:
            for fixture_index, fixture in enumerate(args.fixtures):
                fixture_rows = []
                for variant in variants:
                    count = logs[variant["label"]].busy_count()
                    row = request(variant, fixture, f"first-{fixture}", args)
                    row["phase"] = "first"
                    if row["status"] == 200:
                        row.update(logs[variant["label"]].wait_busy(count))
                    if variant["label"] == "optimized" and args.wait_prepared and fixture in ("public_bundle", "public_version4.21.3"):
                        version = "4.21.3" if fixture == "public_version4.21.3" else "4.21.4"
                        row["compilation_seed_ready"] = logs["optimized"].wait_prepared(PUBLIC.format(version=version), args.wait_prepared)
                    result["rows"].append(row)
                    print(json.dumps({"phase": "first", "fixture": fixture, "variant": variant["label"], "client_ms": row["client_latency_ms"], "busy_ms": row.get("worker_busy_ms"), "status": row["status"]}), flush=True)
                for iteration in range(args.samples):
                    order = variants if (iteration + fixture_index) % 2 == 0 else list(reversed(variants))
                    for variant in order:
                        count = logs[variant["label"]].busy_count()
                        row = request(variant, fixture, f"warm-{fixture}-{iteration}-{variant['label']}", args)
                        row.update({"phase": "warm", "iteration": iteration})
                        if row["status"] == 200:
                            row.update(logs[variant["label"]].wait_busy(count))
                        result["rows"].append(row)
                        fixture_rows.append(row)
                for variant in variants:
                    key = f"warm/{fixture}/{variant['label']}"
                    result["summaries"][key] = summarize_rows([r for r in fixture_rows if r["variant"] == variant["label"]])
                    print(json.dumps({"key": key, **result["summaries"][key]}), flush=True)
                result["memory"].append({"phase": fixture, "variants": {v["label"]: memory_snapshot(v["container"]) for v in variants}})
                save(result, args.output)
        if args.load or args.load_only:
            for rate_index, rate in enumerate(args.rates):
                for variant in variants if rate_index % 2 == 0 else list(reversed(variants)):
                    before = logs[variant["label"]].busy_count()
                    scheduled_start = time.perf_counter() + .1
                    futures = []
                    with concurrent.futures.ThreadPoolExecutor(max_workers=max(64, args.load_samples)) as executor:
                        for index in range(args.load_samples):
                            scheduled = scheduled_start + index / rate
                            time.sleep(max(0, scheduled - time.perf_counter()))
                            futures.append(executor.submit(request, variant, "light", f"load-{rate}-{variant['label']}-{index}", args, True, scheduled))
                        rows = [future.result() for future in futures]
                    successes = sorted((row for row in rows if row["pdf_valid"]), key=lambda row: row["finished_at_monotonic"])
                    for index, row in enumerate(successes):
                        row.update(logs[variant["label"]].wait_busy(before + index))
                    for row in rows:
                        row.update({"phase": "fixed_arrival", "arrival_rate_rps": rate})
                    result["rows"].extend(rows)
                    key = f"load/light/{rate}/{variant['label']}"
                    result["summaries"][key] = summarize_rows(rows)
                    print(json.dumps({"key": key, **result["summaries"][key]}), flush=True)
                    save(result, args.output)
        result["memory"].append({"phase": "after", "variants": {v["label"]: memory_snapshot(v["container"]) for v in variants}})
    finally:
        for label, reader in logs.items():
            reader.stop()
            result["cache_logs"][label] = {"prepared_compilation": reader.prepared, "matching_logs": [line for line in reader.lines if any(term in line.lower() for term in ("cache", "chrome version", "browser version"))]}
            args.output.with_name(args.output.stem + f"-{label}.log").write_text("\n".join(reader.lines) + "\n")
        server.shutdown()
        server.server_close()
        result["finished_at_utc"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        save(result, args.output)
    print(f"Saved {args.output}", flush=True)


if __name__ == "__main__":
    main()
