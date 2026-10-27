using System.Diagnostics;
using System.Text.Json;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Orchestration;
using Altinn.App.Ai.Enrichment.Telemetry;
using Altinn.App.Ai.Enrichment.Tests.Helpers;
using Altinn.App.Ai.Enrichment.Tests.Unit.Orchestration;
using Altinn.App.Ai.Enrichment.Tools;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Telemetry;

/// <summary>
/// Verifies the span tree the orchestrator produces — the shape an operator
/// actually navigates in Langfuse — rather than the export mechanics.
/// </summary>
[Collection(ActivityListenerCollection.Name)]
public class EnrichmentTraceShapeTests
{
    private const string Model = "test:model";

    [Fact]
    public async Task RunAsync_OneRuleNoTools_EmitsItemSpanWithOneGeneration()
    {
        using var spans = new RecordedSpans();
        var chat = new StubChatService([Final("vurdert_ok", "Alt i orden")]);

        await Orchestrator(chat).RunAsync(App(), [Rule("formalia.ansvarlig")], new OrchestratorOptions());

        var item = spans.Single("rule:formalia.ansvarlig");
        RecordedSpans.Tag(item, "langfuse.observation.type").Should().Be("span");
        RecordedSpans.Metadata(item, "rule_key").Should().Be("formalia.ansvarlig");
        RecordedSpans.Metadata(item, "verdict_status").Should().Be("vurdert_ok");
        item.Status.Should().Be(ActivityStatusCode.Unset);

        var generations = spans.ChildrenOf(item);
        generations.Should().HaveCount(1);
        RecordedSpans.Tag(generations[0], "langfuse.observation.type").Should().Be("generation");
        RecordedSpans.Tag(generations[0], "langfuse.observation.model.name").Should().Be(Model);
    }

    /// <summary>
    /// The headline question this whole feature exists to answer: did a given model
    /// response cause a tool call? A generation carrying tool_names, followed by tool
    /// spans, is what makes that readable.
    /// </summary>
    [Fact]
    public async Task RunAsync_ToolCallThenAnswer_LinksGenerationToItsToolSpans()
    {
        using var spans = new RecordedSpans();
        var chat = new StubChatService([
            ToolCall("current_date", "call-1"),
            Final("vurdert_ok", "OK"),
        ]);

        await Orchestrator(chat).RunAsync(App(), [Rule("frist.klagefrist")], new OrchestratorOptions());

        var item = spans.Single("rule:frist.klagefrist");
        var children = spans.ChildrenOf(item);

        children.Should().HaveCount(3, "two generations plus the tool call between them");

        var first = children.Single(c => RecordedSpans.Metadata(c, "iteration") == "0");
        RecordedSpans.Metadata(first, "finish_reason").Should().Be("tool_calls");
        RecordedSpans.Metadata(first, "tool_names").Should().Be("current_date");
        RecordedSpans.Metadata(first, "tool_call_count").Should().Be("1");

        var tool = spans.Single("tool:current_date");
        RecordedSpans.Tag(tool, "langfuse.observation.type").Should().Be("tool");
        RecordedSpans.Metadata(tool, "tool_call_id").Should().Be("call-1");
        RecordedSpans.Tag(tool, "langfuse.observation.output").Should().NotBeNullOrEmpty();

        var second = children.Single(c => RecordedSpans.Metadata(c, "iteration") == "1");
        RecordedSpans.Metadata(second, "tool_names").Should().BeNull("the final answer requested no tools");
    }

    /// <summary>
    /// Items are evaluated concurrently. Nesting survives only because
    /// <c>Activity.Current</c> travels with the execution context into each fanned-out
    /// task; if that ever stops holding, the tree collapses into a flat list and this
    /// test is what catches it.
    /// </summary>
    [Fact]
    public async Task RunAsync_ConcurrentRules_EachGenerationParentsToItsOwnItemSpan()
    {
        using var spans = new RecordedSpans();
        var chat = new StubChatService(_ => Task.FromResult(Final("vurdert_ok", "OK")), delayMs: 40);

        using var parent = EnrichmentActivitySource.Source.StartActivity("step:under-test");

        await Orchestrator(chat).RunAsync(
            App(),
            [Rule("a.one"), Rule("b.two"), Rule("c.three")],
            new OrchestratorOptions { Concurrency = 3 });

        parent.Should().NotBeNull();
        var items = spans.OfType("span").Where(a => a.OperationName.StartsWith("rule:", StringComparison.Ordinal)).ToList();
        items.Should().HaveCount(3);
        items.Select(i => i.SpanId).Distinct().Should().HaveCount(3);
        items.Should().AllSatisfy(i => i.ParentSpanId.Should().Be(parent!.SpanId));

        foreach (var item in items)
        {
            var generations = spans.ChildrenOf(item);
            generations.Should().HaveCount(1, "each item runs its own single-turn conversation");
        }
    }

    [Fact]
    public async Task RunAsync_ChatTransportError_MarksGenerationAndItemAsError()
    {
        using var spans = new RecordedSpans();
        var chat = new StubChatService([
            new ChatResponse { StatusCode = 0, Error = "Transport: timeout after 300s" },
        ]);

        await Orchestrator(chat).RunAsync(App(), [Rule("x.y")], new OrchestratorOptions());

        var generation = spans.OfType("generation").Single();
        generation.Status.Should().Be(ActivityStatusCode.Error);
        generation.StatusDescription.Should().Contain("timeout");
        RecordedSpans.Metadata(generation, "usage_source").Should().Be("absent");

        var item = spans.Single("rule:x.y");
        item.Status.Should().Be(ActivityStatusCode.Error, "an unevaluated item is what an operator filters for");
        RecordedSpans.Metadata(item, "verdict_status").Should().Be("ikke_vurdert");
    }

