"""Aggregate Langfuse traces and observations into a cost schema."""

from typing import Any, NamedTuple, TypedDict

from shared.config import get_config
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

UNKNOWN = "unknown"


class DailyTokenUsageRow(TypedDict):
    date: str
    year: str
    month: str
    day: str
    serviceownerorgnr: str | None
    serviceownercode: str
    messagesender: str
    serviceresourceid: str
    serviceresourcetitle: str | None
    recipienttype: str | None
    costcenter: str | None
    messagecount: int | None
    instancecount: int | None
    databasestoragebytes: int | None
    attachmentstoragebytes: int | None
    loaded_at: str
    source_file: str

    input_tokens: int
    output_tokens: int
    total_tokens: int
    tokens_by_model: dict[str, dict[str, int]]


class Trace(TypedDict):
    id: str
    user_id: str
    metadata: dict[str, Any]


class Observation(TypedDict):
    id: str
    trace_id: str
    start_time: str
    model: str | None
    usage: Any
    usage_details: dict[str, Any]


class BucketKey(NamedTuple):
    service_owner_code: str
    app_name: str
    date: str


def aggregate_token_usage(
    observations: list[Observation],
    traces_by_id: dict[str, Trace],
    loaded_at: str,
) -> list[DailyTokenUsageRow]:
    """Aggregate lists of traces and observations into token usage rows."""
    buckets: dict[BucketKey, dict] = {}

    for observation in observations:
        trace = traces_by_id.get(observation["trace_id"])
        if trace is None:
            raise ValueError(
                f"Missing trace {observation['trace_id']} for observation {observation['id']}"
            )

        service_owner_code = trace["user_id"]
        if not service_owner_code:
            raise ValueError(f"Missing service owner code for {trace['id']}")

        app_name = _get_app_name(trace)
        observation_date = _to_date_string(observation["start_time"])
        bucket_key = BucketKey(service_owner_code, app_name, observation_date)

        bucket = buckets.setdefault(
            bucket_key,
            {
                "date": observation_date,
                "service_owner_code": service_owner_code,
                "app_name": app_name,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "tokens_by_model": {},
            },
        )

        usage = observation["usage"]
        bucket["input_tokens"] += _usage_value(usage, "input")
        bucket["output_tokens"] += _usage_value(usage, "output")
        bucket["total_tokens"] += _usage_value(usage, "total")

        model = observation["model"]
        if not model:
            log.warning(
                "Missing model for observation on trace %s — bucketing under '%s'",
                observation["trace_id"],
                UNKNOWN,
            )
            model = UNKNOWN

        model_tokens = bucket["tokens_by_model"].setdefault(model, {})
        for usage_key, usage_value in (observation["usage_details"] or {}).items():
            model_tokens[usage_key] = model_tokens.get(usage_key, 0) + usage_value

    langfuse_host = get_config().LANGFUSE_HOST
    return [
        _to_usage_row(bucket, loaded_at, langfuse_host) for bucket in buckets.values()
    ]


def _get_app_name(trace: Trace) -> str:
    metadata = trace["metadata"] or {}
    app_name = metadata.get("app_name")
    if not app_name:
        log.warning(
            "Missing metadata.app_name for trace %s — bucketing under '%s'",
            trace["id"],
            UNKNOWN,
        )
        return UNKNOWN
    return app_name


def _to_date_string(start_time: str) -> str:
    iso_date_length = len("YYYY-MM-DD")
    return start_time[:iso_date_length]


def _usage_value(usage: Any, key: str) -> int:
    if usage is None:
        return 0
    if isinstance(usage, dict):
        return usage.get(key) or 0
    return getattr(usage, key, 0) or 0


def _to_usage_row(
    bucket: dict, loaded_at: str, langfuse_host: str
) -> DailyTokenUsageRow:
    year, month, day = bucket["date"].split("-")
    return {
        "date": bucket["date"],
        "year": year,
        "month": month,
        "day": day,
        "serviceownerorgnr": None,
        "serviceownercode": bucket["service_owner_code"],
        "messagesender": bucket["service_owner_code"],
        "serviceresourceid": bucket["app_name"],
        "serviceresourcetitle": None,
        "recipienttype": None,
        "costcenter": None,
        "messagecount": None,
        "instancecount": None,
        "databasestoragebytes": None,
        "attachmentstoragebytes": None,
        "loaded_at": loaded_at,
        "source_file": langfuse_host,
        "input_tokens": bucket["input_tokens"],
        "output_tokens": bucket["output_tokens"],
        "total_tokens": bucket["total_tokens"],
        "tokens_by_model": bucket["tokens_by_model"],
    }
