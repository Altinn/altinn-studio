namespace Altinn.App.Ai.Enrichment.ServiceTasks;

/// <summary>
/// App-level configuration for the kiBeriking process step. Everything has a
/// convention-based default so a minimal app configures nothing here: the agent
/// folder defaults to the bpmn task id, and outputs go to the default data types.
/// </summary>
public sealed class KiBerikingOptions
{
    public const string SectionName = "AiEnrichment";

    /// <summary>
    /// Folder holding the agent folders, relative to the app base path
    /// (i.e. <c>App/agents/</c> in the app repository).
    /// </summary>
    public string AgentsRoot { get; set; } = "agents";

    /// <summary>Per-task overrides, keyed by bpmn task id.</summary>
    public Dictionary<string, KiBerikingTaskOptions> Tasks { get; set; } = new(StringComparer.Ordinal);

    public KiBerikingTaskOptions ForTask(string taskId) =>
        Tasks.TryGetValue(taskId, out var options) ? options : new KiBerikingTaskOptions();
}

/// <summary>Overrides for a single kiBeriking task.</summary>
public sealed class KiBerikingTaskOptions
{
    /// <summary>Agent folder name under <see cref="KiBerikingOptions.AgentsRoot"/>. Default: the bpmn task id.</summary>
    public string? Agent { get; set; }

    /// <summary>
    /// Data type of the form data the agent evaluates. Default: the single
    /// data element on the instance whose data type has appLogic (a C# model);
    /// ambiguity requires setting this explicitly.
    /// </summary>
    public string? InputDataType { get; set; }

    /// <summary>Data type (from applicationmetadata.json, without appLogic) that receives the enrichment JSON.</summary>
    public string JsonOutputDataType { get; set; } = "ki-beriking-json";

    /// <summary>Data type (from applicationmetadata.json, without appLogic) that receives generated PDFs.</summary>
    public string PdfOutputDataType { get; set; } = "ki-beriking-pdf";
}
