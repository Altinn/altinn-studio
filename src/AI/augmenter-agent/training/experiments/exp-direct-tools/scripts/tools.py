"""Deterministic tool registry — primitives the LLM can call.

Each tool has:
  * a Python implementation
  * a TOOL_DEFINITIONS entry (OpenAI tools schema)

The 8 tools below cover ~90% of the mechanical checks Spor C encoded as
27 Python rules. The remaining rules are pure templates (always-same
response, no logic — modellen kan skrive ut JSON-svaret direkte fra
regel-prosaen uten å kalle noe tool).

Design constraints:
  * Pure functions, deterministic, no side effects, no I/O
  * Argument names match the OpenAI schema verbatim (LLM passes by name)
  * Return JSON-serializable values only
  * Errors are returned as {"error": "..."} rather than raised — the LLM
    must be able to read and reason about a failed tool call
"""

from __future__ import annotations

import datetime as dt
import re
from typing import Any, Callable


# ---------------------------------------------------------------------------
# Norwegian fødselsnummer helpers
# ---------------------------------------------------------------------------

_FNR_RE = re.compile(r"^\d{11}$")


def _birthdate_from_fnr(fnr: str) -> dt.date | None:
    """Decode birthdate from an 11-digit Norwegian fødselsnummer.

    Century is derived from the individual number (positions 6-8, 0-indexed
    positions 6,7,8) per Skatteetaten's rules:
        000-499  -> 1900-1999
        500-749  -> 1854-1899  (rare, treated as 18xx)
        500-999  -> 2000-2039  (if year <= 39)
        900-999  -> 1940-1999  (if year >= 40)
    Approximation good enough for adults applying for bevilling.
    """
    if not fnr or not _FNR_RE.match(fnr):
        return None
    day = int(fnr[0:2])
    month = int(fnr[2:4])
    yy = int(fnr[4:6])
    indiv = int(fnr[6:9])
    if indiv <= 499:
        year = 1900 + yy
    elif indiv <= 749 and yy >= 54:
        year = 1800 + yy
    elif indiv <= 999 and yy <= 39:
        year = 2000 + yy
    elif indiv >= 900 and yy >= 40:
        year = 1900 + yy
    else:
        year = 1900 + yy
    # D-nummer: day is offset by +40
    if day > 40:
        day -= 40
    try:
        return dt.date(year, month, day)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def age_at_date_from_fnr(fnr: str, reference_date: str) -> dict[str, Any]:
    """Compute age in whole years for a person with the given Norwegian fnr
    on the reference date.

    Returns {"age": int, "birthdate": "YYYY-MM-DD"} or {"error": "..."}.
    """
    bdate = _birthdate_from_fnr(fnr or "")
    if bdate is None:
        return {"error": f"Invalid fnr (expected 11 digits): {fnr!r}"}
    try:
        ref = dt.date.fromisoformat(reference_date)
    except (ValueError, TypeError):
        return {"error": f"Invalid reference_date (expected YYYY-MM-DD): {reference_date!r}"}
    age = ref.year - bdate.year - ((ref.month, ref.day) < (bdate.month, bdate.day))
    return {"age": age, "birthdate": bdate.isoformat()}


def days_between(from_date: str, to_date: str) -> dict[str, Any]:
    """Whole calendar days between two ISO-dates (inclusive of start, exclusive of end).

    days_between("2026-12-19", "2026-12-20") -> {"days": 1}
    Negative result if to_date < from_date.
    """
    try:
        a = dt.date.fromisoformat(from_date)
        b = dt.date.fromisoformat(to_date)
    except (ValueError, TypeError):
        return {"error": "Invalid date format. Expected YYYY-MM-DD."}
    return {"days": (b - a).days}


def time_within_legal_schedule(
    start_time: str, end_time: str, vare_gruppe: str
) -> dict[str, Any]:
    """Check if a serving period falls within the legal max-schedule for the
    given alkohol-group (per alkoholloven § 4-4).

    * Group 1 (øl/vin/cider, ≤22%):       06:00–03:00 next day
    * Group 2 (mellomklasse):              06:00–03:00 next day
    * Group 3 (brennevin/sterkere, >22%):  13:00–03:00 next day

    start_time, end_time: "HH:MM"
    vare_gruppe: free-form text. We match on whether "tre" or "3"
                 appears (case-insensitive) → group 3, else group 1/2.

    Returns {"within": bool, "group": "1-2"|"3", "law": "06:00-03:00"|"13:00-03:00"}.
    """
    def to_min(t: str) -> int | None:
        if not t:
            return None
        m = re.match(r"^(\d{1,2}):(\d{2})$", t.strip())
        if not m:
            return None
        hh, mm = int(m.group(1)), int(m.group(2))
        if hh > 23 or mm > 59:
            return None
        return hh * 60 + mm

    s = to_min(start_time)
    e = to_min(end_time)
    if s is None or e is None:
        return {"error": f"Invalid time format. Expected HH:MM (0-23 hour, 0-59 min), got start={start_time!r}, end={end_time!r}"}
    if e <= s:
        e += 24 * 60  # treat as wrapping past midnight
    grp_text = (vare_gruppe or "").lower()
    is_group_3 = ("tre" in grp_text) or ("3" in grp_text) or ("brennevin" in grp_text)
    if is_group_3:
        within = s >= 13 * 60 and e <= 27 * 60
        return {"within": within, "group": "3", "law": "13:00-03:00"}
    within = s >= 6 * 60 and e <= 27 * 60
    return {"within": within, "group": "1-2", "law": "06:00-03:00"}


