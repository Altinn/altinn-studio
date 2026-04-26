
.PHONY: podman-selinux-bind-hack
podman-selinux-bind-hack:
	@echo "Running best effort commands to make bind mounts work on Apple Silicon and Linux with podman. Dirty hack until actual issue is located and fixed."
	podman container run -v ./testdata/:/testdata/:Z --rm -it --entrypoint cat nginx:alpine-perl /testdata/authorization/claims/1337.json > /dev/null

.PHONY: sync-dashboards
sync-dashboards:
	curl -o ./infra/grafana-dashboards/aspnetcore.json https://raw.githubusercontent.com/dotnet/aspire/main/src/Grafana/dashboards/aspnetcore.json
	curl -o ./infra/grafana-dashboards/aspnetcore-endpoint.json https://raw.githubusercontent.com/dotnet/aspire/main/src/Grafana/dashboards/aspnetcore-endpoint.json
