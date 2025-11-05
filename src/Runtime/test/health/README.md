## Health utility

Utility for running health checks across clusters (that the logged in user has access to).

- Must have `az` CLI installed, logged into ai-dev account (that has access to relevant env)
- Must have `kubectl` CLI installed (this tool will fetch creds for you if you don't have them)
- Must have Go 1.25 installed

```sh
# Run this to trigger prompt for az cli extension installation
# We use graph query to more efficiently query available clusters
az graph query -h
```

### Usage

```sh
# Get status of pdf generator deployment resource in tt02 envs
go run cmd/main.go status tt02 dep pdf/pdf-generator

# Get status of pdf generator deployment resource in tt02 envs (use cached clusters metadata from .cache/)
go run cmd/main.go status -uc tt02 dep pdf/pdf-generator

# Get status of pdf generator flux HelmRelease resource in tt02 envs (use cached clusters metadata from .cache/)
go run cmd/main.go status -uc tt02 hr pdf/pdf-generator
```
