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
}
