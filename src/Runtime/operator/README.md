# Altinn Studio Operator

Home of Kubernetes operator(s) for Altinn 3.
Operators are implemented using Go and Kubebuilder.

## Contributing

See [/CONTRIBUTING.md](/CONTRIBUTING.md).

## Architecture

[Architecture diagram](/docs/maskinporten.drawio.svg)

### Controllers

- `maskinporten`: Reconciles `MaskinportenClient` resources and related secrets.
- `secretsync`: Syncs selected secrets between namespaces.
- `grafanapolicysync`: Upserts the Altinn Grafana notification route via Grafana API without replacing unrelated policy branches.
- `azurekeyvaultsync`: Syncs selected Key Vault secrets to Kubernetes.
- `cnpgsync`: Provisions CNPG resources via Flux in selected environments.
- `inactivityscaler`: Scales selected workloads up/down based on environment, service owner, app presence, and workhours (`Europe/Oslo`, weekdays 06-18).
