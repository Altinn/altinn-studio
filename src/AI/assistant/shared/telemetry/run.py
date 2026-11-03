"""Telemetry for agent runs and the model calls in them.

A run is one agent workflow. It starts in a trace of its own when POST /api/agent/start returns, with a link back to
that request, and its span is the run's wide event: the code in the run adds to the current run, and the span gets
the totals when the run ends.
"""

import asyncio
import time
from collections.abc import Iterator
from contextlib import ExitStack, contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from types import TracebackType

from opentelemetry import metrics, trace
from opentelemetry.context import Context
from opentelemetry.trace import Link, SpanKind, Status, StatusCode
from opentelemetry.util.types import AttributeValue

from shared.utils.logging_utils import describe_error

from . import names
from .isolation import attached, new_service_context, service_context

_tracer = trace.get_tracer(names.SCOPE)
_meter = metrics.get_meter(names.SCOPE)

_run_duration = _meter.create_histogram(
    names.RUN_DURATION,
    unit="s",
    description="Duration of agent runs.",
    explicit_bucket_boundaries_advisory=[1, 2.5, 5, 10, 20, 30, 60, 120, 300, 600, 1200, 1800],
)
# The boundaries are the ones the GenAI semantic conventions give.
_model_duration = _meter.create_histogram(
    names.GEN_AI_CLIENT_OPERATION_DURATION,
    unit="s",
    description="GenAI operation duration.",
    explicit_bucket_boundaries_advisory=[
        0.01, 0.02, 0.04, 0.08, 0.16, 0.32, 0.64, 1.28, 2.56, 5.12, 10.24, 20.48, 40.96, 81.92,
    ],
)  # fmt: skip
_token_usage = _meter.create_histogram(
    names.GEN_AI_CLIENT_TOKEN_USAGE,
    unit="{token}",
    description="Number of input and output tokens used.",
    explicit_bucket_boundaries_advisory=[
        1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864,
    ],
)  # fmt: skip

# An error.type for a run that failed for no reason the code knows, as the semantic conventions name it.
_OTHER_ERROR = "_OTHER"


@dataclass
class ModelCall:
    """What one model call returned, for its span and metrics."""

    response_model: str | None = None
    finish_reason: str | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0

    def record_usage(
        self,
        *,
        input_tokens: int,
        output_tokens: int,
        cache_read_input_tokens: int = 0,
        cache_creation_input_tokens: int = 0,
    ) -> None:
        """input_tokens counts every input token, including those read from or written to the cache."""
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.cache_read_input_tokens = cache_read_input_tokens
        self.cache_creation_input_tokens = cache_creation_input_tokens


