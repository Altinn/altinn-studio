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

    /// <summary>
    /// Whether the step yields once before running the agent: the first attempt
    /// defers immediately, and the run happens on the engine's next callback.
    ///
    /// This is what the person who pressed submit experiences. Without it the
    /// browser's process/next call stays open for the whole run — the app waits
    /// out its polling timeout and only then shows the "this is taking a while"
    /// page, so a run of minutes means a minute and a half of frozen form. A
    /// yielded step parks the transition, which app-lib releases to the caller
    /// after a short grace, so the waiting page arrives in seconds. The run
    /// itself is unaffected: same work, same budget, just no longer inside
    /// anyone's HTTP request.
    ///
    /// Costs one extra engine round trip. Turn it off for an agent fast enough
    /// to finish inside the request, where a waiting page would only flicker.
    /// </summary>
    public bool YieldBeforeRun { get; set; } = true;

    /// <summary>
    /// How long the yield parks the transition before the agent run starts.
    ///
    /// This is a window, not a delay to minimize. app-lib only releases the
    /// caller if one of its polls lands while the transition is parked, and
    /// those polls slow to one every two seconds once a transition is a few
    /// seconds old. A yield shorter than that interval falls between two polls:
    /// the step is running again before anyone looks, the release never fires,
    /// and the caller waits out the full run exactly as it did before. Measured
    /// at 1 second it did precisely that.
    ///
    /// So keep it comfortably wider than two seconds. It costs the run the same
    /// delay once, which is nothing against a run of minutes, and it buys the
    /// submitter their page.
    /// </summary>
    public TimeSpan YieldDelay { get; set; } = TimeSpan.FromSeconds(5);

    /// <summary>
    /// How long the yield above may take before the engine gives up on it. Only
    /// the yield is waiting — the agent run that follows is bounded by
    /// <see cref="MaxExecutionTime"/> — so this needs to cover a callback
    /// round trip, not a run. Generous by default because the cost of being
    /// wrong is a failed submission, while an over-long budget costs nothing
    /// that <see cref="MaxExecutionTime"/> does not already bound.
    /// </summary>
    public TimeSpan WaitBudget { get; set; } = TimeSpan.FromHours(1);
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
