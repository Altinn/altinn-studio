#!/usr/bin/env python3
"""Fixed-arrival exploration through the actual Go proxy; no client retries.

Uses an already-running Kind jumpbox and externally prepared workers; serves
its own public 500 ms fixture at 0.0.0.0:9342/light.
Worker count, image, CPU allocation and proxy policy remain caller-controlled.
"""

import argparse
import concurrent.futures
import datetime
import http.server
import json
import pathlib
import statistics
import threading
import time
import urllib.error
import urllib.parse
import urllib.request


class FixtureHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if urllib.parse.urlsplit(self.path).path != "/light":
            self.send_error(404)
            return
        body = b'<!doctype html><html><head><meta charset="utf-8"></head><body><h1>Light PDF fixture</h1><p>No backend, CSS or external resources.</p><script>setTimeout(()=>{const ready=document.createElement("div");ready.id="readyForPrint";document.body.appendChild(ready)},500)</script></body></html>'
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


def distribution(values):
    if not values:
        return {"n": 0}
    ordered = sorted(values)
    def percentile(fraction):
        position = (len(ordered) - 1) * fraction
        low = int(position)
        high = min(low + 1, len(ordered) - 1)
        return ordered[low] + (ordered[high] - ordered[low]) * (position - low)
    return {"n": len(values), "mean_ms": statistics.mean(values), "median_ms": statistics.median(values), "p95_ms": percentile(.95), "p99_ms": percentile(.99), "min_ms": ordered[0], "max_ms": ordered[-1]}


def request(args, rate, index, scheduled):
    started = time.perf_counter()
    parsed = urllib.parse.urlsplit(args.url)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
    query.append(("benchmark_request", f"{args.label}-{rate}-{index}"))
    url = urllib.parse.urlunsplit(parsed._replace(query=urllib.parse.urlencode(query)))
    payload = {"url": url, "cookies": [], "waitFor": "#readyForPrint", "setJavaScriptEnabled": True, "options": {"format": "A4", "margin": {"top": "0.75in", "right": "0.75in", "bottom": "0.75in", "left": "0.75in"}, "printBackground": True, "displayHeaderFooter": False}}
    row = {"label": args.label, "arrival_rate_rps": rate, "request_index": index, "render_url": url, "scheduled_at_monotonic": scheduled, "started_at_monotonic": started, "scheduler_delay_ms": (started - scheduled) * 1000}
    http_request = urllib.request.Request(args.endpoint, json.dumps(payload).encode(), {"Content-Type": "application/json", "Host": args.host})
    try:
        with urllib.request.urlopen(http_request, timeout=args.timeout) as response:
            status, body = response.status, response.read()
            row["content_type"] = response.headers.get("Content-Type")
    except urllib.error.HTTPError as error:
        status, body = error.code, error.read()
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        status, body = 0, str(error).encode()
    finished = time.perf_counter()
    row.update({"status": status, "pdf_valid": status == 200 and body.startswith(b"%PDF"), "pdf_bytes": len(body) if status == 200 else None, "error_body": body[:2000].decode(errors="replace") if status != 200 or not body.startswith(b"%PDF") else None, "client_latency_ms": (finished - started) * 1000, "arrival_to_completion_ms": (finished - scheduled) * 1000, "finished_at_monotonic": finished})
    return row


def summarize(rows):
    successful = [row for row in rows if row["pdf_valid"]]
    return {"requests": len(rows), "valid_pdfs": len(successful), "failures": len(rows) - len(successful), "status_counts": {str(status): sum(row["status"] == status for row in rows) for status in sorted({row["status"] for row in rows})}, "client_latency_all": distribution([row["client_latency_ms"] for row in rows]), "client_latency_success": distribution([row["client_latency_ms"] for row in successful]), "arrival_to_completion": distribution([row["arrival_to_completion_ms"] for row in rows]), "scheduler_delay": distribution([row["scheduler_delay_ms"] for row in rows])}


def save(result, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    temporary.write_text(json.dumps(result, indent=2))
    temporary.replace(destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="Override full light fixture URL reachable from Kind workers")
    parser.add_argument("--container-origin", default="http://10.88.0.1:9342", help="Worker-visible origin of this script's fixture server")
    parser.add_argument("--port", type=int, default=9342, help="Fixture HTTP server port, binds to 0.0.0.0")
    parser.add_argument("--rates", nargs="+", type=float, default=[2, 3, 3.5])
    parser.add_argument("--samples", type=int, default=80)
    parser.add_argument("--label", required=True, choices=["base", "optimized"])
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--endpoint", default="http://127.0.0.1:8020/pdf")
    parser.add_argument("--host", default="pdf3-proxy.runtime-pdf3.svc.cluster.local")
    parser.add_argument("--timeout", type=float, default=40)
    parser.add_argument("--workers", type=int, default=80, help="Client concurrency, not worker pod count")
    args = parser.parse_args()
    if args.samples <= 0 or args.workers <= 0 or args.timeout <= 0 or any(rate <= 0 for rate in args.rates):
        parser.error("Samples, client workers, timeout and rates must be positive")
    args.url = args.url or args.container_origin.rstrip("/") + "/light"
    server = http.server.ThreadingHTTPServer(("0.0.0.0", args.port), FixtureHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    settings = vars(args) | {"output": str(args.output)}
    result = {"started_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "settings": settings, "notes": ["Fixed arrival scheduler submits requests independently of earlier response completion.", "No client retries; retry behavior belongs to the actual Go proxy.", "Samples are numbered per arrival-rate run; raw schedule and start timestamps record scheduling drift.", "p99 uses linear interpolation and 80 samples provide a coarse tail estimate.", "Worker image/count/CPU limits and proxy queue/retry settings must be recorded by the caller."], "rows": [], "summaries": {}}
    try:
        for rate in args.rates:
            scheduled_start = time.perf_counter() + .1
            futures = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
                for index in range(args.samples):
                    scheduled = scheduled_start + index / rate
                    time.sleep(max(0, scheduled - time.perf_counter()))
                    futures.append(executor.submit(request, args, rate, index, scheduled))
                rows = [future.result() for future in futures]
            result["rows"].extend(rows)
            key = f"{args.label}/{rate}rps"
            result["summaries"][key] = summarize(rows)
            print(json.dumps({"key": key, **result["summaries"][key]}), flush=True)
            save(result, args.output)
    finally:
        server.shutdown()
        server.server_close()
        result["finished_at_utc"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        save(result, args.output)
    print(f"Saved {args.output}", flush=True)


if __name__ == "__main__":
    main()
