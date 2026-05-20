using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Configuration;

/// <summary>
/// Falls back to a repo-local <c>config/</c> folder if the configured paths
/// don't exist on disk. This lets the same binary run in Docker (with mounts
/// under /etc/augmenter) and locally (with config/ next to the .csproj or
/// repo root) without per-environment configuration.
/// </summary>
public sealed class ContentPathsPostConfigure : IPostConfigureOptions<ContentPathsOptions>
{
    private const string ConfigFolderName = "config";
    private const int MaxSearchDepth = 8;

    public void PostConfigure(string? name, ContentPathsOptions options)
    {
        var configRoot = FindLocalConfigRoot();
        if (configRoot == null)
            return;

        if (!Directory.Exists(options.SkillsRoot))
            options.SkillsRoot = Path.Combine(configRoot, "skills");

        if (!Directory.Exists(options.TemplatesRoot))
            options.TemplatesRoot = Path.Combine(configRoot, "templates");

        if (!Directory.Exists(options.SchemasRoot))
            options.SchemasRoot = Path.Combine(configRoot, "templates");

        if (!Directory.Exists(options.DomainRoot))
            options.DomainRoot = Path.Combine(configRoot, "domain");

        if (!Directory.Exists(options.RulesRoot))
            options.RulesRoot = Path.Combine(configRoot, "rules");

        if (!Directory.Exists(options.OrchestratorRoot))
            options.OrchestratorRoot = Path.Combine(configRoot, "orchestrator");

        if (!Directory.Exists(options.ToolsRoot))
            options.ToolsRoot = Path.Combine(configRoot, "tools");
    }

    private static string? FindLocalConfigRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        for (var i = 0; i < MaxSearchDepth && dir != null; i++, dir = dir.Parent)
        {
            var candidate = Path.Combine(dir.FullName, ConfigFolderName);
            if (Directory.Exists(Path.Combine(candidate, "skills")) &&
                Directory.Exists(Path.Combine(candidate, "templates")))
            {
                return candidate;
            }
        }
        return null;
    }
}
