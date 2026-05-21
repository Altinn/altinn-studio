# Alt-config: personalpermisjon

A second, complete config that proves the augmenter-agent image is
multi-tenant. It implements a completely different domain — an employee
applying for leave from their workplace — using the same image binary,
the same step types, and the same JsonPathMapper primitives.

Field names, registry structure, checklist sections, rules, templates,
and the system prompt are deliberately different from `config/`
(bevillinger). Any hidden coupling between image and bevillinger config
would surface as a failure here.

## Domain

Application: an employee submits a leave request through their
employer's HR portal. The submission contains:

- `Soeker` (employee): name + FNR + employee number + department
- `Permisjonstype`: ferie / studiepermisjon / foreldrepermisjon / annet
- `Permisjonsperiode`: start + end dates
- `Soeknadsdato`: when the request was submitted
- `Begrunnelse`: free-text reason
- `Stedfortreder` (optional): substitute name + employee number
- `Vedlegg`: any supporting documents

## Pipeline

Two steps — one of each type — exercising both code paths.

| Step | Type | Output |
|---|---|---|
| `permisjonssoknad` | `mapping-pdf` | A clean PDF of the request as submitted |
| `vurdering` | `agent-pdf-orchestrated` | A 4-item checklist evaluating the request |

The orchestrator step overrides `schemaFile` to `vurderingsskjema.json`
(not the default `sjekkliste.json`) — proving that the optional field
is wired through. It also runs at `concurrency: 2` to keep the smoke
test fast.

## Checklist items (4 total)

| Section | Item | What the rule checks |
|---|---|---|
| `formelle_krav` | `soker_oppgitt` | Søker has both name and FNR |
| `formelle_krav` | `periode_gyldig` | Start ≤ end, both within +/- 2 years |
| `tidskrav` | `varslet_i_tide` | Søknadsdato is ≥ 14 days before period start (uses `days_between`) |
| `helhetsvurdering` | `samlet_vurdering` | Free-text judgment based on begrunnelse |

Only 2 tools are shipped (`path_value`, `days_between`) — the others
aren't needed. The orchestrator runs fine with a subset of the tool
catalogue; missing tools just don't show up in the model's tool list.

## Run it

```bash
# Swap mounts (one-shot, doesn't persist):
docker compose run --rm \
  -v "$PWD/examples/alt-config:/etc/augmenter:ro" \
  augmenter-agent

# Or via override (preferred for repeated runs):
cat > docker-compose.override.yaml <<EOF
services:
  augmenter-agent:
    volumes:
      - ./examples/alt-config:/etc/augmenter:ro
EOF
docker compose up -d --force-recreate

# Then post the matching sample application:
curl -X POST http://localhost:8072/generate \
  -F "file=@examples/applications/permisjonssoknad-eksempel.json;type=application/json"
```

The integration test `AltConfigSwapTests.cs` runs exactly this path in
CI so regressions in the multi-tenant promise fail at test time.
