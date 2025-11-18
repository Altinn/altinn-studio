# Studio Syncroot

Base configuration for all Studio Kubernetes resources. This is based on the syncroot pattern created by the Platform team.

## Structure

The `base/` folder contains shared Kubernetes manifests, with environment-specific overlays in `dev/`, `staging/`, and `prod/`.

## Guidelines

**Keep syncroot slim.** It should only contain references to OCI images that hold the actual resources. Avoid adding resource manifests directly here.

## Migration Note

Some resources like `studio-runners` namespaces were created via Terraform. These have not been migrated yet to avoid breaking existing services, but will be moved here in the future.

## PostBuild Substitutions

The `ENVIRONMENT` variable is substituted at deploy time:

| Cluster | ENVIRONMENT Value |
| ------- | ----------------- |
| dev     | dev               |
| staging | staging           |
| prod    | prod              |
