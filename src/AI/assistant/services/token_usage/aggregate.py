"""Aggregate Langfuse traces and observations into a cost schema."""

from datetime import UTC, datetime
from typing import Any, TypedDict

from shared.config import get_config
from shared.utils.langfuse_utils import APP_NAME_METADATA_KEY, REPO_OWNER_METADATA_KEY
from shared.utils.logging_utils import get_logger

log = get_logger(__name__)

UNKNOWN = "unknown"
LANGFUSE_ENVIRONMENT_PREFIX = "langfuse-"
INTERNAL_OWNER_CODE = "internal"


class DailyTokenUsageRow(TypedDict):
    date: str
    year: str
    month: str
    day: str
    serviceownerorgnr: str | None
    serviceownercode: str
    messagesender: str | None
    serviceresourceid: str | None
    serviceresourcetitle: str
    recipienttype: str | None
    costcenter: str | None
    messagecount: int | None
    instancecount: int | None
    databasestoragebytes: int | None
    attachmentstoragebytes: int | None
    loaded_at: str
    source: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    tokens_by_model: dict[str, dict[str, int]]


class Trace(TypedDict):
    id: str
    user_id: str
    environment: str
    metadata: dict[str, Any]


class Observation(TypedDict):
    id: str
    trace_id: str
    start_time: str
    model: str | None
    usage: dict[str, Any] | None
    usage_details: dict[str, Any]


def aggregate_token_usage(
    observations: list[Observation],
    traces_by_id: dict[str, Trace],
    loaded_at: str,
) -> list[DailyTokenUsageRow]:
    """Aggregate lists of traces and observations into token usage rows."""
    # A tuple keeps the parts apart. Owner and app names can contain the separator of a joined string.
    buckets: dict[tuple[str, str, str, str], dict] = {}

    for observation in observations:
        trace = traces_by_id.get(observation["trace_id"])
        if trace is None:
            log.warning(
                "Skipping observation %s — parent trace %s not found",
                observation["id"],
                observation["trace_id"],
            )
            continue

        service_owner_code = _get_service_owner_code(trace)
        repo_owner = _get_repo_owner(trace, service_owner_code)
        app_name = _get_app_name(trace)
        service_resource_id = _get_service_resource_id(service_owner_code, repo_owner, app_name)
        observation_date = _to_date_string(observation["start_time"])
        bucket_key = (service_owner_code, repo_owner, app_name, observation_date)

        bucket = buckets.setdefault(
            bucket_key,
            {
                "date": observation_date,
                "service_owner_code": service_owner_code,
                "app_name": app_name,
                "repo_owner": repo_owner,
                "service_resource_id": service_resource_id,
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
    return [_to_usage_row(bucket, loaded_at, langfuse_host) for bucket in buckets.values()]


def _is_langfuse_internal(trace: Trace) -> bool:
    return not trace["user_id"] and trace["environment"].startswith(LANGFUSE_ENVIRONMENT_PREFIX)


def _get_service_owner_code(trace: Trace) -> str:
    service_owner_code = trace["user_id"]
    if service_owner_code:
        return service_owner_code
    if _is_langfuse_internal(trace):
        return INTERNAL_OWNER_CODE
    log.warning(
        "Missing service owner code for trace %s — bucketing under '%s'",
        trace["id"],
        UNKNOWN,
    )
    return UNKNOWN


def _get_repo_owner(trace: Trace, service_owner_code: str) -> str:
    """Get the owner of the repository that the assistant worked in.

    The owner is different from the service owner when the developer owns the repository.
    A trace from before Designer sent `repo_owner` does not have this value. Then the owner is the service owner.
    """
    metadata = trace["metadata"] or {}
    return metadata.get(REPO_OWNER_METADATA_KEY) or service_owner_code


def _get_app_name(trace: Trace) -> str:
    if _is_langfuse_internal(trace):
        return trace["environment"]

    metadata = trace["metadata"] or {}
    app_name = metadata.get(APP_NAME_METADATA_KEY)
    if not app_name:
        log.warning(
            "Missing metadata.app_name for trace %s — bucketing under '%s'",
            trace["id"],
            UNKNOWN,
        )
        return UNKNOWN
    return app_name


def _get_service_resource_id(service_owner_code: str, repo_owner: str, app_name: str) -> str | None:
    # A repository that a developer owns does not have a service resource for the service owner.
    if service_owner_code == INTERNAL_OWNER_CODE or repo_owner != service_owner_code:
        return None
    rr_app_prefix = "app"
    return f"{rr_app_prefix}_{service_owner_code}_{app_name}"


def _to_date_string(start_time: str) -> str:
    return datetime.fromisoformat(start_time).astimezone(UTC).strftime("%Y-%m-%d")


def _usage_value(usage: dict[str, Any] | None, key: str) -> int:
    if usage is None:
        return 0
    return usage.get(key) or 0


def _get_service_resource_title(bucket: dict) -> str:
    if bucket["repo_owner"] == bucket["service_owner_code"]:
        return bucket["app_name"]
    return f"{bucket['repo_owner']}/{bucket['app_name']}"


def _to_usage_row(bucket: dict, loaded_at: str, langfuse_host: str) -> DailyTokenUsageRow:
    year, month, day = bucket["date"].split("-")
    return {
        "date": bucket["date"],
        "year": year,
        "month": month,
        "day": day,
        "serviceownerorgnr": None,
        "serviceownercode": bucket["service_owner_code"],
        "messagesender": None,
        "serviceresourceid": bucket["service_resource_id"],
        "serviceresourcetitle": _get_service_resource_title(bucket),
        "recipienttype": None,
        "costcenter": None,
        "messagecount": None,
        "instancecount": None,
        "databasestoragebytes": None,
        "attachmentstoragebytes": None,
        "loaded_at": loaded_at,
        "source": langfuse_host,
        "input_tokens": bucket["input_tokens"],
        "output_tokens": bucket["output_tokens"],
        "total_tokens": bucket["total_tokens"],
        "tokens_by_model": bucket["tokens_by_model"],
    }
