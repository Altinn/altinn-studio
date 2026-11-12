from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from shared.utils import langfuse_utils
from shared.utils.langfuse_utils import (
    _PropagatedAttributesProcessor,
    delete_score,
    get_trace_developer,
    propagate_span_attributes,
)


def _client_with_root(*rows):
    client = MagicMock()
    client.api.observations.get_many.return_value = SimpleNamespace(data=list(rows))
    return client


class TestGetTraceDeveloper:
    def test_reads_the_developer_from_the_root_observation(self):
        client = _client_with_root(SimpleNamespace(metadata={"developer": "ola"}))
        with patch.object(langfuse_utils, "get_langfuse_client", return_value=client):
            assert get_trace_developer("trace-1") == "ola"

        kwargs = client.api.observations.get_many.call_args.kwargs
        assert kwargs["trace_id"] == "trace-1"
        assert kwargs["is_root_observation"] is True
        assert "metadata" in kwargs["fields"].split(",")

    def test_a_trace_without_a_root_observation_has_no_developer(self):
        with patch.object(langfuse_utils, "get_langfuse_client", return_value=_client_with_root()):
            assert get_trace_developer("trace-1") is None

    def test_a_failed_lookup_has_no_developer(self):
        client = MagicMock()
        client.api.observations.get_many.side_effect = RuntimeError("unavailable")
        with patch.object(langfuse_utils, "get_langfuse_client", return_value=client):
            assert get_trace_developer("trace-1") is None


class TestDeleteScore:
    def test_deletes_through_the_scores_api(self):
        client = MagicMock()
        with (
            patch.object(langfuse_utils, "get_langfuse_client", return_value=client),
            patch.object(langfuse_utils, "config", SimpleNamespace(LANGFUSE_ENABLED=True)),
        ):
            delete_score("trace-1:user_feedback")

        client.api.scores.delete.assert_called_once_with("trace-1:user_feedback")


class TestPropagateSpanAttributes:
    def _tracer(self):
        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(_PropagatedAttributesProcessor())
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        return provider.get_tracer("test"), exporter

    def test_every_span_started_inside_the_block_gets_the_attributes(self):
        tracer, exporter = self._tracer()
        with (
            tracer.start_as_current_span("root"),
            propagate_span_attributes({"k": "v"}),
            tracer.start_as_current_span("child"),
            tracer.start_as_current_span("grandchild"),
        ):
            pass

        spans = {span.name: span.attributes or {} for span in exporter.get_finished_spans()}
        assert spans["child"]["k"] == "v"
        assert spans["grandchild"]["k"] == "v"
        assert "k" not in spans["root"], "the root started before the block"

    def test_spans_after_the_block_do_not_get_them(self):
        tracer, exporter = self._tracer()
        with propagate_span_attributes({"k": "v"}):
            pass
        with tracer.start_as_current_span("after"):
            pass

        assert "k" not in (exporter.get_finished_spans()[0].attributes or {})
