.PHONY: setup-kind
setup-kind:
	kind create cluster

.PHONY: build-docker-image
build-docker-image:
	docker build src/KubernetesWrapper -t altinn-kuberneteswrapper:local

.PHONY: load-image
load-image: build-docker-image
	kind load docker-image altinn-kuberneteswrapper:local

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
test: build run-test clean

.PHONY: clean
clean:
	kind delete cluster
