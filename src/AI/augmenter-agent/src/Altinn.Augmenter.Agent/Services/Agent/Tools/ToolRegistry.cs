using System.Text.Json;
using Altinn.Augmenter.Agent.Services.Registries;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Composes built-in <see cref="ITool"/> implementations with definitions
/// loaded from config. Definitions and implementations are joined by tool name;
/// an impl without a definition (or vice versa) is an error so misconfiguration
/// fails fast at startup rather than silently dropping a tool.
/// </summary>
public sealed class ToolRegistry : IToolRegistry
{
    private readonly Dictionary<string, ITool> _byName;
    private readonly IReadOnlyList<ToolDefinition> _definitions;

    private static readonly JsonSerializerOptions ResultJsonOptions = new()
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never,
    };

    /// <summary>
    /// Production constructor (used by DI). Pairs each registered <see cref="ITool"/>
    /// with the matching definition from <paramref name="loader"/>.
    /// </summary>
    public ToolRegistry(IEnumerable<ITool> tools, IToolDefinitionLoader loader)
        : this(tools, loader.LoadAll())
    {
    }

    /// <summary>
    /// Test constructor — accepts an in-memory definitions map so unit tests
    /// don't need a file system. Default <paramref name="definitions"/> is empty,
    /// which throws if any tool is registered (matching production behavior).
    /// </summary>
    public ToolRegistry(IEnumerable<ITool> tools, IReadOnlyDictionary<string, ToolDefinition> definitions)
    {
        _byName = tools.ToDictionary(t => t.Name, t => t, StringComparer.Ordinal);
        var defs = new List<ToolDefinition>(_byName.Count);
        foreach (var (name, _) in _byName)
        {
            if (!definitions.TryGetValue(name, out var def))
                throw new InvalidOperationException(
                    $"Tool '{name}' has an implementation but no definition. " +
                    $"Add a {name}.json file under ContentPaths.ToolsRoot.");
            defs.Add(def);
        }
        var orphans = definitions.Keys.Where(k => !_byName.ContainsKey(k)).ToList();
        if (orphans.Count > 0)
        {
            throw new InvalidOperationException(
                $"Tool definitions without an implementation: [{string.Join(", ", orphans)}]. " +
                $"Either add the matching ITool or remove the .json file.");
        }
        _definitions = defs;
    }

    /// <summary>
    /// Convenience for tests that exercise dispatch but don't care about
    /// definitions — pairs the built-in tools with minimal placeholder
    /// definitions so the registry doesn't throw. Tools with dependencies
    /// (lookup) get a no-op stub since unit tests that target dispatch
    /// don't usually invoke them.
    /// </summary>
    public static ToolRegistry ForTesting()
    {
        var tools = BuiltInForTesting();
        return new(tools, PlaceholderDefinitions(tools));
    }

    private static IReadOnlyList<ITool> BuiltInForTesting()
    {
        // RegistryProvider does file I/O lazily, so a non-existent path is fine
        // until something actually tries to read a registry. Tests that need
        // real registry data should construct a registry pointing at
        // config/registries/ explicitly.
        var registries = new RegistryProvider(Microsoft.Extensions.Options.Options.Create(
            new Altinn.Augmenter.Agent.Configuration.ContentPathsOptions { RegistriesRoot = "/nonexistent" }));
        return BuiltIn(registries);
    }

    private static IReadOnlyDictionary<string, ToolDefinition> PlaceholderDefinitions(IEnumerable<ITool> tools)
    {
        var emptyParameters = JsonDocument.Parse("""{"type":"object","properties":{},"required":[]}""").RootElement.Clone();
        return tools.ToDictionary(
            t => t.Name,
            t => new ToolDefinition
            {
                Function = new ToolFunctionDefinition
                {
                    Name = t.Name,
                    Description = $"Placeholder definition for {t.Name} (test fixture).",
                    Parameters = emptyParameters,
                },
            },
            StringComparer.Ordinal);
    }

    public IReadOnlyList<ToolDefinition> Definitions => _definitions;

    public string Dispatch(string name, JsonElement arguments, JsonDocument application)
    {
        if (!_byName.TryGetValue(name, out var tool))
        {
            var known = string.Join(", ", _byName.Keys.OrderBy(x => x));
            return JsonSerializer.Serialize(new { error = $"Unknown tool: {name}. Known: [{known}]" }, ResultJsonOptions);
        }

        object result;
        try
        {
            result = tool.Invoke(arguments, application);
        }
        catch (Exception ex)
        {
            result = new { error = $"Bad arguments to {name}: {ex.Message}" };
        }

        return JsonSerializer.Serialize(result, ResultJsonOptions);
    }

    /// <summary>Default tool set when an explicit <see cref="RegistryProvider"/> is supplied (used by the integration test).</summary>
    public static IReadOnlyList<ITool> BuiltIn(RegistryProvider registries) =>
    [
        new AgeFromIdTool(),
        new DaysBetweenTool(),
        new TimeWithinWindowTool(),
        new HoursBetweenTimesTool(),
        new CurrentDateTool(),
        new LookupTool(registries),
        new PathValueTool(),
        new CountAttachmentsTool(),
        new TextMatchesAnyTool(),
        new TextContainsAnyTool(),
    ];
}
