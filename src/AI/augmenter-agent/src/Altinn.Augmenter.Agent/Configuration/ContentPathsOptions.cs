namespace Altinn.Augmenter.Agent.Configuration;

/// <summary>
/// Filesystem roots for mounted, image-external content (skills, templates, schemas, domain data).
/// In Docker these are volume-mounted under /etc/augmenter; locally they typically point at the
/// repository's config/ folder so the same code path works for `dotnet run` and tests.
/// </summary>
public sealed class ContentPathsOptions
{
    public const string SectionName = "ContentPaths";

    public string SkillsRoot { get; set; } = "/etc/augmenter/skills";
    public string TemplatesRoot { get; set; } = "/etc/augmenter/templates";
    public string SchemasRoot { get; set; } = "/etc/augmenter/templates";
    public string DomainRoot { get; set; } = "/etc/augmenter/domain";

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
}
