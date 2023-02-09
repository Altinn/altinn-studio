setup-kind:
	kind create cluster

build-docker-image:
	docker build src/KubernetesWrapper -t altinn-kuberneteswrapper:local

load-image: build-docker-image
	kind load docker-image altinn-kuberneteswrapper:local

deploy-components: load-image
	kubectl delete -f integrationtests/kubewrapper.yaml --ignore-not-found
	kubectl apply -f integrationtests/kubewrapper.yaml

port-forward:
	kubectl wait deployment -n default kuberneteswrapper --for condition=Available=True --timeout=90s
	kubectl port-forward svc/kuberneteswrapper 8080:8080 &
	sleep 5

build: setup-kind deploy-components

run-test:
	./integrationtests/curl-test.sh

test: build run-test clean

clean:
	kind delete cluster