_KOMMUNE_REGISTRY: dict[str, dict[str, str]] = {
    "4204": {"name": "Kristiansand", "fylke": "Agder"},
    "4205": {"name": "Vennesla",     "fylke": "Agder"},
    "1001": {"name": "Kristiansand", "fylke": "Agder"},  # gammelt nr, fortsatt i bruk i noen kilder
    "4221": {"name": "Vennesla",     "fylke": "Agder"},
}


def lookup_kommune(kommunenummer: str) -> dict[str, Any]:
    """Look up Norwegian municipality by 4-digit kommunenummer.

    Returns {"name": str, "fylke": str} or {"error": "..."} if unknown.
    Initial registry covers Agder-kommunene relevant for current pilot.
    """
    nr = (kommunenummer or "").strip()
    if nr not in _KOMMUNE_REGISTRY:
        return {"error": f"Unknown kommunenummer: {nr!r}. Known: {sorted(_KOMMUNE_REGISTRY)}"}
    return _KOMMUNE_REGISTRY[nr]


def path_value(application: dict, json_path: str) -> dict[str, Any]:
    """Read a value from the application JSON using a dotted path with
    optional [index] segments.

    Examples:
        path_value(app, "Bevillingsansvarlig.Soker.Navn")
        path_value(app, "Arrangement.ArrangementPeriode[0].StartDato")

    Returns {"value": <value>, "present": True} or {"present": False, "missing_at": "..."}.
    A missing intermediate produces present=False with the path segment that failed.
    """
    if not json_path:
        return {"error": "Empty json_path"}
    cursor: Any = application
    walked = []
    for raw in json_path.split("."):
        m = re.match(r"^([^\[\]]+)(?:\[(\d+)\])?$", raw)
        if not m:
            return {"error": f"Malformed path segment: {raw!r}"}
        key, idx = m.group(1), m.group(2)
        walked.append(key)
        if not isinstance(cursor, dict) or key not in cursor:
            return {"present": False, "missing_at": ".".join(walked)}
        cursor = cursor[key]
        if idx is not None:
            i = int(idx)
            if not isinstance(cursor, list) or i >= len(cursor):
                return {"present": False, "missing_at": f"{'.'.join(walked)}[{i}]"}
            cursor = cursor[i]
    return {"value": cursor, "present": True}


def count_attachments(application: dict, name_contains: str | None = None) -> dict[str, Any]:
    """Count attachments on the application, optionally filtered by a
    case-insensitive substring match against the filename.

    Looks at standard attachment locations: top-level "Vedlegg", "Attachments",
    and any nested "Vedlegg" lists.

    Returns {"count": int, "names": [str, ...]}.
    """
    names: list[str] = []

    def _walk(node: Any) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                if k in ("Vedlegg", "Attachments") and isinstance(v, list):
                    for item in v:
                        if isinstance(item, dict):
                            n = item.get("FileName") or item.get("Filename") or item.get("Name")
                            if n:
                                names.append(str(n))
                        elif isinstance(item, str):
                            names.append(item)
                else:
                    _walk(v)
        elif isinstance(node, list):
            for item in node:
                _walk(item)

    _walk(application)
    if name_contains:
        needle = name_contains.lower()
        names = [n for n in names if needle in n.lower()]
    return {"count": len(names), "names": names}


def text_matches_any(haystack: str, needles: list[str]) -> dict[str, Any]:
    """Case-insensitive check for whole-string equality against any needle.

    text_matches_any("Julebord", ["julebord","firmafest"]) -> {"match": True, "matched": "julebord"}
    """
    if not isinstance(needles, list):
        return {"error": "needles must be a list of strings"}
    h = (haystack or "").strip().lower()
    for n in needles:
        if h == (n or "").strip().lower():
            return {"match": True, "matched": n}
    return {"match": False, "matched": None}


def text_contains_any(haystack: str, needles: list[str]) -> dict[str, Any]:
    """Case-insensitive substring search: True if ANY needle appears in haystack.

    text_contains_any("Maharaja Restaurant", ["restaurant","kro"]) -> {"contains": True, "matched": "restaurant"}
    """
    if not isinstance(needles, list):
        return {"error": "needles must be a list of strings"}
    h = (haystack or "").lower()
    for n in needles:
        n_lower = (n or "").lower()
        if n_lower and n_lower in h:
            return {"contains": True, "matched": n}
    return {"contains": False, "matched": None}


# ---------------------------------------------------------------------------
# OpenAI tool definitions
# ---------------------------------------------------------------------------

