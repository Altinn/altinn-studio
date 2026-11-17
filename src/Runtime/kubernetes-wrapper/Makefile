# Fully qualified, because Podman tags an unqualified name as localhost/…, which the kind node then
# does not match against the manifest's image. Docker normalizes this to the same name it gives
# altinn-kuberneteswrapper:local.
IMAGE := docker.io/library/altinn-kuberneteswrapper:local

.PHONY: setup-kind
setup-kind:
	kind create cluster

.PHONY: build-docker-image
build-docker-image:
	docker build -f src/Dockerfile ../.. -t $(IMAGE)

.PHONY: load-image
load-image: build-docker-image
	kind load docker-image $(IMAGE)

.PHONY: deploy-components
deploy-components: load-image
	kubectl delete -f integrationtests/kubewrapper.yaml --ignore-not-found
	kubectl apply -f integrationtests/kubewrapper.yaml

.PHONY: port-forward
port-forward:
	kubectl wait deployment -n default kuberneteswrapper --for condition=Available=True --timeout=90s
	kubectl port-forward svc/kuberneteswrapper 8080:8080 &
	sleep 5

.PHONY: build
build: setup-kind deploy-components

.PHONY: run-test
run-test:
	./integrationtests/curl-test.sh

.PHONY: test
test:
	dotnet test

.PHONY: test-e2e
test-e2e: build run-test clean

.PHONY: clean
clean:
	kind delete cluster
