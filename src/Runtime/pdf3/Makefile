.PHONY: help nix-update gen cluster format lint build-local build run test logs loadtest
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

nix-update: ## Update nix flake dependencies
	nix flake update

gen: ## Generate protobuf code from proto files
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		internal/proto/contract.proto

# Detect available container runtime
ifneq ($(shell command -v podman 2>/dev/null),)
CONTAINER_CMD := podman
else ifneq ($(shell command -v docker 2>/dev/null),)
CONTAINER_CMD := docker
else
$(error Neither podman nor docker found. Please install one of them.)
endif

# Detect available sha256 command
ifneq ($(shell command -v sha256sum 2>/dev/null),)
SHA256_CMD := sha256sum
else ifneq ($(shell command -v shasum 2>/dev/null),)
SHA256_CMD := shasum -a 256
else
$(error Neither sha256sum nor shasum found. Please install coreutils or perl.)
endif

cluster: ## Create local Kind cluster (use 'make cluster stop=1' to delete)
ifdef stop
	@echo "Deleting cluster pdf3-cluster..."
	@kind delete cluster --name pdf3-cluster
else
	@if kind get clusters 2>/dev/null | grep -q '^pdf3-cluster$$'; then \
		echo "Cluster pdf3-cluster already exists, skipping creation"; \
	else \
		set -e; \
		kind create cluster --config infra/kind.config.yaml; \
		kubectl config use-context kind-pdf3-cluster; \
		helm repo add traefik https://traefik.github.io/charts; \
		helm repo add linkerd-edge https://helm.linkerd.io/edge; \
		helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/; \
		helm repo add altinn-studio https://charts.altinn.studio; \
		sleep 1; \
		helm install --version 3.13.0 metrics-server metrics-server/metrics-server \
			--set args[0]=--kubelet-insecure-tls \
			--set args[1]=--kubelet-preferred-address-types=InternalIP\\,Hostname\\,ExternalIP; \
		helm install --version 26.1.0 traefik traefik/traefik \
			-n traefik --create-namespace \
			--set ports.web.nodePort=30000 \
			--set ports.websecure.nodePort=30001 \
			--set ports.traefik.expose=true \
			--set ports.traefik.nodePort=30002 \
			--set service.type=NodePort; \
		helm install --version 2025.10.1 linkerd-crds linkerd-edge/linkerd-crds -n linkerd --create-namespace; \
		helm install --version 2025.10.1 linkerd-control-plane \
			-n linkerd \
			--set-file identityTrustAnchorsPEM=infra/certs/ca.crt \
			--set-file identity.issuer.tls.crtPEM=infra/certs/issuer.crt \
			--set-file identity.issuer.tls.keyPEM=infra/certs/issuer.key \
			linkerd-edge/linkerd-control-plane; \
		helm install -n pdf --create-namespace pdf-generator altinn-studio/pdf-generator \
			--set image.repository="browserless/chrome" \
			--set image.tag="1-puppeteer-21.4.1"; \
		kubectl create namespace pdf3; \
		kubectl apply -f infra/testserver.yaml; \
	fi
endif

format: ## Run code formatters
	golangci-lint fmt

lint: ## Run linters
	golangci-lint run

build-local: ## Build using the local go toolchain
	go build ./...

build: cluster ## Build and load Docker images (cached)
	@echo "Checking for changes in source code..."
	@current_hash=$$(find cmd internal -type f -name '*.go' 2>/dev/null | sort | xargs cat 2>/dev/null | $(SHA256_CMD) | cut -d' ' -f1); \
	dockerfile_hash=$$(cat Dockerfile.proxy Dockerfile.worker 2>/dev/null | $(SHA256_CMD) | cut -d' ' -f1); \
	combined_hash="$$current_hash-$$dockerfile_hash"; \
	if [ -f .last-build-hash ] && [ "$$(cat .last-build-hash)" = "$$combined_hash" ]; then \
		echo "No source changes detected, skipping image rebuild"; \
	else \
		echo "Source changes detected, rebuilding images..."; \
		$(CONTAINER_CMD) build -t runtime-pdf3-proxy:latest -f Dockerfile.proxy .; \
		$(CONTAINER_CMD) build -t runtime-pdf3-worker:latest -f Dockerfile.worker .; \
		kind load docker-image runtime-pdf3-proxy:latest --name pdf3-cluster; \
		kind load docker-image runtime-pdf3-worker:latest --name pdf3-cluster; \
		echo "$$combined_hash" > .last-build-hash; \
	fi

run: build ## Deploy to cluster and restart services (cached)
	@echo "Checking for changes in manifests..."
	@infra_hash=$$(find infra -type f 2>/dev/null | sort | xargs cat 2>/dev/null | $(SHA256_CMD) | cut -d' ' -f1); \
	if [ -f .last-deploy-hash ] && [ "$$(cat .last-deploy-hash)" = "$$infra_hash" ] && ! [ .last-build-hash -nt .last-deploy-hash 2>/dev/null ]; then \
		echo "No manifest or build changes detected, skipping deploy"; \
	else \
		echo "Changes detected, deploying..."; \
		kubectl kustomize infra/kustomize/local | kubectl apply -f - -n pdf3; \
		kubectl rollout restart -n pdf3 deployment/pdf3-proxy; \
		kubectl rollout restart -n pdf3 deployment/pdf3-worker; \
		echo "$$infra_hash" > .last-deploy-hash; \
	fi

test: run ## Run Go tests
	go test -v ./...

logs: ## Stream logs from pdf3 components
	stern -l component=pdf3 -n pdf3 -E linkerd-init -E linkerd-proxy --tail -1

loadtest: ## Run k6 load tests
	$(CONTAINER_CMD) run --rm -i --net=host grafana/k6:1.3.0 run - <test/load/test.ts

