# Studio syncroot

The syncroot of the Studio clusters, with an overlay for each of `dev`, `staging` and `prod`. It follows the Platform
team's syncroot pattern, and [deploy-studio-syncroot.yaml](../../../.github/workflows/deploy-studio-syncroot.yaml)
publishes it.

Keep it slim. An entry points Flux at an OCI artifact that holds a component's resources, rather than holding the
manifests itself. Flux substitutes `${ENVIRONMENT}` with the environment's name, so an entry can pick the artifact tag
for its environment.

Terraform created some resources, such as the `studio-runners` namespaces. They stay there for now, since moving them
could break the services that use them.
