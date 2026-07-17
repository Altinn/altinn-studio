#!/usr/bin/env bash
set -euo pipefail

load_balancer_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
repo_root=$(cd "$load_balancer_dir/../.." && pwd)
test_dir="$load_balancer_dir/tests"
image="altinn-loadbalancer:nvt-cookie-path-smoke"
nginx_image="nginx:1.30.1@sha256:c35662d99b40137247cf7913871e97348a0524753a6925e09f7a5320b0b2f78b"
curl_image="curlimages/curl:8.14.1@sha256:9a1ed35addb45476afa911696297f8e115993df459278ed036182dd2cd22b67b"
suffix="$$"
network="nvt-cookie-path-$suffix"
mock_container="nvt-cookie-mock-$suffix"
load_balancer_container="nvt-cookie-load-balancer-$suffix"
temp_dir=$(mktemp -d "$repo_root/.nvt-cookie-path.XXXXXX")

cleanup() {
  docker rm -f "$load_balancer_container" "$mock_container" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf "$temp_dir"
}
trap cleanup EXIT

mkdir -p "$temp_dir/cert" "$temp_dir/extra-upstreams"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -subj /CN=staging.altinn.studio \
  -keyout "$temp_dir/cert/star.altinn.studio.key" \
  -out "$temp_dir/cert/star.altinn.studio.cert" >/dev/null 2>&1
sed 's/resolver 10\.250\.0\.10/resolver 127.0.0.11/' \
  "$load_balancer_dir/nginx.conf.template" > "$temp_dir/nginx.conf.template"
cp "$test_dir/nvt-extra-upstreams.conf" "$temp_dir/extra-upstreams/nvt.conf"

docker build -t "$image" "$load_balancer_dir" >/dev/null
docker network create "$network" >/dev/null
docker run -d --name "$mock_container" \
  --network "$network" \
  --network-alias mock \
  --network-alias nvt-agent-gateway.nvt.svc.cluster.local \
  -v "$test_dir/nvt-cookie-upstream.conf:/etc/nginx/nginx.conf:ro" \
  "$nginx_image" >/dev/null

docker run -d --name "$load_balancer_container" \
  --network "$network" \
  -v "$temp_dir/cert:/etc/nginx/ssl/altinn_studio:ro" \
  -v "$temp_dir/nginx.conf.template:/etc/nginx/nginx.conf.template:ro" \
  -v "$temp_dir/extra-upstreams:/etc/nginx/extra-upstreams:ro" \
  -e DESIGNER_HOST=mock:81 \
  -e DASHBOARD_HOST=mock:81 \
  -e EDITOR_HOST=mock:81 \
  -e PREVIEW_HOST=mock:81 \
  -e ADMIN_HOST=mock:81 \
  -e RESOURCEADM_HOST=mock:81 \
  -e INFO_HOST=mock:81 \
  -e SETTINGS_HOST=mock:81 \
  -e REPOS_HOST=mock:81 \
  -e SERVER_NAME=staging.altinn.studio \
  -e 'LISTEN_DIRECTIVE=443 ssl' \
  -e OTEL_ENDPOINT=127.0.0.1:4317 \
  -e OTEL_SERVICE_NAME=nvt-cookie-path-smoke \
  -e OTEL_TRACE=off \
  "$image" >/dev/null

staging_headers="$temp_dir/staging-headers"
designer_headers="$temp_dir/designer-headers"

ready=false
for _ in $(seq 1 30); do
  if docker run --rm --user 0:0 \
    --network "$network" \
    -v "$temp_dir:/output" \
    "$curl_image" \
    --fail --silent --show-error --insecure --noproxy '*' \
    --header 'Host: staging.altinn.studio' \
    --dump-header /output/staging-headers \
    --output /dev/null \
    "https://$load_balancer_container/agents/example/"; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  echo "The load-balancer smoke endpoint did not become ready" >&2
  cat "$staging_headers" >&2 || true
  docker logs "$load_balancer_container" >&2
  exit 1
fi

grep -Fqi 'X-NVT-Upstream: gateway' "$staging_headers"
grep -Fqi 'Set-Cookie: gateway=session; Path=/agents/; Secure; HttpOnly' "$staging_headers"
grep -Fqi 'Set-Cookie: agent=session; Path=/agents/example/; Secure; HttpOnly' "$staging_headers"

docker run --rm --user 0:0 \
  --network "$network" \
  -v "$temp_dir:/output" \
  "$curl_image" \
  --fail --silent --show-error --insecure --noproxy '*' \
  --header 'Host: dev.altinn.studio' \
  --dump-header /output/designer-headers \
  --output /dev/null \
  "https://$load_balancer_container/agents/example/"

grep -Fqi 'X-NVT-Upstream: designer' "$designer_headers"
grep -Fqi 'Set-Cookie: designer=session; Path=/; Secure; HttpOnly' "$designer_headers"

echo "NVT and per-agent cookie paths were preserved; Designer fallback cookie rewriting was unchanged."
