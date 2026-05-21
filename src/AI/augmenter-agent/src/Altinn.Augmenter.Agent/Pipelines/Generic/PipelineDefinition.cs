namespace Altinn.Augmenter.Agent.Pipelines.Generic;

/// <summary>
/// Root of the mounted pipeline.yaml. The list of steps is ordered;
/// later steps may read PipelineContext entries written by earlier ones.
/// </summary>
public sealed class PipelineDefinition
{
    public List<StepDefinition> Steps { get; set; } = new();
}

/// <summary>
/// A single step instance defined in pipeline.yaml. The <c>Type</c> field selects
/// the step implementation; other fields configure that step. Unused fields for a
/// given type are simply ignored.
/// </summary>
public sealed class StepDefinition
{
    public string Name { get; set; } = "";

    /// <summary>Step type: <c>mapping-pdf</c> or <c>agent-pdf-orchestrated</c>.</summary>
    public string Type { get; set; } = "";

    /// <summary>
    /// Mapper key — filename stem of a <c>&lt;name&gt;.json</c> spec under
    /// <c>ContentPaths.MappingsRoot</c>.
    /// </summary>
    public string Mapper { get; set; } = "";

    /// <summary>Filename of the Typst template under <c>ContentPaths.TemplatesRoot</c>.</summary>
    public string? Template { get; set; }

    /// <summary>Optional DOCX Markdown template under <c>ContentPaths.TemplatesRoot</c>.</summary>
    public string? DocxTemplate { get; set; }

    /// <summary>Output filename for the generated PDF (and the DOCX if applicable).</summary>
    public string Output { get; set; } = "";

    /// <summary>PipelineContext key under which to publish the evaluated JSON.</summary>
    public string? PublishTo { get; set; }

    // --- agent-pdf-orchestrated fields below -------------------------------------

    /// <summary>Folder under <c>ContentPaths.RulesRoot</c> holding per-item markdown rules. Use <c>"."</c> for the rules-root itself.</summary>
    public string? RulesFolder { get; set; }

    /// <summary>Filename of the output-schema (sections + items) under <c>ContentPaths.RegistriesRoot</c>. Default: <c>sjekkliste.json</c>.</summary>
    public string? SchemaFile { get; set; }

    /// <summary>Hard cap on tool-call iterations per item. Default: 5.</summary>
    public int? MaxToolIterations { get; set; }

    /// <summary>Max parallel per-item LLM loops. Default: 5.</summary>
    public int? Concurrency { get; set; }

    /// <summary>If set, write per-item traces here. Relative paths resolve under <c>Path.GetTempPath()</c>; absolute paths are used as-is.</summary>
    public string? TraceDir { get; set; }
}
