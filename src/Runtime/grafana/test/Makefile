.PHONY: setup-kind setup-grafana setup-grafana-dashboards clean

KIND_NAME := test

setup-kind:
	kind create cluster --name $(KIND_NAME) --config=cluster.yaml

	kubectl config use-context kind-$(KIND_NAME)

	helm upgrade -i grafana-operator oci://ghcr.io/grafana/helm-charts/grafana-operator --version v5.19.0

	# Ensure CRDs are established before creating CRs
	# kubectl get crds
	# kubectl wait --for=condition=Established crd grafanas.grafana.integreatly.org --timeout=120s
	# kubectl wait --for=condition=Established crd grafanadashboards.grafana.integreatly.org --timeout=120s
	# kubectl wait --for=condition=Established crd grafanaalertrulegroups.grafana.integreatly.org --timeout=120s
	# kubectl wait --for=condition=Established crd grafanacontactpoints.grafana.integreatly.org --timeout=120s

	kubectl apply -f grafana.yml

	# kubectl wait --for=condition=GrafanaReady grafana/grafana --timeout=5m

setup-grafana: setup-grafana-dashboards
	# setup-grafana-alerts
	# setup-grafana-contact-points

setup-grafana-dashboards:
	kubectl apply -f ../infra/kustomize/base/grafana-dashboard.yaml

clean:
	kind delete cluster --name $(KIND_NAME)
