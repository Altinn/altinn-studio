"""Aggregate Langfuse GENERATION observations into Studio cost-schema rows.

Pure function — no I/O. Bucketing key is `(service_owner_code, app_name, date)`
and tokens are summed both at the bucket level and per-model.
"""

from datetime import date, datetime
from typing import Any, TypedDict

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


def aggregate_token_usage(
    observations: list[Any],
    traces_by_id: dict[str, Any],
    loaded_at: str,
) -> list[DailyTokenUsageRow]:
    """Aggregate a flat list of generation observations into token usage rows.

    Args:
        observations: GENERATION observations from Langfuse (each must expose
            `id`, `trace_id`, `start_time`, `model`, `usage`, `usage_details`).
        traces_by_id: Traces keyed by id (each must expose `id`, `user_id`,
            `metadata`).
        loaded_at: ISO 8601 timestamp captured by the caller for the entire run.
    """
    buckets: dict[tuple[str, str, str], dict] = {}

    for observation in observations:
        trace = traces_by_id.get(observation.trace_id)
        if trace is None:
            raise ValueError(
                f"Missing trace {observation.trace_id} for observation {observation.id}"
            )

        service_owner_code = trace.user_id
        if not service_owner_code:
            raise ValueError(f"Missing service owner code for {trace.id}")

        app_name = _read_app_name(trace)
        observation_date = _to_date_string(observation.start_time)
        bucket_key = (service_owner_code, app_name, observation_date)

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

        usage = observation.usage
        bucket["input_tokens"] += _usage_value(usage, "input")
        bucket["output_tokens"] += _usage_value(usage, "output")
        bucket["total_tokens"] += _usage_value(usage, "total")

        model = observation.model
        if not model:
            log.warning(
                "Missing model for observation on trace %s — bucketing under '%s'",
                observation.trace_id,
                UNKNOWN,
            )
            model = UNKNOWN

        model_tokens = bucket["tokens_by_model"].setdefault(model, {})
        for usage_key, usage_value in (observation.usage_details or {}).items():
            model_tokens[usage_key] = model_tokens.get(usage_key, 0) + usage_value

    langfuse_host = get_config().LANGFUSE_HOST
    return [
        _to_usage_row(bucket, loaded_at, langfuse_host) for bucket in buckets.values()
    ]


def _read_app_name(trace: Any) -> str:
    metadata = trace.metadata or {}
    app_name = metadata.get("app_name")
    if not app_name:
        log.warning(
            "Missing metadata.app_name for trace %s — bucketing under '%s'",
            trace.id,
            UNKNOWN,
        )
        return UNKNOWN
    return app_name


def _to_date_string(start_time: Any) -> str:
    if isinstance(start_time, str):
        return start_time[:10]
    if isinstance(start_time, datetime):
        return start_time.date().isoformat()
    if isinstance(start_time, date):
        return start_time.isoformat()
    raise TypeError(f"Unsupported start_time type: {type(start_time)!r}")


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
