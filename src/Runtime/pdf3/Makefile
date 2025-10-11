.PHONY: prereq install gen build-proxy build-worker build cluster cluster-delete start stop test-integration test

prereq:
	@go version | grep -q "go1.25" || (echo "Error: Go 1.25 is required" && exit 1)
	@command -v protoc >/dev/null 2>&1 || (echo "Error: protoc is required but not installed" && exit 1)

install: prereq
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
	yarn --immutable

install-linkerd:
	# Setting LINKERD2_VERSION sets the version to install.
	# If unset, you'll get the latest available edge version.
	export LINKERD2_VERSION=edge-25.10.1
	curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install-edge | sh

gen: prereq
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		internal/proto/contract.proto

build-proxy:
	go build -o bin/proxy cmd/proxy/main.go

build-worker:
	go build -o bin/worker cmd/worker/main.go

build: build-proxy build-worker

# Detect available container runtime
ifneq ($(shell command -v podman 2>/dev/null),)
CONTAINER_CMD := podman
else ifneq ($(shell command -v docker 2>/dev/null),)
CONTAINER_CMD := docker
else
$(error Neither podman nor docker found. Please install one of them.)
endif

cluster:
	@kind version >/dev/null 2>&1 || (echo "Error: required tool 'kind' is not installed" && exit 1)
	@kubectl -h >/dev/null 2>&1 || (echo "Error: required tool 'kubectl' is not installed" && exit 1)
	@helm version >/dev/null 2>&1 || (echo "Error: required tool 'helm' is not installed" && exit 1)

	kind delete cluster --name pdf3-cluster
	kind create cluster --config infra/kind.config.yaml
	kubectl config use-context kind-pdf3-cluster
	helm repo add traefik https://traefik.github.io/charts
	helm repo add linkerd-edge https://helm.linkerd.io/edge
	helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
	helm repo add altinn-studio https://charts.altinn.studio

	sleep 1
	helm install --version 3.13.0 metrics-server metrics-server/metrics-server \
		--set args[0]=--kubelet-insecure-tls \
		--set args[1]=--kubelet-preferred-address-types=InternalIP\\,Hostname\\,ExternalIP
	helm install --version 26.1.0 traefik traefik/traefik \
		-n traefik --create-namespace \
		--set ports.web.nodePort=30000 \
		--set ports.websecure.nodePort=30001 \
		--set ports.traefik.expose=true \
		--set ports.traefik.nodePort=30002 \
		--set service.type=NodePort
	helm install --version 2025.10.1 linkerd-crds linkerd-edge/linkerd-crds -n linkerd --create-namespace
	helm install --version 2025.10.1 linkerd-control-plane \
		-n linkerd \
		--set-file identityTrustAnchorsPEM=infra/certs/ca.crt \
		--set-file identity.issuer.tls.crtPEM=infra/certs/issuer.crt \
		--set-file identity.issuer.tls.keyPEM=infra/certs/issuer.key \
		linkerd-edge/linkerd-control-plane
	helm install -n pdf --create-namespace pdf-generator altinn-studio/pdf-generator \
		--set image.repository="browserless/chrome" \
		--set image.tag="1-puppeteer-21.4.1"
	kubectl create namespace pdf3
	kubectl apply -f infra/testserver.yaml

cluster-delete:
	kind delete cluster --name pdf3-cluster

start:
	@kubectl -h >/dev/null 2>&1 || (echo "Error: required tool 'kubectl' is not installed" && exit 1)
	@kind version >/dev/null 2>&1 || (echo "Error: required tool 'kind' is not installed" && exit 1)

	$(CONTAINER_CMD) build -t runtime-pdf3-proxy:latest -f Dockerfile.proxy .
	$(CONTAINER_CMD) build -t runtime-pdf3-worker:latest -f Dockerfile.worker .
	kind load docker-image runtime-pdf3-proxy:latest --name pdf3-cluster
	kind load docker-image runtime-pdf3-worker:latest --name pdf3-cluster
	kubectl kustomize infra/kustomize/local | kubectl apply -f - -n pdf3
	kubectl rollout restart -n pdf3 deployment/pdf3-proxy
	kubectl rollout restart -n pdf3 deployment/pdf3-worker

