"""Generate the files of a data model with Designer.

Designer generates them the way "Generate model" in Studio does, from the
files in the request instead of from the developer's repository in Designer.
So the C# class, the XSD and the application metadata are the files that
Studio writes, and an app that builds in Studio also builds after the agent
changes its data model.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx

from shared.config import get_config

config = get_config()

API_KEY_HEADER = "X-Api-Key"
GENERATION_TIMEOUT_SECONDS = 60.0


@dataclass(frozen=True)
class DatamodelGenerationRequest:
    repo_owner: str
    app_name: str
    # The schema file name without `.schema.json`, which is also the id of the data type.
    model_name: str
    schema: Any
    application_metadata: dict[str, Any]
    use_nullable_reference_types: bool
    is_v9_or_newer: bool


@dataclass(frozen=True)
class GeneratedDatamodel:
    json_schema: str
    csharp_classes: str
    xsd: str
    application_metadata: str


class DatamodelGenerationError(Exception):
    """Designer did not generate the files. The message tells the model why."""


async def generate_datamodel(
    request: DatamodelGenerationRequest,
    api_key: str,
    transport: httpx.AsyncBaseTransport | None = None,
) -> GeneratedDatamodel:
    try:
        async with httpx.AsyncClient(timeout=GENERATION_TIMEOUT_SECONDS, transport=transport) as client:
            response = await client.post(
                _get_generation_url(request),
                json=_get_request_body(request),
                headers={API_KEY_HEADER: api_key},
            )
    except httpx.HTTPError as exc:
        raise DatamodelGenerationError(f"Could not reach Designer to generate the data model: {exc}") from exc

    if not response.is_success:
        raise DatamodelGenerationError(_describe_failure(response))
    return _read_generated_datamodel(response)


def _get_generation_url(request: DatamodelGenerationRequest) -> str:
    owner = quote(request.repo_owner, safe="")
    app = quote(request.app_name, safe="")
    return f"{config.DESIGNER_BASE_URL.rstrip('/')}/designer/api/{owner}/{app}/datamodels/datamodel/generate"


def _get_request_body(request: DatamodelGenerationRequest) -> dict[str, Any]:
    return {
        "modelName": request.model_name,
        "schema": request.schema,
        "applicationMetadata": request.application_metadata,
        "useNullableReferenceTypes": request.use_nullable_reference_types,
        "isV9OrNewer": request.is_v9_or_newer,
    }


def _describe_failure(response: httpx.Response) -> str:
    """Designer answers a schema it cannot convert with problem details, and compiler errors in `customErrorMessages`."""
    try:
        problem = response.json()
    except ValueError:
        problem = None
    if not isinstance(problem, dict):
        return f"Designer could not generate the data model (HTTP {response.status_code})."

    lines = [f"Designer could not generate the data model (HTTP {response.status_code}): {problem.get('title', '')}"]
    if problem.get("detail"):
        lines.append(str(problem["detail"]))
    lines.extend(str(message) for message in problem.get("customErrorMessages") or [])
    return "\n".join(lines)


def _read_generated_datamodel(response: httpx.Response) -> GeneratedDatamodel:
    try:
        body = response.json()
        return GeneratedDatamodel(
            json_schema=body["jsonSchema"],
            csharp_classes=body["csharpClasses"],
            xsd=body["xsd"],
            application_metadata=body["applicationMetadata"],
        )
    except (ValueError, KeyError, TypeError) as exc:
        raise DatamodelGenerationError(f"Designer answered with an unexpected response: {exc}") from exc
