using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Mapping;
using Altinn.App.Ai.Enrichment.Orchestration;
using Altinn.App.Ai.Enrichment.Pipeline;
using Altinn.App.Ai.Enrichment.Registries;
using Altinn.App.Ai.Enrichment.Rendering;
using Altinn.App.Ai.Enrichment.Tools;

namespace Altinn.App.Ai.Enrichment.Agents;

/// <summary>
/// Builds a validated <see cref="AgentRuntime"/> from an agent folder. All
/// file-system-backed collaborators (registries, mappers, tool definitions,
/// system prompt, rules) are scoped to that folder, so multiple agents with
/// different configs coexist in one app.
/// </summary>
public sealed class AgentRuntimeFactory(
    IChatService chatService,
    ITypstRenderer typstRenderer,
    IRulesLoader rulesLoader,
    ILoggerFactory loggerFactory)
{
    private readonly System.Collections.Concurrent.ConcurrentDictionary<string, AgentRuntime> _cache =
        new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Cached variant of <see cref="Create"/> for steady-state use (agent
    /// folders are immutable inside a running container). Failed loads are not
    /// cached, so a config fix followed by task retry recovers.
    /// </summary>
    public AgentRuntime GetOrCreate(string agentFolderPath) =>
        _cache.GetOrAdd(Path.GetFullPath(agentFolderPath), Create);

    public AgentRuntime Create(string agentFolderPath)
    {
        var folder = new AgentFolder(agentFolderPath);
        var definition = AgentDefinitionLoader.Load(folder);
        AgentValidator.Validate(folder, definition);

        var registries = new RegistryProvider(folder.RegistriesDirectory);
        var mappers = new FileSystemDataMapperRegistry(folder.MappingsDirectory, registries);

        var steps = definition.Steps
            .Select(step => CreateStep(step, folder, registries, mappers))
            .ToList();

        return new AgentRuntime(folder.Name, steps, loggerFactory.CreateLogger($"Agent.{folder.Name}"));
    }

    private IEnrichmentStep CreateStep(
        StepDefinition definition,
        AgentFolder folder,
        RegistryProvider registries,
        IDataMapperRegistry mappers)
    {
        var stepLogger = loggerFactory.CreateLogger($"Agent.{folder.Name}.{definition.Name}");

        return definition.Type switch
        {
            "mapping-pdf" => new MappingPdfStep(
                definition, RequireMapper(definition, mappers), typstRenderer, folder, stepLogger),

            "agent-pdf-orchestrated" => new AgentOrchestratedStep(
                definition,
                RequireMapper(definition, mappers),
                BuildOrchestrator(folder, registries),
                rulesLoader,
                typstRenderer,
                folder,
                stepLogger),

            _ => throw new InvalidOperationException(
                $"Step '{definition.Name}' has unknown type '{definition.Type}'. " +
                $"Supported: mapping-pdf, agent-pdf-orchestrated."),
        };
    }

    private IEvaluationOrchestrator BuildOrchestrator(AgentFolder folder, RegistryProvider registries)
    {
        var toolRegistry = new ToolRegistry(
            ToolRegistry.BuiltIn(registries),
            new FileToolDefinitionLoader(folder.ToolsDirectory));
        var promptProvider = new FileSystemPromptProvider(folder.SystemPromptPath);

        return new EvaluationOrchestrator(
            chatService,
            toolRegistry,
            promptProvider,
            loggerFactory.CreateLogger<EvaluationOrchestrator>());
    }

    private static IDataMapper RequireMapper(StepDefinition definition, IDataMapperRegistry mappers)
    {
        if (string.IsNullOrEmpty(definition.Mapper))
            throw new InvalidOperationException($"Step '{definition.Name}' is missing 'mapper'.");
        try
        {
            return mappers.Get(definition.Mapper);
        }
        catch (FileNotFoundException ex)
        {
            throw new InvalidOperationException($"Step '{definition.Name}': {ex.Message}", ex);
        }
    }
}
