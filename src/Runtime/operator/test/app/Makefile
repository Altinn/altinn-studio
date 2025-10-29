CHARTS_BRANCH ?= feature/maskinporten-integration

.PHONY: download-charts
download-charts: ## Download altinn-studio-charts repository
	@if [ ! -d "altinn-studio-charts" ]; then \
		echo "Downloading altinn-studio-charts..."; \
		git clone --depth 1 --branch $(CHARTS_BRANCH) https://github.com/Altinn/altinn-studio-charts.git ./altinn-studio-charts; \
	else \
		echo "Updating altinn-studio-charts..."; \
		cd altinn-studio-charts && git pull origin $(CHARTS_BRANCH); \
	fi

.PHONY: create
create: ## Initialize the test-application infra.
	kind delete cluster --name operator
	kind create cluster --config ./kind.config.yaml
	kubectl config use-context kind-operator
	helm repo add traefik https://traefik.github.io/charts
	sleep 1
	helm upgrade --install --force --version 26.1.0 traefik traefik/traefik --set ports.web.nodePort=30000 --set ports.websecure.nodePort=30001 --set ports.traefik.expose=true --set ports.traefik.nodePort=30002 --set service.type=NodePort
	cd ../../ && make install

.PHONY: build
build: ## Build the operator-testapp image.
	kubectl config use-context kind-operator
	docker build -t operator-testapp:latest . && helm dep up ./deployment/
	kind load docker-image operator-testapp:latest --name operator

# .PHONY: deps
# deps: ## Install dependencies for the operator
# 	cd ../../
# 	docker build -t operator-maskinporten-fakes:latest .
# 	kind load docker-image operator-maskinporten-fakes:latest --name operator
# 	kubectl run hazelcast --image=operator-maskinporten-fakes:latest --port=5701

.PHONY: deploy
deploy: build ## Deploy test-application to current kube context.
	kubectl config use-context kind-operator
	helm upgrade --install --force operator-testapp ./deployment --set deployment.image.repository=operator-testapp

.PHONY: client
client: ## Deploy a MaskinportenClient CRD to the cluster.
	kubectl config use-context kind-operator
	kubectl apply -f ../../config/samples/resources_v1alpha1_maskinportenclient.yaml

.PHONY: delete-client
delete-client: ## Delete a MaskinportenClient CRD on the cluster.
	kubectl config use-context kind-operator
	kubectl delete -f ../../config/samples/resources_v1alpha1_maskinportenclient.yaml

.PHONY: destroy
destroy: ## Destroy the test-application, including kind cluster.
	kubectl config use-context kind-operator
	helm uninstall --ignore-not-found local-testapp
	kind delete cluster --name operator
