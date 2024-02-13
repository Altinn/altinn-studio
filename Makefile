.PHONY: docker-start-localtest
docker-start-localtest:
	docker-compose up -d --build

.PHONY: docker-stop-localtest
docker-stop-localtest:
	docker-compose down

.PHONY: podman-start-localtest
podman-start-localtest:
	podman compose --file podman-compose.yml up -d --build
	
.PHONY: podman-stop-localtest
podman-stop-localtest:
	podman compose --file podman-compose.yml down
	
.PHONY: podman-compose-start-localtest
podman-compose-start-localtest:
	podman-compose --file podman-compose.yml up -d --build
	
.PHONY: podman-compose-stop-localtest
podman-compose-stop-localtest:
	podman-compose --file podman-compose.yml down

.PHONY: podman-selinux-bind-hack
podman-selinux-bind-hack:
	@echo "Running best effort commands to make bind mounts work on Apple Silicon and Linux with podman. Dirty hack until actual issue is located and fixed."
	podman container run -v ./testdata/:/testdata/:Z --rm -it --entrypoint cat nginx:alpine-perl /testdata/authorization/claims/1337.json > /dev/null
	podman container run -v ./loadbalancer/templates/:/testdata/:Z --rm -it --entrypoint cat nginx:alpine-perl /testdata/nginx.conf.conf > /dev/null
	podman container run -v ./loadbalancer/www/:/testdata/:Z --rm -it --entrypoint cat nginx:alpine-perl /testdata/502App.html > /dev/null