TOOL_REGISTRY: dict[str, Callable[..., Any]] = {
    "age_at_date_from_fnr": age_at_date_from_fnr,
    "days_between": days_between,
    "time_within_legal_schedule": time_within_legal_schedule,
    "lookup_kommune": lookup_kommune,
    "path_value": path_value,
    "count_attachments": count_attachments,
    "text_matches_any": text_matches_any,
    "text_contains_any": text_contains_any,
}


TOOL_DEFINITIONS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "age_at_date_from_fnr",
            "description": (
                "Beregn alder i hele år for en person med gitt 11-sifret norsk "
                "fødselsnummer på en referansedato. Bruk dette når du må vite "
                "om en person har fylt en aldersgrense (f.eks. 20 år for styrer)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "fnr": {"type": "string", "description": "11-sifret fødselsnummer (kun siffer)"},
                    "reference_date": {"type": "string", "description": "ISO-8601 dato YYYY-MM-DD (typisk arrangementets startdato eller vedtaksdato)"},
                },
                "required": ["fnr", "reference_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "days_between",
            "description": (
                "Antall kalenderdager mellom to ISO-datoer (start inkludert, slutt ekskludert). "
                "Bruk dette for å beregne varighet av arrangement eller saksbehandlingstid."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {"type": "string", "description": "Startdato (YYYY-MM-DD)"},
                    "to_date":   {"type": "string", "description": "Sluttdato (YYYY-MM-DD)"},
                },
                "required": ["from_date", "to_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "time_within_legal_schedule",
            "description": (
                "Sjekk om skjenketider ligger innenfor alkohollovens makstider for varegruppen. "
                "Gruppe 1-2 (øl/vin): 06:00-03:00. Gruppe 3 (brennevin): 13:00-03:00."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start_time": {"type": "string", "description": "Skjenkestart, HH:MM"},
                    "end_time":   {"type": "string", "description": "Skjenkeslutt, HH:MM (kan være neste dag — wrap håndteres)"},
                    "vare_gruppe": {"type": "string", "description": "Tekstuell beskrivelse av varegruppe (f.eks. 'gruppe 1 og 2', 'gruppe tre', 'brennevin')"},
                },
                "required": ["start_time", "end_time", "vare_gruppe"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_kommune",
            "description": "Slå opp kommunenavn fra 4-sifret kommunenummer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "kommunenummer": {"type": "string", "description": "4-sifret kommunenummer"},
                },
                "required": ["kommunenummer"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "path_value",
            "description": (
                "Les en verdi fra søknads-JSON via dot-path med valgfri [index]. "
                "Eksempel: 'Bevillingsansvarlig.Styrer.Foedselsnummer'. "
                "Returnerer present=False hvis et mellomliggende steg mangler — bruk det "
                "for å avgjøre om dokumentasjon/felt er oppgitt eller mangler."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "json_path": {"type": "string", "description": "Dot-path med valgfri [n]-indeks"},
                },
                "required": ["json_path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "count_attachments",
            "description": (
                "Tell vedlegg på søknaden, valgfritt filtrert på filnavn-substring. "
                "Bruk dette for å sjekke om dokumentasjon (plantegning, leiekontrakt, etc.) "
                "er vedlagt."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "name_contains": {"type": "string", "description": "Valgfri substring i filnavn (case-insensitiv). Utelat for total-telling."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "text_matches_any",
            "description": (
                "Eksakt tekst-likhet (case-insensitiv) mot en liste alternativer. "
                "Bruk for å sjekke om en kategori er i en kjent enum (f.eks. arrangement-type)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "haystack": {"type": "string", "description": "Verdi å sjekke"},
                    "needles":  {"type": "array", "items": {"type": "string"}, "description": "Liste med gyldige alternativer"},
                },
                "required": ["haystack", "needles"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "text_contains_any",
            "description": (
                "Substring-søk (case-insensitiv): True hvis ETT av needles forekommer i haystack. "
                "Bruk for å sjekke om f.eks. stedsnavn inneholder 'restaurant', 'kro', 'pub'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "haystack": {"type": "string", "description": "Tekst å søke i"},
                    "needles":  {"type": "array", "items": {"type": "string"}, "description": "Liste med substrings"},
                },
                "required": ["haystack", "needles"],
            },
        },
    },
]


def dispatch(name: str, arguments: dict[str, Any], *, application: dict | None = None) -> Any:
    """Invoke a tool by name. `application` is injected automatically for
    tools that need it (path_value, count_attachments) — the LLM doesn't
    need to pass the whole application JSON in tool args."""
    fn = TOOL_REGISTRY.get(name)
    if fn is None:
        return {"error": f"Unknown tool: {name}. Known: {sorted(TOOL_REGISTRY)}"}
    args = dict(arguments or {})
    if name in ("path_value", "count_attachments"):
        if application is None:
            return {"error": f"Tool {name} requires application JSON but none was provided to dispatch()"}
        args["application"] = application
    try:
        return fn(**args)
    except TypeError as e:
        return {"error": f"Bad arguments to {name}: {e}"}
