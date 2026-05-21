namespace Altinn.Augmenter.Agent.Configuration;

/// <summary>
/// Filesystem roots for mounted, image-external content (templates, registries,
/// rules, mappings, orchestrator prompts, tool definitions). In Docker these are
/// volume-mounted under <c>/etc/augmenter</c>; locally they fall back to the
/// repository's <c>config/</c> folder so the same code path works for
/// <c>dotnet run</c> and tests.
/// </summary>
public sealed class ContentPathsOptions
{
    public const string SectionName = "ContentPaths";

    /// <summary>Typst (.typ) + DOCX Markdown templates rendered by the PDF/DOCX generators.</summary>
    public string TemplatesRoot { get; set; } = "/etc/augmenter/templates";

    /// <summary>
    /// Typed key→value registries (<see cref="Services.Registries.LookupRegistry"/>,
    /// <see cref="Services.Registries.MappingRegistry"/>,
    /// <see cref="Services.Registries.RuleBasedRegistry"/>) plus output schemas
    /// (<see cref="Services.Registries.OutputSchema"/>) consumed by mappers,
    /// the lookup tool and the aggregator.
    /// </summary>
    public string RegistriesRoot { get; set; } = "/etc/augmenter/registries";

    /// <summary>
    /// Per-punkt markdown rules consumed by <c>agent-pdf-orchestrated</c>.
    /// Folder structure: <c>RulesRoot/&lt;rulesFolder&gt;/section.punkt.md</c>.
    /// </summary>
    public string RulesRoot { get; set; } = "/etc/augmenter/rules";

    /// <summary>
    /// Orchestrator configuration — system prompt and other text content not
    /// tied to a specific skill. Folder must contain <c>system-prompt.md</c>.
    /// </summary>
    public string OrchestratorRoot { get; set; } = "/etc/augmenter/orchestrator";

    /// <summary>
    /// OpenAI tool definitions (one <c>&lt;tool_name&gt;.json</c> file per tool).
    /// The image ships built-in implementations; descriptions and parameter
    /// schemas live here so the public image carries no domain vocabulary.
    /// </summary>
    public string ToolsRoot { get; set; } = "/etc/augmenter/tools";

    /// <summary>
    /// JsonPathMapper spec files (one <c>&lt;mapper_name&gt;.json</c> per mapper).
    /// Filename without extension is the key referenced by <c>mapper</c> in
    /// pipeline.yaml. The image ships no projection logic; specs declare how
    /// to fold FlatData into the shape each template expects.
    /// </summary>
    public string MappingsRoot { get; set; } = "/etc/augmenter/mappings";
}
