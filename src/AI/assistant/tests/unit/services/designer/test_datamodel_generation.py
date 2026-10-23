"""What the agent sends to Designer's data model generation, and how it reads the answer."""

from __future__ import annotations

import json

import httpx
import pytest

from agents.services.designer import (
    DatamodelGenerationError,
    DatamodelGenerationRequest,
    GeneratedDatamodel,
    datamodel_generation,
    generate_datamodel,
)

API_KEY = "test-api-key"
GENERATED_RESPONSE = {
    "jsonSchema": "{}",
    "csharpClasses": "public class model {}",
    "xsd": "<xs:schema/>",
    "applicationMetadata": '{"dataTypes": []}',
}
REQUEST = DatamodelGenerationRequest(
    repo_owner="ttd",
    app_name="my-app",
    model_name="model",
    schema={"type": "object"},
    application_metadata={"dataTypes": []},
    use_nullable_reference_types=True,
    is_v9_or_newer=False,
)


@pytest.fixture(autouse=True)
def designer_base_url(monkeypatch):
    monkeypatch.setattr(datamodel_generation.config, "DESIGNER_BASE_URL", "http://designer.test/")


async def test_posts_the_request_to_the_apps_generate_endpoint_with_the_api_key():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=GENERATED_RESPONSE)

    await generate_datamodel(REQUEST, API_KEY, transport=httpx.MockTransport(handler))

    [request] = requests
    assert str(request.url) == "http://designer.test/designer/api/ttd/my-app/datamodels/datamodel/generate"
    assert request.headers["X-Api-Key"] == API_KEY
    assert json.loads(request.content) == {
        "modelName": "model",
        "schema": {"type": "object"},
        "applicationMetadata": {"dataTypes": []},
        "useNullableReferenceTypes": True,
        "isV9OrNewer": False,
    }


async def test_returns_the_generated_files():
    transport = httpx.MockTransport(lambda _: httpx.Response(200, json=GENERATED_RESPONSE))

    generated = await generate_datamodel(REQUEST, API_KEY, transport=transport)

    assert generated == GeneratedDatamodel(
        json_schema="{}",
        csharp_classes="public class model {}",
        xsd="<xs:schema/>",
        application_metadata='{"dataTypes": []}',
    )


async def test_reports_the_compiler_errors_of_a_schema_that_does_not_compile():
    problem = {
        "title": "CsharpCompilationException occurred.",
        "detail": "Failed to compile the generated C# classes.",
        "customErrorMessages": ["'root': member names cannot be the same as their enclosing type"],
    }
    transport = httpx.MockTransport(lambda _: httpx.Response(400, json=problem))

    with pytest.raises(DatamodelGenerationError) as error:
        await generate_datamodel(REQUEST, API_KEY, transport=transport)

    assert "HTTP 400" in str(error.value)
    assert "member names cannot be the same as their enclosing type" in str(error.value)


async def test_reports_a_refusal_without_problem_details():
    transport = httpx.MockTransport(lambda _: httpx.Response(403))

    with pytest.raises(DatamodelGenerationError, match="HTTP 403"):
        await generate_datamodel(REQUEST, API_KEY, transport=transport)


async def test_reports_that_designer_cannot_be_reached():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    with pytest.raises(DatamodelGenerationError, match="Could not reach Designer"):
        await generate_datamodel(REQUEST, API_KEY, transport=httpx.MockTransport(handler))


async def test_reports_an_answer_without_the_generated_files():
    transport = httpx.MockTransport(lambda _: httpx.Response(200, json={"jsonSchema": "{}"}))

    with pytest.raises(DatamodelGenerationError, match="unexpected response"):
        await generate_datamodel(REQUEST, API_KEY, transport=transport)
