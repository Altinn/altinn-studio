using System.Diagnostics;
using System.Text.Json;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Telemetry;

/// <summary>
/// Creates the spans the enrichment engine reports to Langfuse, and owns every
/// decision about what a span is named, typed and filled with. Keeping that in
/// one place means the domain classes call a handful of obvious methods instead
/// of spreading attribute-name knowledge across the pipeline.
///
/// Every method returns <c>null</c> when nothing is listening, and every method
/// swallows its own failures: an observability bug must not surface as a failed
/// process step. Callers wrap the result in <c>using</c> and are otherwise free
/// to ignore it.
/// </summary>
public sealed class EnrichmentTrace(IOptions<LangfuseOptions> options)
{
    private static readonly JsonSerializerOptions PayloadJson = new() { WriteIndented = false };

    /// <summary>A tracer that emits nothing, for tests and hosts that never configure Langfuse.</summary>
    public static EnrichmentTrace Disabled { get; } =
        new(Microsoft.Extensions.Options.Options.Create(new LangfuseOptions()));

    private LangfuseOptions Options => options.Value;

    private string? _projectId;

    /// <summary>
    /// Records the project the export is bound to, so runs can be linked to. Called once
    /// by the tracing host service when the provider is live; the id may only be known
    /// then, because the start-up preflight discovers it when it is not configured.
    /// </summary>
    internal void Activate(string? projectId) => _projectId = projectId;

    /// <summary>
    /// A link straight to this run in Langfuse, or null when tracing is off or the project
    /// is unknown. Logged once per run: it is how an operator gets from an app log line to
    /// the trace without searching by session id, and — when traces appear to be missing —
    /// it is the only signal that says whether a span was created at all.
    /// </summary>
    public string? DeepLink(Activity? activity)
    {
        if (activity is null || string.IsNullOrWhiteSpace(Options.Host) || string.IsNullOrWhiteSpace(_projectId))
            return null;

        return $"{Options.Host.TrimEnd('/')}/project/{_projectId}/traces/{activity.TraceId.ToHexString()}";
    }

