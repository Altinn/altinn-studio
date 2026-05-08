COMPOSE := docker compose -f docker-compose.test.yml
HURL    := hurl

PROXY_ON_PUB  ?= http://localhost:18080
PROXY_ON_INT  ?= http://localhost:18081
PROXY_OFF_PUB ?= http://localhost:18090
PROXY_OFF_INT ?= http://localhost:18091

HURL_ARGS := \
  --variables-file fixtures.env \
  --variable proxy_on_pub=$(PROXY_ON_PUB) \
  --variable proxy_on_int=$(PROXY_ON_INT) \
  --variable proxy_off_pub=$(PROXY_OFF_PUB) \
  --variable proxy_off_int=$(PROXY_OFF_INT)

HURL_FILES := public.hurl trusted.hurl

.DEFAULT_GOAL := test
.PHONY: test up down build cases public trusted wait logs shell clean help

help:
	@echo "Targets:"
	@echo "  test       up + run all cases + down (default)"
	@echo "  up         bring stack up and wait until reachable"
	@echo "  down       tear down stack"
	@echo "  build      rebuild images"
	@echo "  cases      run all cases against the running stack"
	@echo "  public     run only public.hurl (port 80)"
	@echo "  trusted    run only trusted.hurl (port 81)"
	@echo "  logs       tail compose logs"
	@echo "  shell      open a shell in proxy-oidc-on"
	@echo "  clean      alias for down"

test:
	@$(COMPOSE) up -d --build && \
	  $(MAKE) -s wait && \
	  $(HURL) --test $(HURL_ARGS) $(HURL_FILES); rc=$$?; \
	  $(COMPOSE) down -v --remove-orphans; \
	  exit $$rc

up:
	$(COMPOSE) up -d --build
	@$(MAKE) -s wait

down:
	$(COMPOSE) down -v --remove-orphans

build:
	$(COMPOSE) build

cases:
	@$(HURL) --test $(HURL_ARGS) $(HURL_FILES)

public:
	@$(HURL) --test $(HURL_ARGS) public.hurl

trusted:
	@$(HURL) --test $(HURL_ARGS) trusted.hurl

wait:
	@for url in $(PROXY_ON_PUB) $(PROXY_ON_INT) $(PROXY_OFF_PUB) $(PROXY_OFF_INT); do \
	  ok=0; \
	  for i in $$(seq 1 60); do \
	    if curl -s -o /dev/null --max-time 2 $$url/healthz; then ok=1; break; fi; \
	    sleep 1; \
	  done; \
	  if [ $$ok -eq 0 ]; then echo "timeout: $$url" >&2; $(COMPOSE) logs >&2; exit 1; fi; \
	done

logs:
	$(COMPOSE) logs -f

shell:
	$(COMPOSE) exec proxy-oidc-on sh

clean: down
