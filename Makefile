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