    /// <summary>
    /// Starts the span representing one execution of the <c>ai</c> process task.
    ///
    /// The ambient parent is deliberately dropped unless the operator opts back in.
    /// Langfuse stores whatever parent span id arrives, and the ambient ASP.NET span
    /// is never exported to Langfuse, so an inherited parent leaves the run's root
    /// rendering as an orphan. The ambient ids are recorded as metadata instead,
    /// which keeps the Application Insights correlation without breaking the tree.
    /// </summary>
    public Activity? StartRun(string name, Activity? ambient)
    {
        try
        {
            var inheritAmbient = Options.InheritAmbientTrace;
            var activity = inheritAmbient
                ? EnrichmentActivitySource.Source.StartActivity(name, ActivityKind.Internal)
                : EnrichmentActivitySource.Source.StartActivity(
                    name,
                    ActivityKind.Internal,
                    parentContext: default,
                    links: ambient is null ? null : new[] { new ActivityLink(ambient.Context) });

            if (activity is null)
                return null;

            activity.SetTag(LangfuseAttributes.ObservationType, LangfuseAttributes.ObservationTypes.Agent);
            activity.SetTag(LangfuseAttributes.TraceName, name);

            if (inheritAmbient)
                activity.SetTag(LangfuseAttributes.AsRoot, "true");

            if (!string.IsNullOrWhiteSpace(Options.Environment))
                activity.SetTag(LangfuseAttributes.Environment, Options.Environment);
            if (!string.IsNullOrWhiteSpace(Options.Release))
                activity.SetTag(LangfuseAttributes.Release, Options.Release);

            if (ambient is not null)
            {
                TraceMetadata(activity, "correlation_trace_id", ambient.TraceId.ToHexString());
                TraceMetadata(activity, "correlation_span_id", ambient.SpanId.ToHexString());
            }

            return activity;
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>Sets the trace-level identity that groups and labels a run in Langfuse.</summary>
    public void DescribeRun(
        Activity? activity,
        string? sessionId,
        string? applicationJson,
        IReadOnlyDictionary<string, object?> metadata,
        IReadOnlyList<string> tags)
    {
        if (activity is null)
            return;
        try
        {
            if (!string.IsNullOrWhiteSpace(sessionId))
                activity.SetTag(LangfuseAttributes.SessionId, sessionId);

            if (tags.Count > 0)
                activity.SetTag(LangfuseAttributes.TraceTags, Json(tags));

            foreach (var (key, value) in metadata)
                TraceMetadata(activity, key, value);

            // The application document is captured once, at the root. Every item's user
            // prompt embeds it, so capturing it per generation would ship the same payload
            // a few hundred times for one submission.
            if (applicationJson is not null)
                activity.SetTag(LangfuseAttributes.TraceInput, Payload(applicationJson));
        }
        catch (Exception)
        {
            // ignored - tracing must not fail the run
        }
    }

    /// <summary>Records what the run produced, and marks a failed run as an error.</summary>
    public void CompleteRun(Activity? activity, string? output, Exception? error = null)
    {
        if (activity is null)
            return;
        try
        {
            if (output is not null)
                activity.SetTag(LangfuseAttributes.TraceOutput, Payload(output));
            if (error is not null)
                activity.SetStatus(ActivityStatusCode.Error, error.Message);
        }
        catch (Exception)
        {
            // ignored
        }
    }

    /// <summary>Starts the span for one pipeline step. A step's children are its items.</summary>
    public Activity? StartStep(string stepName, int stepIndex)
    {
        var activity = Start($"step:{stepName}", LangfuseAttributes.ObservationTypes.Chain);
        Metadata(activity, "step_name", stepName);
        Metadata(activity, "step_index", stepIndex);
        return activity;
    }

    /// <summary>
    /// Starts the span for one evaluated item. Items run concurrently; each gets its own
    /// span parented to the step, because <c>Activity.Current</c> flows with the execution
    /// context into every task the orchestrator fans out.
    /// </summary>
    public Activity? StartItem(string ruleKey, string? ruleMarkdown)
    {
        var activity = Start($"rule:{ruleKey}", LangfuseAttributes.ObservationTypes.Span);
        Metadata(activity, "rule_key", ruleKey);
        if (activity is not null && ruleMarkdown is not null)
            activity.SetTag(LangfuseAttributes.ObservationInput, Payload(ruleMarkdown));
        return activity;
    }

    /// <summary>Records the item's verdict and marks an unevaluated item as an error.</summary>
    public void CompleteItem(
        Activity? activity,
        string status,
        string? merknad,
        int llmCalls,
        int toolCalls,
        string? finishReason)
    {
        if (activity is null)
            return;
        try
        {
            activity.SetTag(LangfuseAttributes.ObservationOutput, Payload(Json(new { status, merknad })));
            Metadata(activity, "verdict_status", status);
            Metadata(activity, "llm_call_count", llmCalls);
            Metadata(activity, "tool_call_count", toolCalls);
            Metadata(activity, "finish_reason", finishReason);

            // "ikke_vurdert" means the engine could not reach a judgement - a transport
            // failure, an unparseable response, or an exhausted tool loop. Surfacing it as
            // an error is what makes Langfuse's error filter useful on this data.
            if (string.Equals(status, UnevaluatedStatus, StringComparison.Ordinal))
                activity.SetStatus(ActivityStatusCode.Error, merknad);
        }
        catch (Exception)
        {
            // ignored
        }
    }

    /// <summary>Starts the span for one chat-completions call.</summary>
    public Activity? StartGeneration(string model, int iteration, ChatRequest request)
    {
        var activity = Start($"llm:{model} #{iteration + 1}", LangfuseAttributes.ObservationTypes.Generation);
        if (activity is null)
            return null;
        try
        {
            activity.SetTag(LangfuseAttributes.ObservationModelName, model);
            activity.SetTag(LangfuseAttributes.ObservationModelParameters, Json(new
            {
                temperature = request.Temperature,
                max_tokens = request.MaxTokens,
                tool_choice = request.ToolChoice,
                tools = request.Tools?.Count ?? 0,
            }));
            activity.SetTag(LangfuseAttributes.ObservationInput, Payload(Json(request.Messages)));
            Metadata(activity, "iteration", iteration);
        }
        catch (Exception)
        {
            // ignored
        }
        return activity;
    }

    /// <summary>Records the model's answer, its token usage, and whether it asked for tools.</summary>
    public void CompleteGeneration(Activity? activity, ChatResponse response)
    {
        if (activity is null)
            return;
        try
        {
            activity.SetTag(LangfuseAttributes.ObservationOutput, Payload(Json(new
            {
                content = response.Content,
                tool_calls = response.ToolCalls.Select(tc => new { tc.Id, tc.Name, arguments = tc.ArgumentsRaw }),
            })));

            var usage = UsageNormalizer.Normalize(response.Usage);
            if (usage.Count > 0)
            {
                activity.SetTag(LangfuseAttributes.ObservationUsageDetails, Json(usage));
                Metadata(activity, "usage_source", "gateway");
            }
            else
            {
                // Deliberately no usage_details: Langfuse multiplies whatever it is given by
                // the model's price, so a fabricated zero is worse than a missing value.
                Metadata(activity, "usage_source", "absent");
            }

            Metadata(activity, "finish_reason", response.FinishReason);
            Metadata(activity, "status_code", response.StatusCode);
            Metadata(activity, "elapsed_ms", response.ElapsedMs);
            Metadata(activity, "tool_call_count", response.ToolCalls.Count);

            // The headline signal: whether this response caused a tool call, readable
            // without expanding the span's children.
            if (response.ToolCalls.Count > 0)
                Metadata(activity, "tool_names", string.Join(",", response.ToolCalls.Select(tc => tc.Name)));

            // The gateway may answer with a different model than the one requested
            // (it rewrites provider-prefixed ids, and may route elsewhere entirely);
            // recording both is how a silent substitution becomes visible.
            if (!string.IsNullOrWhiteSpace(response.Model))
                Metadata(activity, "response_model", response.Model);

            // Ok is stricter than "not an error" - it also requires status 200 - so error
            // state is derived from Error alone.
            if (response.Error is not null)
                activity.SetStatus(ActivityStatusCode.Error, response.Error);
        }
        catch (Exception)
        {
            // ignored
        }
    }

    /// <summary>
    /// Records one tool invocation as a completed span. Dispatch is synchronous and
    /// already exception-safe, so this reports on it rather than wrapping it.
    /// </summary>
    public void RecordTool(
        string toolName,
        string? toolCallId,
        string argumentsRaw,
        string resultJson,
        bool argumentsParseFailed)
    {
        Activity? activity = null;
        try
        {
            activity = Start($"tool:{toolName}", LangfuseAttributes.ObservationTypes.Tool);
            if (activity is null)
                return;

            activity.SetTag(LangfuseAttributes.ObservationInput, Payload(argumentsRaw));
            activity.SetTag(LangfuseAttributes.ObservationOutput, Payload(resultJson));
            Metadata(activity, "tool_name", toolName);
            Metadata(activity, "tool_call_id", toolCallId);

            // The model's arguments were not valid JSON and were replaced with an empty
            // object. The dispatch still "succeeds", so without this the tool looks fine.
            if (argumentsParseFailed)
                Metadata(activity, "arguments_parse_failed", true);

            // ToolRegistry.Dispatch never throws; it reports failure as an error property
            // in the result JSON, so that is where tool failure has to be read from.
            if (HasErrorProperty(resultJson, out var message))
                activity.SetStatus(ActivityStatusCode.Error, message);
        }
        catch (Exception)
        {
            // ignored
        }
        finally
        {
            activity?.Dispose();
        }
    }

    /// <summary>Verdict status the orchestrator uses when it could not reach a judgement.</summary>
    private const string UnevaluatedStatus = "ikke_vurdert";

    private static Activity? Start(string name, string observationType)
    {
        try
        {
            var activity = EnrichmentActivitySource.Source.StartActivity(name, ActivityKind.Internal);
            activity?.SetTag(LangfuseAttributes.ObservationType, observationType);
            return activity;
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static void Metadata(Activity? activity, string key, object? value)
    {
        if (activity is null || value is null)
            return;
        activity.SetTag(LangfuseAttributes.ObservationMetadataPrefix + key, value);
    }

    private static void TraceMetadata(Activity? activity, string key, object? value)
    {
        if (activity is null || value is null)
            return;
        activity.SetTag(LangfuseAttributes.TraceMetadataPrefix + key, value);
    }

    private static bool HasErrorProperty(string resultJson, out string? message)
    {
        message = null;
        try
        {
            using var doc = JsonDocument.Parse(resultJson);
            if (doc.RootElement.ValueKind != JsonValueKind.Object
                || !doc.RootElement.TryGetProperty("error", out var error))
            {
                return false;
            }
            message = error.ValueKind == JsonValueKind.String ? error.GetString() : error.ToString();
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string Json<T>(T value) => JsonSerializer.Serialize(value, PayloadJson);

    private string? Payload(string? text)
    {
        if (text is null)
            return null;
        var max = Options.MaxPayloadChars;
        return max > 0 && text.Length > max ? text[..max] : text;
    }
}
