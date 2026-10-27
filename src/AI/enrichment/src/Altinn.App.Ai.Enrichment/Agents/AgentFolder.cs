namespace Altinn.App.Ai.Enrichment.Agents;

/// <summary>
/// Resolved locations inside a single agent folder (<c>App/agents/&lt;name&gt;/</c>).
/// The folder is the complete, self-contained configuration for one enrichment
/// step: definition, prompt, rules, tool specs, registries, mappings and templates.
/// </summary>
public sealed class AgentFolder
{
    public AgentFolder(string root)
    {
        Root = Path.GetFullPath(root);
        Name = Path.GetFileName(Root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
    }

    /// <summary>Absolute path to the agent folder itself.</summary>
    public string Root { get; }

    /// <summary>Folder name — doubles as the agent's identifier.</summary>
    public string Name { get; }

    /// <summary>The agent's pipeline definition (<c>agent.yaml</c>).</summary>
    public string DefinitionPath => Path.Combine(Root, "agent.yaml");

    /// <summary>System prompt for the per-item orchestrator (<c>system-prompt.md</c>).</summary>
    public string SystemPromptPath => Path.Combine(Root, "system-prompt.md");

    /// <summary>Per-item markdown rules (<c>rules/&lt;section&gt;.&lt;item&gt;.md</c>).</summary>
    public string RulesDirectory => Path.Combine(Root, "rules");

    /// <summary>OpenAI tool definitions, one <c>&lt;tool_name&gt;.json</c> per built-in tool.</summary>
    public string ToolsDirectory => Path.Combine(Root, "tools");

    /// <summary>Typed key→value registries plus output schemas.</summary>
    public string RegistriesDirectory => Path.Combine(Root, "registries");

    /// <summary>JsonPathMapper spec files (<c>&lt;mapper_name&gt;.json</c>).</summary>
    public string MappingsDirectory => Path.Combine(Root, "mappings");

    /// <summary>Typst templates (<c>*.typ</c>) — only needed when a step renders PDF.</summary>
    public string TemplatesDirectory => Path.Combine(Root, "templates");
}
