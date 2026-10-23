namespace Altinn.App.Ai.Enrichment.ServiceTasks;

/// <summary>
/// App-level configuration for the ai process step. Everything has a
/// convention-based default so a minimal app configures nothing here: the agent
/// folder defaults to the bpmn task id, and outputs go to the default data types.
/// </summary>
public sealed class AiEnrichmentOptions
{
    public const string SectionName = "AiEnrichment";

    /// <summary>
    /// Folder holding the agent folders, relative to the app base path
    /// (i.e. <c>App/agents/</c> in the app repository).
    /// </summary>
    public string AgentsRoot { get; set; } = "agents";

    /// <summary>Per-task overrides, keyed by bpmn task id.</summary>
    public Dictionary<string, AiEnrichmentTaskOptions> Tasks { get; set; } = new(StringComparer.Ordinal);

    /// <summary>
    /// Workflow-engine step budget for the ai step. Only honored by apps on
    /// Altinn.App.Core v9+ where process transitions run on the workflow engine
    /// (the engine's own service-task default is 10 minutes — too tight for long
    /// agent runs). Ignored on classic synchronous process/next (v8 apps).
    /// Applies per service-task type, i.e. to every ai task in the app.
    /// </summary>
    public AiEnrichmentStepOptions Step { get; set; } = new();

    public AiEnrichmentTaskOptions ForTask(string taskId) =>
        Tasks.TryGetValue(taskId, out var options) ? options : new AiEnrichmentTaskOptions();
}

/// <summary>
/// Workflow-engine execution budget for the ai step (see
/// <see cref="AiEnrichmentOptions.Step"/> for when it applies). A step retry
/// re-runs the whole agent — every LLM call — so retries default low; per-item
/// transport failures are already absorbed as verdicts inside a single run.
/// </summary>
public sealed class AiEnrichmentStepOptions
{
    /// <summary>
    /// Maximum wall-clock time for one execution attempt of the step before the
    /// engine cancels it and treats the attempt as failed. Bind as a TimeSpan
    /// string (e.g. <c>"01:00:00"</c>).
    /// </summary>
    public TimeSpan MaxExecutionTime { get; set; } = TimeSpan.FromHours(1);

    /// <summary>
    /// Maximum retries after a failed or timed-out attempt. 0 disables retries.
    /// Kept low by default to bound LLM cost; a permanently failed step is
    /// recovered by an operator resume.
    /// </summary>
    public int MaxRetries { get; set; } = 2;

    /// <summary>Delay between retry attempts (constant backoff).</summary>
    public TimeSpan RetryInterval { get; set; } = TimeSpan.FromMinutes(1);
}

/// <summary>Overrides for a single ai task.</summary>
public sealed class AiEnrichmentTaskOptions
{
    /// <summary>Agent folder name under <see cref="AiEnrichmentOptions.AgentsRoot"/>. Default: the bpmn task id.</summary>
    public string? Agent { get; set; }

    /// <summary>
    /// Data type of the form data the agent evaluates. Default: the single
    /// data element on the instance whose data type has appLogic (a C# model);
    /// ambiguity requires setting this explicitly.
    /// </summary>
    public string? InputDataType { get; set; }

    /// <summary>Data type (from applicationmetadata.json, without appLogic) that receives the enrichment JSON.</summary>
    public string JsonOutputDataType { get; set; } = "ai-enrichment-json";

    /// <summary>Data type (from applicationmetadata.json, without appLogic) that receives generated PDFs.</summary>
    public string PdfOutputDataType { get; set; } = "ai-enrichment-pdf";
}
