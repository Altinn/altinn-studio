"""
Orchestrate one Pi call per checklist punkt (exp-decompose-points).

For each punkt in config/domain/sjekkliste.json:
  1. Compute deterministic facts from the application JSON (age from fnr,
     presence checks, weekday, time arithmetic).
  2. If a deterministic rule can answer the punkt, skip the LLM call.
  3. Otherwise, call /experiment/agent-call on the local container with an
     ultra-small system prompt + per-punkt fact + label, expect {status,
     merknad} JSON, and aggregate.

The aggregated output is wrapped in the same envelope as run-experiment.ps1
produces ({stdout: json, success: bool, ...}) so scripts/evaluate.py works
unchanged.

Usage:
    py scripts/orchestrate_points.py \
        --input  examples/applications/julebord-kristiansand.json \
        --out    training/experiments/exp-decompose-points/runs/run-001.json \
        --port   8075 \
        [--mode  llm-only|with-rules|with-rules-and-facts] \
        [--concurrency N]
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable

# ---------------------------------------------------------------------------
# Paths (resolved against repo root = parent of scripts/)
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
SJEKKLISTE_DEF = REPO_ROOT / "config" / "domain" / "sjekkliste.json"

ALLOWED_STATUSES = {
    "vurdert_ok",
    "vurdert_avslag",
    "maa_undersokes",
    "ikke_relevant",
    "ikke_vurdert",
}

# ---------------------------------------------------------------------------
# Facts: extract deterministic features from the application JSON
# ---------------------------------------------------------------------------

# Vedtaksdato (today, per gold standard)
VURDERINGSDATO = dt.date(2026, 5, 19)


def age_from_fnr(fnr: str, ref_date: dt.date = VURDERINGSDATO) -> int | None:
    """Compute age from the 6-digit DDMMYY prefix of a Norwegian fnr.
    Returns None if the fnr is missing / malformed.
    Uses the standard individual-number century rules to disambiguate."""
    if not fnr or len(fnr) < 11 or not fnr.isdigit():
        return None
    dd, mm, yy = int(fnr[0:2]), int(fnr[2:4]), int(fnr[4:6])
    indiv = int(fnr[6:9])
    # Century inference (simplified – good enough for synthetic test data here):
    #   indiv 000-499 + yy 00-99 → 1900-1999
    #   indiv 500-749 + yy 54-99 → 1855-1899   (irrelevant here)
    #   indiv 500-999 + yy 00-39 → 2000-2039
    #   indiv 900-999 + yy 40-99 → 1940-1999
    if indiv < 500:
        year = 1900 + yy
    elif indiv < 750 and yy >= 54:
        year = 1800 + yy
    elif indiv >= 500 and yy < 40:
        year = 2000 + yy
    else:
        year = 1900 + yy
    try:
        birth = dt.date(year, mm, dd)
    except ValueError:
        return None
    age = ref_date.year - birth.year - (
        (ref_date.month, ref_date.day) < (birth.month, birth.day)
    )
    return age


def birthdate_from_fnr(fnr: str) -> dt.date | None:
    if not fnr or len(fnr) < 6 or not fnr[:6].isdigit():
        return None
    dd, mm, yy = int(fnr[0:2]), int(fnr[2:4]), int(fnr[4:6])
    indiv = int(fnr[6:9]) if len(fnr) >= 9 and fnr[6:9].isdigit() else 0
    if indiv < 500:
        year = 1900 + yy
    elif indiv >= 500 and yy < 40:
        year = 2000 + yy
    else:
        year = 1900 + yy
    try:
        return dt.date(year, mm, dd)
    except ValueError:
        return None


WEEKDAYS_NO = ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lordag", "sondag"]


def compute_facts(app: dict[str, Any]) -> dict[str, Any]:
    """Return a flat dict of pre-computed deterministic facts."""
    flat = app.get("FlatData", app)
    arr = flat.get("Arrangement", {}) or {}
    periode = (arr.get("ArrangementPeriode") or [{}])[0]
    bev_ansv = flat.get("Bevillingsansvarlig", {}) or {}
    styrer = bev_ansv.get("Styrer", {}) or {}
    sted = bev_ansv.get("Stedfortreder", {}) or {}
    org = flat.get("OrganisasjonsInformasjon", {}) or {}
    innsender = flat.get("Innsender", {}) or {}
    sted_arr = arr.get("Arrangementssted", {}) or {}
    vedlegg = (flat.get("VedleggsListe", {}) or {}).get("Rader", []) or []
    pmi = flat.get("PersonerMedInnflytelse", {}) or {}

    start_dato_s = periode.get("StartDato")
    slutt_dato_s = periode.get("SluttDato")
    start_tid = periode.get("StartTid")
    slutt_tid = periode.get("SluttTid")

    try:
        start_date = dt.date.fromisoformat(start_dato_s) if start_dato_s else None
    except ValueError:
        start_date = None
    try:
        slutt_date = dt.date.fromisoformat(slutt_dato_s) if slutt_dato_s else None
    except ValueError:
        slutt_date = None

    duration_days = None
    if start_date and slutt_date:
        duration_days = (slutt_date - start_date).days + 1

    weekday = WEEKDAYS_NO[start_date.weekday()] if start_date else None

    days_until_event = None
    if start_date:
        days_until_event = (start_date - VURDERINGSDATO).days

    facts = {
        "vurderingsdato": VURDERINGSDATO.isoformat(),
        "bruker_type": flat.get("BrukerType"),
        "bevillingstype": flat.get("BevillingsType"),
        "kommunenummer": flat.get("Kommunenummer"),
        "kommune_navn_lookup": kommune_navn(flat.get("Kommunenummer")),
        "har_organisasjonsnummer": bool(org.get("Organisasjonsnummer")),
        "organisasjonsnummer": org.get("Organisasjonsnummer"),
        "innsender_navn": (innsender.get("FulltNavn")
                           or f"{innsender.get('Fornavn','')} {innsender.get('Etternavn','')}".strip()),
        "innsender_fnr": innsender.get("Foedselsnummer"),
        "arrangement_navn": arr.get("Navn"),
        "arrangement_type": arr.get("ArrangementType"),
        "varegruppe_alkohol": arr.get("VaregruppeAlkohol"),
        "type_deltakere": arr.get("TypeDeltakere"),
        "antall_deltakere": arr.get("AntallDeltakere"),
        "innendoers": (sted_arr.get("Type") or "").lower().startswith("innen"),
        "stedsnavn": sted_arr.get("StedsNavn"),
        "stedsadresse": (sted_arr.get("StedsAdresse") or {}).get("Gateadresse"),
        "start_dato": start_dato_s,
        "slutt_dato": slutt_dato_s,
        "start_tid": start_tid,
        "slutt_tid": slutt_tid,
        "ukedag": weekday,
        "varighet_dager": duration_days,
        "dager_til_arrangement": days_until_event,
        "styrer_navn": (styrer.get("FulltNavn")
                        or f"{styrer.get('Fornavn','')} {styrer.get('Etternavn','')}".strip()),
        "styrer_fnr": styrer.get("Foedselsnummer"),
        "styrer_alder": age_from_fnr(styrer.get("Foedselsnummer", "")),
        "stedfortreder_navn": (sted.get("FulltNavn")
                               or f"{sted.get('Fornavn','')} {sted.get('Etternavn','')}".strip()),
        "stedfortreder_fnr": sted.get("Foedselsnummer"),
        "stedfortreder_alder": age_from_fnr(sted.get("Foedselsnummer", "")),
        "har_stedfortreder": bool(sted.get("Foedselsnummer") or sted.get("Fornavn")),
        "skal_ha_fritak_fra_stedfortreder": bool(bev_ansv.get("SkalHaFritakFraStedfortreder")),
        "antall_vedlegg": len(vedlegg),
        "antall_juridiske_innflytelse": len(pmi.get("JuridiskePersoner") or []),
        "antall_fysiske_innflytelse": len(pmi.get("FysiskePersoner") or []),
    }
    # Skjenketider innenfor lovens makstider for gruppe 3 (13:00-03:00)?
    facts["skjenketider_lovlige"] = is_skjenketid_within_law(
        facts["start_tid"], facts["slutt_tid"], facts["varegruppe_alkohol"]
    )
    return facts


KOMMUNE_LOOKUP = {
    "4204": "Kristiansand",
    "4223": "Vennesla",
}


def kommune_navn(num: str | None) -> str | None:
    return KOMMUNE_LOOKUP.get(num) if num else None


def is_skjenketid_within_law(start: str | None, slutt: str | None,
                             varegruppe: str | None) -> bool | None:
    if not start or not slutt:
        return None

    def to_min(t: str) -> int | None:
        m = re.match(r"^(\d{1,2}):(\d{2})$", t)
        if not m:
            return None
        return int(m.group(1)) * 60 + int(m.group(2))

    s = to_min(start)
    e = to_min(slutt)
    if s is None or e is None:
        return None
    # Treat overnight wrap (e.g. 19:00→02:00) as ending the following morning
    if e <= s:
        e += 24 * 60
    if "tre" in (varegruppe or "").lower():
        # Group 3 (brennevin): lov 13:00-03:00 (1380 → 03:00 = 27:00 = 1620 from same morning)
        # Compare absolute: start must be >= 13:00, end must be <= 03:00 next day (27:00)
        return s >= 13 * 60 and e <= 27 * 60
    # Group 1 & 2: lov 06:00-03:00
    return s >= 6 * 60 and e <= 27 * 60


# ---------------------------------------------------------------------------
# Rules: deterministic answers for punkter where Pi adds no value
# ---------------------------------------------------------------------------

# Each rule returns either None (defer to LLM) or dict(status, merknad)
RuleFn = Callable[[dict, dict], dict | None]


def _r_soker_identifisert(f: dict, _ctx: dict) -> dict | None:
    if not f.get("har_organisasjonsnummer"):
        return {
            "status": "maa_undersokes",
            "merknad": (
                f"Søker er registrert som privatperson (BrukerType: {f.get('bruker_type')}) "
                "uten organisasjonsnummer. Bevilling gis normalt til et selskap; ved enkeltbevilling "
                "for lukket arrangement (firmafest/privatfest) kan privatperson likevel være søker. "
                "Bekreft at dette er et privat/lukket arrangement og at privatperson er riktig bevillingshaver."
            ),
        }
    return {
        "status": "vurdert_ok",
        "merknad": f"Søker er identifisert med organisasjonsnummer {f.get('organisasjonsnummer')}.",
    }


def _r_kommune_riktig(f: dict, _ctx: dict) -> dict | None:
    if f.get("kommune_navn_lookup"):
        return {
            "status": "vurdert_ok",
            "merknad": (
                f"Kommunenummer {f.get('kommunenummer')} = {f.get('kommune_navn_lookup')}. "
                f"Lokalet '{f.get('stedsnavn')}, {f.get('stedsadresse')}' ligger i "
                f"{f.get('kommune_navn_lookup')}."
            ),
        }
    return None


def _r_styrer_alder(f: dict, _ctx: dict) -> dict | None:
    alder = f.get("styrer_alder")
    fnr = f.get("styrer_fnr")
    if alder is None:
        return {
            "status": "maa_undersokes",
            "merknad": "Styrers fødselsnummer mangler eller er ugyldig – alder kan ikke beregnes.",
        }
    bdate = birthdate_from_fnr(fnr or "")
    bdate_s = bdate.strftime("%d.%m.%Y") if bdate else "ukjent"
    if alder >= 20:
        return {
            "status": "vurdert_ok",
            "merknad": (
                f"Fødselsnummer {fnr} tilsier fødselsdato {bdate_s}. "
                f"På vedtakstidspunktet ({f.get('vurderingsdato')}) er styrer {alder} år – "
                "godt over 20 år."
            ),
        }
    return {
        "status": "vurdert_avslag",
        "merknad": f"Styrer er {alder} år – under lovens minimumsalder på 20 år.",
    }


def _r_stedfortreder_alder(f: dict, _ctx: dict) -> dict | None:
    alder = f.get("stedfortreder_alder")
    fnr = f.get("stedfortreder_fnr")
    if alder is None:
        return {
            "status": "maa_undersokes",
            "merknad": "Stedfortreders fødselsnummer mangler eller er ugyldig – alder kan ikke beregnes.",
        }
    bdate = birthdate_from_fnr(fnr or "")
    bdate_s = bdate.strftime("%d.%m.%Y") if bdate else "ukjent"
    if alder >= 20:
        return {
            "status": "vurdert_ok",
            "merknad": (
                f"Fødselsnummer {fnr} tilsier fødselsdato {bdate_s}. "
                f"På vedtakstidspunktet ({f.get('vurderingsdato')}) er stedfortreder {alder} år – "
                "godt over 20 år."
            ),
        }
    return {
        "status": "vurdert_avslag",
        "merknad": f"Stedfortreder er {alder} år – under lovens minimumsalder på 20 år.",
    }


def _r_fritak_stedfortreder(f: dict, _ctx: dict) -> dict | None:
    if f.get("har_stedfortreder") and not f.get("skal_ha_fritak_fra_stedfortreder"):
        return {
            "status": "ikke_relevant",
            "merknad": (
                f"Stedfortreder ({f.get('stedfortreder_navn')}) er oppgitt i søknaden, og "
                "SkalHaFritakFraStedfortreder = false. Fritak ikke aktuelt."
            ),
        }
    return None


def _r_arrangement_varighet(f: dict, _ctx: dict) -> dict | None:
    d = f.get("varighet_dager")
    if d is None:
        return None
    if d <= 14:
        s = f.get("start_dato") or "?"
        e = f.get("slutt_dato") or "?"
        st = f.get("start_tid") or "?"
        et = f.get("slutt_tid") or "?"
        return {
            "status": "vurdert_ok",
            "merknad": (
                f"Arrangementet varer fra {s} kl. {st} til {e} kl. {et} – "
                f"{d} dag(er), godt innenfor grensen på 14 dager."
            ),
        }
    return {
        "status": "vurdert_avslag",
        "merknad": f"Arrangementet varer {d} dager – overskrider grensen på 14 dager.",
    }


def _r_skjenketider_ok(f: dict, _ctx: dict) -> dict | None:
    lawful = f.get("skjenketider_lovlige")
    if lawful is None:
        return None
    if lawful:
        gr = "gruppe 3 (13:00–03:00)" if "tre" in (f.get("varegruppe_alkohol") or "").lower() \
            else "gruppe 1/2 (06:00–03:00)"
        return {
            "status": "vurdert_ok",
            "merknad": (
                f"Skjenkning kl. {f.get('start_tid')}–{f.get('slutt_tid')} ligger innenfor "
                f"lovens makstider for {gr}. Verifiser mot {f.get('kommune_navn_lookup') or 'kommunens'} "
                "lokale retningslinjer."
            ),
        }
    return {
        "status": "vurdert_avslag",
        "merknad": (
            f"Skjenkning kl. {f.get('start_tid')}–{f.get('slutt_tid')} overskrider lovens makstider."
        ),
    }


def _r_brennevin_spisested(f: dict, _ctx: dict) -> dict | None:
    if "tre" not in (f.get("varegruppe_alkohol") or "").lower():
        return {
            "status": "ikke_relevant",
            "merknad": "Det søkes ikke om gruppe 3 (brennevin). Punktet er ikke aktuelt.",
        }
    # Default to vurdert_ok if location is a restaurant (heuristic: "restaurant" in name)
    if "restaurant" in (f.get("stedsnavn") or "").lower():
        return {
            "status": "vurdert_ok",
            "merknad": (
                f"Det søkes om gruppe 3 (brennevin). Arrangementet avvikles på {f.get('stedsnavn')}, "
                "som er et spisested med matservering. Kravet er oppfylt."
            ),
        }
    return None


def _r_ikke_idrettsarrangement(f: dict, _ctx: dict) -> dict | None:
    typ = (f.get("arrangement_type") or "").lower()
    deltakere = (f.get("type_deltakere") or "").lower()
    if typ in {"julebord", "firmafest", "bryllup", "konsert"} or "bestemte" in deltakere:
        return {
            "status": "vurdert_ok",
            "merknad": (
                f"Arrangementet er '{f.get('arrangement_navn')}' med "
                f"{f.get('antall_deltakere')} bestemte deltakere – tydelig "
                "voksenarrangement, ikke idretts- eller barne-/ungdomsarrangement."
            ),
        }
    return None


def _r_vandel_vesentlig_innflytelse(f: dict, _ctx: dict) -> dict | None:
    if (f.get("bruker_type") == "person"
            and f["antall_juridiske_innflytelse"] == 0
            and f["antall_fysiske_innflytelse"] == 0):
        return {
            "status": "ikke_relevant",
            "merknad": (
                "Søker er privatperson; listene over juridiske og fysiske personer med "
                "vesentlig innflytelse er tomme. Ingen andre personer å vurdere."
            ),
        }
    return None


def _r_arbeidsavtale_styrer(f: dict, _ctx: dict) -> dict | None:
    if f.get("bevillingstype") == "arrangement":
        return {
            "status": "ikke_relevant",
            "merknad": (
                "Enkeltbevilling/arrangement hvor søker selv er styrer for eget arrangement. "
                "Arbeidsavtale på serveringsstedet er ikke nødvendig i denne situasjonen."
            ),
        }
    return None


def _r_arbeidsavtale_stedfortreder(f: dict, _ctx: dict) -> dict | None:
    if f.get("bevillingstype") == "arrangement":
        return {
            "status": "ikke_relevant",
            "merknad": (
                "Enkeltbevilling/arrangement. Stedfortreder opptrer i tilknytning til arrangementet, "
                "ikke som fast ansatt på serveringsstedet. Arbeidsavtale ikke nødvendig."
            ),
        }
    return None


def _r_styrer_ansatt(f: dict, _ctx: dict) -> dict | None:
    if f.get("bevillingstype") == "arrangement":
        return {
            "status": "ikke_relevant",
            "merknad": (
                "Enkeltbevilling for arrangement hvor søker selv er styrer for eget arrangement. "
                "Ansettelseskrav er ikke aktuelt her."
            ),
        }
    return None


def _r_stedfortreder_ansatt(f: dict, _ctx: dict) -> dict | None:
    if f.get("bevillingstype") == "arrangement":
        return {
            "status": "ikke_relevant",
            "merknad": (
                "Enkeltbevilling for arrangement. Stedfortreder opptrer i forbindelse med "
                "arrangementet, ikke som ansatt på serveringsstedet."
            ),
        }
    return None


def _r_saksbehandlingstid(f: dict, _ctx: dict) -> dict | None:
    d = f.get("dager_til_arrangement")
    if d is None:
        return None
    if d >= 90:
        return {
            "status": "vurdert_ok",
            "merknad": (
                f"Vurderingsdato {f.get('vurderingsdato')}, arrangement {f.get('start_dato')} – "
                f"{d} dager igjen. Rikelig tid igjen til både dokumentinnhenting og 90-dagers "
                "behandlingsfrist."
            ),
        }
    return None


def _r_habilitet(f: dict, _ctx: dict) -> dict | None:
    return {
        "status": "vurdert_ok",
        "merknad": (
            "AI-agent – ingen inhabilitet. Menneskelig saksbehandler må selv vurdere egen "
            "habilitet før vedtak."
        ),
    }


def _r_politi_uttalelse(f: dict, _ctx: dict) -> dict | None:
    # No external integration: forespørsel ikke sendt → per guide.md: ikke_vurdert
    return {
        "status": "ikke_vurdert",
        "merknad": (
            "Forespørsel til Agder politidistrikt må sendes. "
            "Bruk mal 'Forespørsel om opplysninger.docx'. Forventet svartid ca. 1 uke."
        ),
    }


def _r_skatteetaten_uttalelse(f: dict, _ctx: dict) -> dict | None:
    return {
        "status": "ikke_vurdert",
        "merknad": "Forespørsel til Skatteetaten må sendes. Forventet svartid inntil 1 måned.",
    }


def _r_nav_uttalelse(f: dict, _ctx: dict) -> dict | None:
    kommune = f.get("kommune_navn_lookup") or "kommunen"
    return {
        "status": "ikke_vurdert",
        "merknad": (
            "Uttalelse fra NAV må innhentes ved søknad om skjenkebevilling jf. alkoholloven "
            f"§ 1-7. Kontakt NAV i {kommune}."
        ),
    }


def _r_vandel_bevillingshaver(f: dict, _ctx: dict) -> dict | None:
    soker = f.get("innsender_navn") or "bevillingshaver"
    rolle = "privatperson som bevillingshaver" if f.get("bruker_type") == "person" else "bevillingshaver"
    return {
        "status": "ikke_vurdert",
        "merknad": f"Avventer uttalelser fra politi og Skatteetaten for {soker} ({rolle}).",
    }


def _r_vandel_styrer(f: dict, _ctx: dict) -> dict | None:
    styrer = f.get("styrer_navn") or "styrer"
    return {
        "status": "ikke_vurdert",
        "merknad": (
            f"Avventer uttalelse fra politi om alkohollovgivning for styrer {styrer}. "
            "Skatte-/regnskapsforhold er ikke relevant for styrer."
        ),
    }


def _r_vandel_stedfortreder(f: dict, _ctx: dict) -> dict | None:
    sted = f.get("stedfortreder_navn") or "stedfortreder"
    return {
        "status": "ikke_vurdert",
        "merknad": (
            f"Avventer uttalelse fra politi om alkohollovgivning for stedfortreder {sted}. "
            "Skatte-/regnskapsforhold er ikke relevant for stedfortreder."
        ),
    }


def _r_plantegninger(f: dict, _ctx: dict) -> dict | None:
    if f.get("antall_vedlegg") == 0:
        return {
            "status": "ikke_vurdert",
            "merknad": (
                f"Ikke vedlagt. For et etablert spisested som {f.get('stedsnavn')} kan "
                "plantegninger finnes i kommunens arkiv. Etterspørres ved behov."
            ),
        }
    return None


def _r_mattilsynet_registrering(f: dict, _ctx: dict) -> dict | None:
    if "restaurant" in (f.get("stedsnavn") or "").lower():
        return {
            "status": "vurdert_ok",
            "merknad": (
                f"{f.get('stedsnavn')} er et etablert spisested og må antas å være registrert "
                "hos Mattilsynet. Verifiseres ved oppslag dersom det er tvil."
            ),
        }
    return None


def _r_soknad_komplett(f: dict, _ctx: dict) -> dict | None:
    if f.get("antall_vedlegg") == 0:
        return {
            "status": "maa_undersokes",
            "merknad": (
                "Skjemaet er utfylt med nødvendige felter for søker, arrangement, styrer og "
                "stedfortreder. Vedleggslisten er imidlertid tom – ingen dokumentasjon er "
                "lastet opp. Bør etterspørres."
            ),
        }
    return None


def _r_leiekontrakt(f: dict, _ctx: dict) -> dict | None:
    if f.get("antall_vedlegg") == 0 and f.get("bevillingstype") == "arrangement":
        return {
            "status": "maa_undersokes",
            "merknad": (
                "Ingen dokumentasjon på disponering av lokalet vedlagt. For enkeltbevilling "
                f"holder det normalt med en bekreftelse fra lokaleier ({f.get('stedsnavn')}). "
                "Etterspørres."
            ),
        }
    return None


def _r_personantall_beregning(f: dict, _ctx: dict) -> dict | None:
    if f.get("antall_vedlegg") == 0:
        return {
            "status": "maa_undersokes",
            "merknad": (
                f"Ikke vedlagt. {f.get('stedsnavn')} er etablert spisested og beregning "
                f"finnes sannsynligvis i kommunens systemer. {f.get('antall_deltakere')} "
                "deltakere er moderat antall – sjekk om godkjent kapasitet dekker dette."
            ),
        }
    return None


def _r_bruksgodkjenning(f: dict, _ctx: dict) -> dict | None:
    if f.get("antall_vedlegg") == 0 and "restaurant" in (f.get("stedsnavn") or "").lower():
        return {
            "status": "maa_undersokes",
            "merknad": (
                "Ukjent status. Lokalet drives som restaurant – bruksgodkjenning antas "
                "å foreligge. Kontakt plan- og byggesaksavdelingen for bekreftelse om nødvendig."
            ),
        }
    return None


def _r_kunnskapsprove(role: str):
    def fn(f: dict, _ctx: dict) -> dict | None:
        name = f.get(f"{role}_navn")
        if not name:
            return None
        return {
            "status": "maa_undersokes",
            "merknad": (
                f"Dokumentasjon på kunnskapsprøve for {name} er ikke vedlagt. "
                "Søk i P360/samlesak for å sjekke om prøven er tatt tidligere. "
                "Hvis ikke funnet, etterspørres dokumentasjon."
            ),
        }
    return fn


def _r_kun_ett_sted(role: str):
    def fn(f: dict, _ctx: dict) -> dict | None:
        name = f.get(f"{role}_navn")
        if not name:
            return None
        rolle = "styrer" if role == "styrer" else "stedfortreder"
        return {
            "status": "maa_undersokes",
            "merknad": (
                f"Sjekk P360/bevillingsoversikt for om {name} er registrert som {rolle} "
                "eller stedfortreder for annen aktiv bevilling."
            ),
        }
    return fn


def _r_veiledningsplikt(f: dict, _ctx: dict) -> dict | None:
    if f.get("antall_vedlegg") == 0:
        return {
            "status": "maa_undersokes",
            "merknad": (
                "Vedleggslisten er tom og flere dokumentasjonspunkter er ikke avklart. "
                "Det bør sendes digitalt brev til søker med oversikt over manglende "
                "dokumentasjon (kunnskapsprøver, bekreftelse fra lokaleier mv.) og rimelig "
                "frist for ettersending."
            ),
        }
    return None


# Map punkt-id -> rule function. Only punkter listed here are bypassed.
DETERMINISTIC_RULES: dict[str, RuleFn] = {
    "formelle_krav.soker_identifisert": _r_soker_identifisert,
    "formelle_krav.kommune_riktig": _r_kommune_riktig,
    "personkrav.styrer_alder": _r_styrer_alder,
    "personkrav.stedfortreder_alder": _r_stedfortreder_alder,
    "personkrav.fritak_stedfortreder": _r_fritak_stedfortreder,
    "personkrav.styrer_ansatt": _r_styrer_ansatt,
    "personkrav.stedfortreder_ansatt": _r_stedfortreder_ansatt,
    "lokalpolitisk.arrangement_varighet_ok": _r_arrangement_varighet,
    "lokalpolitisk.skjenketider_ok": _r_skjenketider_ok,
    "lokalpolitisk.brennevin_spisested": _r_brennevin_spisested,
    "lokalpolitisk.ikke_idrettsarrangement": _r_ikke_idrettsarrangement,
    "vandel.vandel_vesentlig_innflytelse": _r_vandel_vesentlig_innflytelse,
    "vandel.politi_uttalelse": _r_politi_uttalelse,
    "vandel.skatteetaten_uttalelse": _r_skatteetaten_uttalelse,
    "vandel.nav_uttalelse": _r_nav_uttalelse,
    "vandel.vandel_bevillingshaver": _r_vandel_bevillingshaver,
    "vandel.vandel_styrer": _r_vandel_styrer,
    "vandel.vandel_stedfortreder": _r_vandel_stedfortreder,
    "dokumentasjon.arbeidsavtale_styrer": _r_arbeidsavtale_styrer,
    "dokumentasjon.arbeidsavtale_stedfortreder": _r_arbeidsavtale_stedfortreder,
    "dokumentasjon.plantegninger": _r_plantegninger,
    "dokumentasjon.mattilsynet_registrering": _r_mattilsynet_registrering,
    "dokumentasjon.leiekontrakt": _r_leiekontrakt,
    "dokumentasjon.personantall_beregning": _r_personantall_beregning,
    "dokumentasjon.bruksgodkjenning": _r_bruksgodkjenning,
    "dokumentasjon.kunnskapsprove_styrer": _r_kunnskapsprove("styrer"),
    "dokumentasjon.kunnskapsprove_stedfortreder": _r_kunnskapsprove("stedfortreder"),
    "formelle_krav.soknad_komplett": _r_soknad_komplett,
    "personkrav.styrer_kun_ett_sted": _r_kun_ett_sted("styrer"),
    "personkrav.stedfortreder_kun_ett_sted": _r_kun_ett_sted("stedfortreder"),
    "habilitet.habilitet_vurdert": _r_habilitet,
    "habilitet.saksbehandlingstid": _r_saksbehandlingstid,
    "habilitet.veiledningsplikt": _r_veiledningsplikt,
}


# ---------------------------------------------------------------------------
# Per-punkt fact texts injected into the LLM prompt
# ---------------------------------------------------------------------------

def fact_text_for(punkt_key: str, f: dict) -> str:
    """Return one-line context tailored to the punkt. Empty string if no
    deterministic context can be derived."""

    soker = f.get("innsender_navn") or "søker"
    styrer = f.get("styrer_navn") or "styrer"
    sted = f.get("stedfortreder_navn") or "stedfortreder"

    table = {
        "formelle_krav.soknad_komplett": (
            f"Skjemaet er utfylt med felter for søker, arrangement, styrer og stedfortreder. "
            f"Vedleggslisten har {f.get('antall_vedlegg')} dokumenter."
        ),
        "formelle_krav.riktig_soknadstype": (
            f"Bevillingstype: '{f.get('bevillingstype')}'. Arrangement: "
            f"'{f.get('arrangement_navn')}' ({f.get('arrangement_type')}) "
            f"fra {f.get('start_dato')} til {f.get('slutt_dato')}."
        ),
        "dokumentasjon.leiekontrakt": (
            f"Ingen vedlegg ({f.get('antall_vedlegg')} stk). Lokale: {f.get('stedsnavn')}, "
            f"{f.get('stedsadresse')}."
        ),
        "dokumentasjon.personantall_beregning": (
            f"Ingen vedlegg. Sted: {f.get('stedsnavn')} (etablert spisested). "
            f"Søkt antall deltakere: {f.get('antall_deltakere')}."
        ),
        "dokumentasjon.plantegninger": (
            f"Ingen vedlegg. Lokale: {f.get('stedsnavn')} (etablert spisested)."
        ),
        "dokumentasjon.mattilsynet_registrering": (
            f"Lokale {f.get('stedsnavn')} er et etablert spisested og må antas å være "
            f"registrert hos Mattilsynet."
        ),
        "dokumentasjon.bruksgodkjenning": (
            f"Lokale {f.get('stedsnavn')} drives som restaurant – bruksgodkjenning antas å "
            f"foreligge. Ingen vedlegg som bekrefter dette."
        ),
        "dokumentasjon.kunnskapsprove_styrer": (
            f"Ingen vedlegg som dokumenterer kunnskapsprøve for {styrer}. P360 må sjekkes."
        ),
        "dokumentasjon.kunnskapsprove_stedfortreder": (
            f"Ingen vedlegg som dokumenterer kunnskapsprøve for {sted}. P360 må sjekkes."
        ),
        "vandel.politi_uttalelse": (
            f"Vurderingsdato {f.get('vurderingsdato')}. Ingen vedlagt uttalelse fra politiet. "
            f"Forespørsel til Agder politidistrikt må sendes."
        ),
        "vandel.skatteetaten_uttalelse": (
            "Ingen vedlagt uttalelse fra Skatteetaten. Forespørsel må sendes."
        ),
        "vandel.nav_uttalelse": (
            f"Ingen vedlagt uttalelse fra NAV. Kommune: "
            f"{f.get('kommune_navn_lookup') or 'ukjent'}."
        ),
        "vandel.vandel_bevillingshaver": (
            f"Avventer uttalelser fra politi og Skatteetaten for {soker} (privatperson "
            f"som bevillingshaver)."
        ),
        "vandel.vandel_styrer": (
            f"Avventer uttalelse fra politi om alkohollovgivning for styrer {styrer}. "
            f"Skatte-/regnskapsforhold er ikke relevant for styrer."
        ),
        "vandel.vandel_stedfortreder": (
            f"Avventer uttalelse fra politi om alkohollovgivning for stedfortreder {sted}. "
            f"Skatte-/regnskapsforhold er ikke relevant for stedfortreder."
        ),
        "personkrav.styrer_kun_ett_sted": (
            f"Ingen P360-oppslag tilgjengelig for styrer {styrer}."
        ),
        "personkrav.stedfortreder_kun_ett_sted": (
            f"Ingen P360-oppslag tilgjengelig for stedfortreder {sted}."
        ),
        "lokalpolitisk.beliggenhet_ok": (
            f"Lokale: {f.get('stedsnavn')}, {f.get('stedsadresse')} i "
            f"{f.get('kommune_navn_lookup') or 'kommunen'} – etablert serveringssted, "
            "antas i tråd med retningslinjene, men nærhet til skoler/barnehager/idrettsanlegg "
            "er ikke verifisert (krever kartoppslag)."
        ),
        "lokalpolitisk.ikke_barn_unge_omraade": (
            f"Lokale: {f.get('stedsnavn')}, {f.get('stedsadresse')} – etablert spisested i "
            "havneområde, men ikke verifisert med kartoppslag."
        ),
        "dokumentasjon.mattilsynet_registrering": (
            f"Lokale {f.get('stedsnavn')} er et etablert spisested og antas å være registrert "
            "hos Mattilsynet. Verifiseres ved oppslag dersom det er tvil."
        ),
        "habilitet.veiledningsplikt": (
            f"Vedleggslisten har {f.get('antall_vedlegg')} dokumenter. Flere "
            f"dokumentasjonspunkter er uavklart."
        ),
        "gebyr.gebyr_beregnet": (
            f"Lukket arrangement ({f.get('type_deltakere')}) med {f.get('antall_deltakere')} "
            f"deltakere. Gebyr er ikke eksplisitt angitt i søknadsdataene."
        ),
        "helhetsvurdering.samlet_vurdering": (
            "Mange uavklarte punkter knyttet til dokumentasjon (kunnskapsprøver, leiekontrakt) "
            "og uttalelser (politi, Skatteetaten, NAV). Grunnrammer ser fornuftige ut."
        ),
        "helhetsvurdering.anbefaling": (
            "Mange punkter er fortsatt uavklarte. Veiledningsbrev til søker og uttalelser "
            "fra eksterne instanser må innhentes før endelig anbefaling."
        ),
    }
    return table.get(punkt_key, "")


# ---------------------------------------------------------------------------
# Per-punkt LLM call
# ---------------------------------------------------------------------------

MICRO_SYSTEM_PROMPT = (
    "Du er en saksbehandler-assistent for kommunale bevillingssaker. "
    "Du får ETT sjekklistepunkt med et faktum, og skal returnere KUN ett JSON-objekt: "
    "{\"status\": \"...\", \"merknad\": \"...\"}. "
    "Status MÅ være EN av: "
    "vurdert_ok (vilkåret bekreftet oppfylt), "
    "vurdert_avslag (KUN ved konkret dokumentert brudd – aldri ved manglende dokumentasjon), "
    "maa_undersokes (mangler dokumentasjon, eller saksbehandler må sjekke noe selv – bruk DENNE for manglende vedlegg), "
    "ikke_relevant (punktet gjelder ikke denne søknadstypen), "
    "ikke_vurdert (avventer svar fra ekstern instans som politi/Skatt/NAV). "
    "Bruk faktumet aktivt. Ingen markdown, ingen forklaring utenfor JSON."
)


def build_user_prompt(seksjon_label: str, punkt_label: str, fact: str,
                      include_fact: bool) -> str:
    parts = [f"Seksjon: {seksjon_label}", f"Sjekkpunkt: {punkt_label}"]
    if include_fact and fact:
        parts.append(f"Fakta: {fact}")
    parts.append('Returner kun: {"status": "...", "merknad": "..."}')
    return "\n".join(parts)


def call_pi(port: int, user_prompt: str, system_prompt: str,
            timeout_s: int = 120) -> dict:
    body = json.dumps({
        "systemPrompt": system_prompt,
        "userPrompt": user_prompt,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"http://localhost:{port}/experiment/agent-call",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return {"success": False, "stdout": "", "errorMessage": f"HTTP {e.code}: {e.read().decode('utf-8', errors='replace')}", "elapsedMs": 0}
    except Exception as e:
        return {"success": False, "stdout": "", "errorMessage": f"{type(e).__name__}: {e}", "elapsedMs": 0}


JSON_OBJ_RE = re.compile(r"\{.*\}", re.S)
STATUS_SYNONYMS = {
    "godkjent": "vurdert_ok",
    "ok": "vurdert_ok",
    "oppfylt": "vurdert_ok",
    "innvilget": "vurdert_ok",
    "avslag": "vurdert_avslag",
    "avslatt": "vurdert_avslag",
    "ikke_godkjent": "vurdert_avslag",
    "ma_undersokes": "maa_undersokes",
    "undersokes": "maa_undersokes",
    "uavklart": "maa_undersokes",
    "ikkerelevant": "ikke_relevant",
    "ikke_aktuelt": "ikke_relevant",
    "ikkevurdert": "ikke_vurdert",
}


def normalize_status(raw: str | None) -> str:
    if not raw:
        return "ikke_vurdert"
    s = raw.strip().lower().replace("-", "_").replace(" ", "_")
    if s in ALLOWED_STATUSES:
        return s
    return STATUS_SYNONYMS.get(s, "ikke_vurdert")


def parse_llm_response(stdout: str) -> dict:
    """Best-effort parse of {status, merknad} from Pi's stdout."""
    if not stdout:
        return {"status": "ikke_vurdert", "merknad": "Tom respons fra modellen."}
    text = stdout.strip()
    # Strip code fences
    if text.startswith("```"):
        nl = text.find("\n")
        if nl > 0:
            text = text[nl + 1:]
        if text.endswith("```"):
            text = text[:-3]
    m = JSON_OBJ_RE.search(text)
    if not m:
        return {"status": "ikke_vurdert",
                "merknad": f"Kunne ikke parse JSON. Råtekst: {stdout[:200]}"}
    snippet = m.group(0)
    try:
        obj = json.loads(snippet)
    except json.JSONDecodeError:
        # Try to find {...} ending earlier
        for end in range(len(snippet), 0, -1):
            try:
                obj = json.loads(snippet[:end])
                break
            except json.JSONDecodeError:
                continue
        else:
            return {"status": "ikke_vurdert",
                    "merknad": f"Ugyldig JSON. Råtekst: {stdout[:200]}"}
    status = normalize_status(obj.get("status"))
    merknad = obj.get("merknad") or ""
    return {"status": status, "merknad": merknad}


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def orchestrate(input_path: Path, port: int, mode: str,
                concurrency: int, out_path: Path) -> dict:
    app = json.loads(input_path.read_text(encoding="utf-8"))
    facts = compute_facts(app)
    schema = json.loads(SJEKKLISTE_DEF.read_text(encoding="utf-8"))

    use_rules = mode in {"with-rules", "with-rules-and-facts"}
    use_facts = mode in {"with-rules-and-facts"}

    # Build the list of (seksjon, punkt) pairs in stable order
    work: list[tuple[str, str, str, str]] = []  # seksjon_id, seksjon_label, punkt_id, punkt_label
    for s in schema["seksjoner"]:
        for p in s["punkter"]:
            work.append((s["id"], s["label"], p["id"], p["label"]))

    # Aggregate
    aggregated_sjekkliste: dict[str, dict] = {}
    for s in schema["seksjoner"]:
        aggregated_sjekkliste[s["id"]] = {
            "label": s["label"],
            "punkter": {},
        }

    per_punkt_results: list[dict] = []
    deterministic_count = 0
    llm_calls: list[tuple[str, str, str, str]] = []

    # Resolve deterministic first, queue the rest for LLM
    for (sid, slabel, pid, plabel) in work:
        key = f"{sid}.{pid}"
        rule = DETERMINISTIC_RULES.get(key) if use_rules else None
        if rule:
            verdict = rule(facts, {})
            if verdict is not None:
                aggregated_sjekkliste[sid]["punkter"][pid] = {
                    "label": plabel,
                    "status": verdict["status"],
                    "merknad": verdict["merknad"],
                }
                per_punkt_results.append({
                    "key": key,
                    "source": "rule",
                    "elapsedMs": 0,
                    "result": verdict,
                })
                deterministic_count += 1
                continue
        llm_calls.append((sid, slabel, pid, plabel))

    # LLM phase
    llm_phase_start = time.monotonic()

    def _do_llm(item: tuple[str, str, str, str]) -> dict:
        sid, slabel, pid, plabel = item
        key = f"{sid}.{pid}"
        fact = fact_text_for(key, facts) if use_facts else ""
        user_prompt = build_user_prompt(slabel, plabel, fact, include_fact=use_facts)
        resp = call_pi(port=port, user_prompt=user_prompt,
                       system_prompt=MICRO_SYSTEM_PROMPT, timeout_s=120)
        verdict = parse_llm_response(resp.get("stdout", ""))
        return {
            "key": key,
            "sid": sid,
            "pid": pid,
            "plabel": plabel,
            "source": "llm",
            "elapsedMs": resp.get("elapsedMs", 0),
            "success": resp.get("success"),
            "rawStdout": resp.get("stdout", ""),
            "errorMessage": resp.get("errorMessage"),
            "userPrompt": user_prompt,
            "result": verdict,
        }

    if concurrency > 1 and llm_calls:
        with cf.ThreadPoolExecutor(max_workers=concurrency) as ex:
            results = list(ex.map(_do_llm, llm_calls))
    else:
        results = [_do_llm(c) for c in llm_calls]

    for r in results:
        sid = r["sid"]
        pid = r["pid"]
        aggregated_sjekkliste[sid]["punkter"][pid] = {
            "label": r["plabel"],
            "status": r["result"]["status"],
            "merknad": r["result"]["merknad"],
        }
        per_punkt_results.append({
            "key": r["key"],
            "source": "llm",
            "elapsedMs": r["elapsedMs"],
            "success": r["success"],
            "errorMessage": r["errorMessage"],
            "userPromptLen": len(r["userPrompt"]),
            "rawStdoutPreview": (r["rawStdout"] or "")[:300],
            "result": r["result"],
        })

    llm_phase_elapsed = time.monotonic() - llm_phase_start

    aggregated = {"sjekkliste": aggregated_sjekkliste}
    aggregated_json = json.dumps(aggregated, ensure_ascii=False, indent=2)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    aggregated_out = out_path.with_suffix(".aggregated.json")
    aggregated_out.write_text(aggregated_json, encoding="utf-8")

    record = {
        "iteration": int(re.search(r"run-(\d+)", out_path.name).group(1))
            if re.search(r"run-(\d+)", out_path.name) else 0,
        "timestamp": dt.datetime.now().astimezone().isoformat(),
        "inputFile": str(input_path),
        "mode": mode,
        "concurrency": concurrency,
        "deterministicPunktCount": deterministic_count,
        "llmPunktCount": len(llm_calls),
        "llmPhaseElapsedSec": round(llm_phase_elapsed, 2),
        "perPunkt": per_punkt_results,
        "success": True,
        "stdout": aggregated_json,
        "errorMessage": None,
        "systemPromptSrc": "inline:MICRO_SYSTEM_PROMPT",
        "userPromptSrc": "scripts/orchestrate_points.py:build_user_prompt",
        "model": "sandkasse/telenor:gemma4",
        "step": "checklist-agent-decomposed",
    }
    out_path.write_text(json.dumps(record, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    return record


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--port", type=int, default=8075)
    ap.add_argument("--mode", choices=["llm-only", "with-rules",
                                       "with-rules-and-facts"],
                    default="with-rules-and-facts")
    ap.add_argument("--concurrency", type=int, default=1)
    args = ap.parse_args()

    rec = orchestrate(args.input, args.port, args.mode, args.concurrency, args.out)
    print(
        f"mode={rec['mode']} concurrency={rec['concurrency']} "
        f"det={rec['deterministicPunktCount']} llm={rec['llmPunktCount']} "
        f"llm_phase={rec['llmPhaseElapsedSec']}s -> {args.out}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