    [Fact]
    public async Task RunAsync_UnknownTool_MarksToolSpanAsError()
    {
        using var spans = new RecordedSpans();
        var chat = new StubChatService([
            ToolCall("no_such_tool", "call-9"),
            Final("vurdert_ok", "OK"),
        ]);

        await Orchestrator(chat).RunAsync(App(), [Rule("x.y")], new OrchestratorOptions());

        // Dispatch never throws; it reports failure inside the result JSON, so the span
        // has to read the payload to know anything went wrong.
        var tool = spans.Single("tool:no_such_tool");
        tool.Status.Should().Be(ActivityStatusCode.Error);
        tool.StatusDescription.Should().Contain("Unknown tool");
    }

    [Fact]
    public async Task RunAsync_GatewayReportsUsage_WritesFlattenedUsageDetails()
    {
        using var spans = new RecordedSpans();
        var chat = new StubChatService([
            Final("vurdert_ok", "OK") with
            {
                Model = "model-as-rewritten-by-gateway",
                Usage = Usage("""
                    {"prompt_tokens":21,"completion_tokens":2,"total_tokens":23,
                     "completion_tokens_details":{"reasoning_tokens":7}}
                    """),
            },
        ]);

        await Orchestrator(chat).RunAsync(App(), [Rule("x.y")], new OrchestratorOptions());

        var generation = spans.OfType("generation").Single();
        RecordedSpans.Metadata(generation, "usage_source").Should().Be("gateway");

        var usage = JsonDocument.Parse(RecordedSpans.Tag(generation, "langfuse.observation.usage_details")!).RootElement;
        usage.GetProperty("input").GetInt64().Should().Be(21);
        usage.GetProperty("output").GetInt64().Should().Be(2);
        usage.GetProperty("total").GetInt64().Should().Be(23);
        usage.GetProperty("reasoning_tokens").GetInt64().Should().Be(7);

        // The configured id is what Langfuse prices against; the gateway's answer is kept
        // alongside it so a silent substitution is visible rather than invisible.
        RecordedSpans.Tag(generation, "langfuse.observation.model.name").Should().Be(Model);
        RecordedSpans.Metadata(generation, "response_model").Should().Be("model-as-rewritten-by-gateway");
    }

    [Fact]
    public async Task RunAsync_WithoutListener_LeavesNoAmbientActivityAndStillProducesVerdicts()
    {
        // No RecordedSpans here on purpose: with nothing listening, StartActivity returns
        // null and every instrumentation site must degrade to a no-op.
        var chat = new StubChatService([Final("vurdert_ok", "OK")]);

        var result = await Orchestrator(chat).RunAsync(App(), [Rule("x.y")], new OrchestratorOptions());

        result.Verdicts["x.y"].Status.Should().Be("vurdert_ok");
        Activity.Current.Should().BeNull();
    }

    // --- helpers ------------------------------------------------------------------

    /// <summary>
    /// Langfuse resolves the environment per observation, not per trace. When only the
    /// root carried it, a run's own children were stored under "default" while the trace
    /// sat in the configured environment — so filtering an environment showed the run
    /// with none of its contents, and per-environment cost counted nothing.
    /// </summary>
    [Fact]
    public async Task RunAsync_WithEnvironmentConfigured_StampsEveryObservationNotJustTheRoot()
    {
        using var spans = new RecordedSpans();
        var chat = new StubChatService([
            ToolCall("current_date", "call-1"),
            Final("vurdert_ok", "OK"),
        ]);

        await Orchestrator(chat, environment: "local_test")
            .RunAsync(App(), [Rule("frist.klagefrist")], new OrchestratorOptions());

        spans.Stopped.Should().NotBeEmpty();
        spans.Stopped.Should().OnlyContain(
            span => RecordedSpans.Tag(span, "langfuse.environment") == "local_test",
            "every observation is filtered and costed by environment on its own");
    }

    private static EvaluationOrchestrator Orchestrator(IChatService chat, string? environment) =>
        new(
            chat,
            ToolRegistry.ForTesting(),
            new StubSystemPromptProvider(),
            Options.Create(new AgentOptions { Model = Model }),
            new EnrichmentTrace(Options.Create(new LangfuseOptions { Environment = environment })),
            NullLogger<EvaluationOrchestrator>.Instance);

    private static EvaluationOrchestrator Orchestrator(IChatService chat) =>
        new(
            chat,
            ToolRegistry.ForTesting(),
            new StubSystemPromptProvider(),
            Options.Create(new AgentOptions { Model = Model }),
            new EnrichmentTrace(Options.Create(new LangfuseOptions())),
            NullLogger<EvaluationOrchestrator>.Instance);

    private static JsonDocument App() => JsonDocument.Parse("""
        { "Innsender": { "Foedselsnummer": "01018012345" } }
        """);

    private static RuleEntry Rule(string key) => new()
    {
        Key = key,
        Markdown = $"# Rule for {key}\n\nVurder dette punktet.",
    };

    private static ChatResponse Final(string status, string merknad) => new()
    {
        Content = $$"""{"status":"{{status}}","merknad":"{{merknad}}"}""",
        FinishReason = "stop",
        StatusCode = 200,
    };

    private static ChatResponse ToolCall(string toolName, string id) => new()
    {
        Content = "",
        ToolCalls = [new ToolCall { Id = id, Name = toolName, ArgumentsRaw = "{}" }],
        FinishReason = "tool_calls",
        StatusCode = 200,
    };

    private static IReadOnlyDictionary<string, object?> Usage(string json) =>
        JsonDocument.Parse(json).RootElement.EnumerateObject()
            .ToDictionary(p => p.Name, p => (object?)p.Value.Clone(), StringComparer.Ordinal);
}
