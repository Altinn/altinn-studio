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
/// the step implementation (mapping-pdf, agent-pdf, agent-pdf-docx); other fields
/// configure that step. Unused fields for a given type are simply ignored.
/// </summary>
public sealed class StepDefinition
{
    public string Name { get; set; } = "";

    /// <summary>Step type: <c>mapping-pdf</c>, <c>agent-pdf</c>, <c>agent-pdf-docx</c>.</summary>
    public string Type { get; set; } = "";

    /// <summary>Keyed name of the <see cref="IDataMapper"/> to use.</summary>
    public string Mapper { get; set; } = "";

    /// <summary>Keyed name of the <see cref="IPromptBuilder"/> (agent-* steps only). Defaults to <c>generic</c>.</summary>
    public string PromptBuilder { get; set; } = "default";

    /// <summary>Keyed name of the <see cref="IResponseParser"/> (agent-* steps only). Defaults to <c>generic</c>.</summary>
    public string ResponseParser { get; set; } = "default";

    /// <summary>Name of the skill folder under ContentPaths.SkillsRoot (agent-* steps only).</summary>
    public string? SkillFolder { get; set; }

    /// <summary>Filename of the Typst template under ContentPaths.TemplatesRoot.</summary>
    public string? Template { get; set; }

    /// <summary>Filename of the DOCX Markdown template under ContentPaths.TemplatesRoot (agent-pdf-docx only).</summary>
    public string? DocxTemplate { get; set; }

    /// <summary>Filename of the JSON schema under ContentPaths.SchemasRoot to include in the prompt.</summary>
    public string? Schema { get; set; }

    /// <summary>Output filename for the generated PDF (and the DOCX if applicable).</summary>
    public string Output { get; set; } = "";

    /// <summary>PipelineContext key under which to publish the agent's evaluated JSON.</summary>
    public string? PublishTo { get; set; }

    /// <summary>PipelineContext keys whose values should be appended to the prompt.</summary>
    public List<string> ConsumeContext { get; set; } = new();

    /// <summary>Top-level JSON key expected in the agent response; used by validating parsers.</summary>
    public string? ExpectedJsonKey { get; set; }

    // --- agent-pdf-orchestrated fields below -------------------------------------

    /// <summary>Folder under <c>ContentPaths.RulesRoot</c> holding per-punkt markdown rules. Use <c>"."</c> for the rules-root itself.</summary>
    public string? RulesFolder { get; set; }

    /// <summary>Filename of the output-schema (sections + items) under <c>ContentPaths.RegistriesRoot</c>. Default: <c>sjekkliste.json</c>.</summary>
    public string? SchemaFile { get; set; }

    /// <summary>Hard cap on tool-call iterations per punkt. Default: 5.</summary>
    public int? MaxToolIterations { get; set; }

    /// <summary>Max parallel per-punkt LLM loops. Default: 5.</summary>
    public int? Concurrency { get; set; }

    /// <summary>If set, write per-punkt traces here. Relative paths resolve under <c>Path.GetTempPath()</c>; absolute paths are used as-is.</summary>
    public string? TraceDir { get; set; }
}