@dataclass
class AgentRun:
    """One run's span and what the run did. Enter it in the task that runs the agent."""

    span: trace.Span
    mode: str
    started: float = field(default_factory=time.perf_counter)
    outcome: str | None = None
    error_type: str | None = None
    changed_files: int | None = None
    loop_termination: str | None = None
    turns: int = 0
    models: set[str] = field(default_factory=set)
    model_calls: int = 0
    model_seconds: float = 0.0
    last_model_error_type: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_input_tokens: int = 0
    cache_creation_input_tokens: int = 0
    tools: set[str] = field(default_factory=set)
    tool_calls: int = 0
    tool_errors: int = 0
    phase_seconds: dict[str, float] = field(default_factory=dict)
    _scope: ExitStack = field(default_factory=ExitStack, repr=False)

    def __enter__(self) -> AgentRun:
        self._scope.enter_context(attached(new_service_context(self.span)))
        self._scope.callback(_current_run.reset, _current_run.set(self))
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        with self._scope:
            if exc is not None and self.outcome is None:
                if isinstance(exc, asyncio.CancelledError):
                    self.set_outcome(names.RUN_OUTCOME_CANCELLED)
                else:
                    self.set_error(type(exc).__name__)
            self._end()

    def set_outcome(self, outcome: str) -> None:
        self.outcome = outcome

    def set_error(self, error_type: str) -> None:
        """Mark the run as failed. error_type is a low-cardinality value, such as the exception's type."""
        self.outcome = names.RUN_OUTCOME_ERROR
        self.error_type = error_type

    def set_changed_files(self, count: int) -> None:
        self.changed_files = count

    def _end(self) -> None:
        if self.outcome in (names.RUN_OUTCOME_COMPLETED, names.RUN_OUTCOME_FAILED) and self.loop_termination == "error":
            # The agentic loop stops on a model call that raised, or on output that never fit the budget.
            self.set_error(self.last_model_error_type or "agentic_loop")
        if self.outcome is None:
            self.set_error(_OTHER_ERROR)
        outcome = self.outcome or names.RUN_OUTCOME_ERROR

        attributes: dict[str, AttributeValue] = {
            names.RUN_OUTCOME: outcome,
            names.RUN_TURNS: self.turns,
            names.RUN_MODELS: sorted(self.models),
            names.RUN_MODEL_CALLS: self.model_calls,
            names.RUN_MODEL_DURATION: self.model_seconds,
            names.RUN_TOOLS: sorted(self.tools),
            names.RUN_TOOL_CALLS: self.tool_calls,
            names.RUN_TOOL_ERRORS: self.tool_errors,
            names.GEN_AI_USAGE_INPUT_TOKENS: self.input_tokens,
            names.GEN_AI_USAGE_OUTPUT_TOKENS: self.output_tokens,
            names.GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS: self.cache_read_input_tokens,
            names.GEN_AI_USAGE_CACHE_CREATION_INPUT_TOKENS: self.cache_creation_input_tokens,
        }
        for phase, seconds in self.phase_seconds.items():
            attributes[names.run_phase_duration(phase)] = seconds
        if self.loop_termination is not None:
            attributes[names.RUN_LOOP_TERMINATION] = self.loop_termination
        if self.changed_files is not None:
            attributes[names.RUN_CHANGED_FILES] = self.changed_files

        metric_attributes: dict[str, AttributeValue] = {
            names.RUN_MODE: self.mode,
            names.RUN_OUTCOME: outcome,
        }
        if self.error_type is not None:
            attributes[names.ERROR_TYPE] = self.error_type
            metric_attributes[names.ERROR_TYPE] = self.error_type
            self.span.set_status(Status(StatusCode.ERROR, self.error_type))

        self.span.set_attributes(attributes)
        self.span.end()
        _run_duration.record(time.perf_counter() - self.started, metric_attributes)


_current_run: ContextVar[AgentRun | None] = ContextVar("altinn_assistant_run", default=None)


def _correlation_keys(*, repo_owner: str, developer: str, app: str, conversation_id: str) -> dict[str, AttributeValue]:
    keys: dict[str, AttributeValue] = {names.APP: app, names.GEN_AI_CONVERSATION_ID: conversation_id}
    # The developer's own repository has the developer's username as its owner, and no service owner.
    if repo_owner != developer:
        keys[names.SERVICE_OWNER] = repo_owner
    return keys


def annotate_agent_start(*, repo_owner: str, developer: str, app: str, conversation_id: str) -> None:
    """Put the run's correlation keys on the request that starts it, and keep that request's trace.

    The run's trace links to the request's, and the sampler decides each trace on its own.
    """
    span = trace.get_current_span(service_context())
    span.set_attributes(
        {
            **_correlation_keys(repo_owner=repo_owner, developer=developer, app=app, conversation_id=conversation_id),
            names.SAMPLING: names.SAMPLING_ALWAYS,
        }
    )


def start_run(
    *, repo_owner: str, developer: str, app: str, conversation_id: str, mode: str, attachments: int
) -> AgentRun:
    """Start a run's span in a trace of its own, linked to the current request."""
    request = trace.get_current_span(service_context()).get_span_context()
    span = _tracer.start_span(
        names.RUN_SPAN,
        context=Context(),
        kind=SpanKind.INTERNAL,
        attributes={
            **_correlation_keys(repo_owner=repo_owner, developer=developer, app=app, conversation_id=conversation_id),
            names.RUN_MODE: mode,
            names.RUN_ATTACHMENTS: attachments,
        },
        links=[Link(request)] if request.is_valid else None,
    )
    return AgentRun(span=span, mode=mode)


