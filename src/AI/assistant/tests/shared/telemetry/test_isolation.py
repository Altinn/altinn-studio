"""The service's spans and Langfuse's stay in separate traces, however they nest."""

from unittest.mock import patch

from langfuse import Langfuse
from langfuse._client.constants import LANGFUSE_TRACER_NAME as LANGFUSE_OWN_TRACER_NAME
from opentelemetry import trace

from shared.telemetry import langfuse_context, service_context
from shared.telemetry.isolation import LANGFUSE_TRACER_NAME
from shared.utils.langfuse_utils import get_current_trace_id


def _by_name(spans) -> dict:
    return {span.name: span for span in spans}


def test_the_tracer_name_is_the_one_langfuse_uses():
    assert LANGFUSE_TRACER_NAME == LANGFUSE_OWN_TRACER_NAME


def test_a_langfuse_span_inside_a_service_span_starts_its_own_trace(
    service_tracer, langfuse_tracer, service_spans, langfuse_spans
):
    with (
        service_tracer.start_as_current_span("service.request"),
        langfuse_tracer.start_as_current_span("langfuse.root"),
    ):
        pass

    request = _by_name(service_spans.get_finished_spans())["service.request"]
    root = _by_name(langfuse_spans.get_finished_spans())["langfuse.root"]
    assert root.parent is None
    assert root.context.trace_id != request.context.trace_id


def test_a_service_span_inside_a_langfuse_span_takes_the_service_parent(
    service_tracer, langfuse_tracer, service_spans, langfuse_spans
):
    with (
        service_tracer.start_as_current_span("service.run"),
        langfuse_tracer.start_as_current_span("langfuse.root"),
        langfuse_tracer.start_as_current_span("langfuse.generation"),
        service_tracer.start_as_current_span("service.call"),
    ):
        pass

    service = _by_name(service_spans.get_finished_spans())
    langfuse = _by_name(langfuse_spans.get_finished_spans())
    assert service["service.call"].parent.span_id == service["service.run"].context.span_id
    assert service["service.call"].context.trace_id == service["service.run"].context.trace_id
    assert langfuse["langfuse.generation"].parent.span_id == langfuse["langfuse.root"].context.span_id


def test_a_langfuse_span_inside_a_service_span_inside_langfuse_keeps_the_langfuse_parent(
    service_tracer, langfuse_tracer, service_spans, langfuse_spans
):
    with (
        langfuse_tracer.start_as_current_span("langfuse.root"),
        service_tracer.start_as_current_span("service.call"),
        langfuse_tracer.start_as_current_span("langfuse.child"),
    ):
        pass

    langfuse = _by_name(langfuse_spans.get_finished_spans())
    assert langfuse["langfuse.child"].parent.span_id == langfuse["langfuse.root"].context.span_id


def test_a_service_span_inside_only_langfuse_spans_is_a_root(service_tracer, langfuse_tracer, service_spans):
    with langfuse_tracer.start_as_current_span("langfuse.root"), service_tracer.start_as_current_span("service.call"):
        pass

    (call,) = service_spans.get_finished_spans()
    assert call.parent is None


def test_the_contexts_name_each_sides_current_span(service_tracer, langfuse_tracer):
    with (
        service_tracer.start_as_current_span("service.run") as run,
        langfuse_tracer.start_as_current_span("langfuse.root") as root,
    ):
        assert trace.get_current_span(service_context()) is run
        assert trace.get_current_span(langfuse_context()) is root
        with service_tracer.start_as_current_span("service.call") as call:
            assert trace.get_current_span(service_context()) is call
            assert trace.get_current_span(langfuse_context()) is root


def test_langfuse_observations_in_a_request_keep_their_own_trace(service_tracer, langfuse_provider, langfuse_spans):
    client = Langfuse(
        public_key="pk-lf-isolation-test",
        secret_key="sk-lf-isolation-test",
        host="http://127.0.0.1:9",
        tracer_provider=langfuse_provider,
    )
    with (
        patch("shared.utils.langfuse_utils.is_langfuse_enabled", return_value=True),
        patch("shared.utils.langfuse_utils.get_client", return_value=client),
        service_tracer.start_as_current_span("POST /api/agent/start"),
        client.start_as_current_observation(as_type="span", name="Altinity Agent Workflow"),
        client.start_as_current_observation(as_type="generation", name="llm_call_default"),
        service_tracer.start_as_current_span("chat model-a"),
    ):
        # The frontend sends feedback on this ID, so it has to be Langfuse's.
        trace_id = get_current_trace_id()
    client.shutdown()

    observations = {span.name: span for span in langfuse_spans.get_finished_spans()}
    assert observations["Altinity Agent Workflow"].parent is None
    assert observations["llm_call_default"].parent.span_id == observations["Altinity Agent Workflow"].context.span_id
    assert set(observations) == {"Altinity Agent Workflow", "llm_call_default"}
    assert trace_id == format(observations["Altinity Agent Workflow"].context.trace_id, "032x")
