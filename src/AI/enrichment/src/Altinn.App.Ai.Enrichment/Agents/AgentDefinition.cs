namespace Altinn.App.Ai.Enrichment.Agents;

/// <summary>
/// Root of an agent's <c>agent.yaml</c>. The list of steps is ordered;
/// later steps may read PipelineContext entries written by earlier ones.
/// </summary>
public sealed class AgentDefinition
{
    public List<StepDefinition> Steps { get; set; } = new();
}

/// <summary>
/// A single step instance defined in agent.yaml. The <c>Type</c> field selects
/// the step implementation; other fields configure that step. Unused fields for a
/// given type are simply ignored.
/// </summary>
public sealed class StepDefinition
{
    public string Name { get; set; } = "";

    /// <summary>Step type: <c>mapping-pdf</c> or <c>agent-pdf-orchestrated</c>.</summary>
    public string Type { get; set; } = "";

    /// <summary>
    /// Mapper key — filename stem of a <c>&lt;name&gt;.json</c> spec under the
    /// agent's <c>mappings/</c> folder.
    /// </summary>
    public string Mapper { get; set; } = "";

    /// <summary>
    /// Filename of the Typst template under the agent's <c>templates/</c> folder.
    /// Required for <c>mapping-pdf</c>; optional for <c>agent-pdf-orchestrated</c>
    /// (omit it to produce enrichment JSON without a PDF).
    /// </summary>
    public string? Template { get; set; }

    /// <summary>Output filename for the generated PDF. Required whenever <see cref="Template"/> is set.</summary>
    public string? Output { get; set; }

    /// <summary>
    /// PipelineContext key under which to publish the evaluated JSON.
    /// Defaults to the step name for <c>agent-pdf-orchestrated</c> steps.
    /// </summary>
    public string? PublishTo { get; set; }

    // --- agent-pdf-orchestrated fields below -------------------------------------

    /// <summary>Subfolder of the agent's <c>rules/</c> folder holding per-item markdown rules. Use <c>"."</c> (default) for rules/ itself.</summary>
    public string? RulesFolder { get; set; }

    /// <summary>Filename of the output-schema (sections + items) under the agent's <c>registries/</c> folder. Default: <c>sjekkliste.json</c>.</summary>
    public string? SchemaFile { get; set; }

    /// <summary>Hard cap on tool-call iterations per item. Default: 5.</summary>
    public int? MaxToolIterations { get; set; }

    /// <summary>Max parallel per-item LLM loops. Default: 5.</summary>
    public int? Concurrency { get; set; }

    /// <summary>If set, write per-item traces here. Relative paths resolve under <c>Path.GetTempPath()</c>; absolute paths are used as-is.</summary>
    public string? TraceDir { get; set; }
}