@contextmanager
def run_phase(phase: str) -> Iterator[None]:
    """Add the time the block takes to the current run's phase, such as `gate` or `agentic_loop`."""
    run = _current_run.get()
    started = time.perf_counter()
    try:
        yield
    finally:
        if run is not None:
            run.phase_seconds[phase] = run.phase_seconds.get(phase, 0.0) + time.perf_counter() - started


def record_tool_call(name: str, *, is_error: bool) -> None:
    run = _current_run.get()
    if run is None:
        return
    run.tools.add(name)
    run.tool_calls += 1
    if is_error:
        run.tool_errors += 1


def record_loop_result(termination: str, turns: int) -> None:
    """Add one pass of the agentic loop to the current run. A later pass, such as a repair round, decides the end."""
    run = _current_run.get()
    if run is None:
        return
    run.loop_termination = termination
    run.turns += turns


@contextmanager
def model_call(*, provider: str, model: str | None) -> Iterator[ModelCall]:
    """A span and the GenAI metrics for one chat call to a model, added to the current run.

    The span carries no prompts or output. Those stay in Langfuse.
    """
    attributes: dict[str, AttributeValue] = {
        names.GEN_AI_OPERATION_NAME: names.GEN_AI_OPERATION_CHAT,
        names.GEN_AI_PROVIDER_NAME: provider,
    }
    if model:
        attributes[names.GEN_AI_REQUEST_MODEL] = model
    call = ModelCall()
    error_type: str | None = None
    started = time.perf_counter()
    with _tracer.start_as_current_span(
        f"{names.GEN_AI_OPERATION_CHAT} {model}" if model else names.GEN_AI_OPERATION_CHAT,
        kind=SpanKind.CLIENT,
        attributes=attributes,
        record_exception=False,
        set_status_on_exception=False,
    ) as span:
        try:
            yield call
        except Exception as exc:
            error_type = type(exc).__name__
            span.set_attribute(names.ERROR_TYPE, error_type)
            span.set_status(Status(StatusCode.ERROR, describe_error(exc)))
            raise
        finally:
            _end_model_call(span, call, attributes, model, time.perf_counter() - started, error_type)


def _end_model_call(
    span: trace.Span,
    call: ModelCall,
    attributes: dict[str, AttributeValue],
    model: str | None,
    seconds: float,
    error_type: str | None,
) -> None:
    duration_attributes = dict(attributes)
    if error_type is not None:
        duration_attributes[names.ERROR_TYPE] = error_type
    _model_duration.record(seconds, duration_attributes)

    if call.response_model:
        span.set_attribute(names.GEN_AI_RESPONSE_MODEL, call.response_model)
    if call.finish_reason:
        span.set_attribute(names.GEN_AI_RESPONSE_FINISH_REASONS, [call.finish_reason])
    if call.input_tokens is not None and call.output_tokens is not None:
        span.set_attributes(
            {
                names.GEN_AI_USAGE_INPUT_TOKENS: call.input_tokens,
                names.GEN_AI_USAGE_OUTPUT_TOKENS: call.output_tokens,
                names.GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS: call.cache_read_input_tokens,
                names.GEN_AI_USAGE_CACHE_CREATION_INPUT_TOKENS: call.cache_creation_input_tokens,
            }
        )
        _token_usage.record(call.input_tokens, {**attributes, names.GEN_AI_TOKEN_TYPE: names.GEN_AI_TOKEN_TYPE_INPUT})
        _token_usage.record(call.output_tokens, {**attributes, names.GEN_AI_TOKEN_TYPE: names.GEN_AI_TOKEN_TYPE_OUTPUT})

    run = _current_run.get()
    if run is None:
        return
    if model:
        run.models.add(model)
    run.model_calls += 1
    run.model_seconds += seconds
    if error_type is not None:
        run.last_model_error_type = error_type
    run.input_tokens += call.input_tokens or 0
    run.output_tokens += call.output_tokens or 0
    run.cache_read_input_tokens += call.cache_read_input_tokens
    run.cache_creation_input_tokens += call.cache_creation_input_tokens