test:
	go test -v ./...

logs:
	@stern -v >/dev/null 2>&1 || (echo "Error: required tool 'stern' is not installed" && exit 1)
	stern -l component=pdf3 -n pdf3 -E linkerd-init -E linkerd-proxy --tail -1

# PDF generation variables
define PDF_PAYLOAD_JSON
{"url":"http://testserver.default.svc.cluster.local/app/","options":{"headerTemplate":"<div/>","footerTemplate":"<div/>","displayHeaderFooter":false,"printBackground":true,"format":"A4","margin":{"top":"0.75in","right":"0.75in","bottom":"0.75in","left":"0.75in"}},"setJavaScriptEnabled":true,"waitFor":"#readyForPrint","cookies":[{"name":"AltinnStudioRuntime","value":"blahblahblah","domain":"testserver.default.svc.cluster.local","sameSite":"Lax"}]}
endef
PDF_ENDPOINT := http://localhost:8020/pdf
PDF_OLD_HOST := pdf-generator.pdf.svc.cluster.local
PDF_NEW_HOST := pdf3-proxy.pdf3.svc.cluster.local
ARTIFACTS_DIR := artifacts

pdf-gen:
	@PDF_PAYLOAD='$(PDF_PAYLOAD_JSON)'; \
	mkdir -p $(ARTIFACTS_DIR); \
	curl -X POST \
		-H "Content-Type: application/json" \
		-H "Host: $(PDF_OLD_HOST)" \
		-d "$$PDF_PAYLOAD" \
		-o $(ARTIFACTS_DIR)/output-old.pdf \
		"$(PDF_ENDPOINT)"; \
	curl -X POST \
		-H "Content-Type: application/json" \
		-H "Host: $(PDF_NEW_HOST)" \
		-d "$$PDF_PAYLOAD" \
		-o $(ARTIFACTS_DIR)/output-new.pdf \
		"$(PDF_ENDPOINT)"

loadtest:
	$(CONTAINER_CMD) run --rm -i --net=host grafana/k6:1.3.0 run - <test/load/test.ts

loadtest-old:
	@autocannon -v >/dev/null 2>&1 || (echo "Error: required tool 'autocannon' is not installed" && exit 1)
	@PDF_PAYLOAD='$(PDF_PAYLOAD_JSON)'; \
	mkdir -p $(ARTIFACTS_DIR); \
	curl -X POST \
		-H "Content-Type: application/json" \
		-H "Host: $(PDF_OLD_HOST)" \
		-d "$$PDF_PAYLOAD" \
		-o $(ARTIFACTS_DIR)/output-old.pdf \
		"$(PDF_ENDPOINT)"; \
	autocannon --duration 60 \
		-c 3 \
		-p 1 \
		-R 4 \
		-l \
		-m POST \
		-H "Content-Type: application/json" \
		-H "Host: $(PDF_NEW_HOST)" \
		-b "$$PDF_PAYLOAD" \
		"$(PDF_ENDPOINT)"

loadtest-new:
	@autocannon -v >/dev/null 2>&1 || (echo "Error: required tool 'autocannon' is not installed" && exit 1)
	@PDF_PAYLOAD='$(PDF_PAYLOAD_JSON)'; \
	mkdir -p $(ARTIFACTS_DIR); \
	curl -X POST \
		-H "Content-Type: application/json" \
		-H "Host: $(PDF_NEW_HOST)" \
		-d "$$PDF_PAYLOAD" \
		-o $(ARTIFACTS_DIR)/output-new.pdf \
		"$(PDF_ENDPOINT)"; \
	autocannon --duration 60 \
		-c 3 \
		-p 1 \
		-R 4 \
		-l \
		-m POST \
		-H "Content-Type: application/json" \
		-H "Host: $(PDF_NEW_HOST)" \
		-b "$$PDF_PAYLOAD" \
		"$(PDF_ENDPOINT)"
