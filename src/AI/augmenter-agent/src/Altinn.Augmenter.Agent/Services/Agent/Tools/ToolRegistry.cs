using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Default registry containing the 8 deterministic tools ported from
/// <c>training/experiments/exp-direct-tools/scripts/tools.py</c>. Constructed
/// with no arguments; tools are pure singletons so a single registry instance
/// is safe to share across requests.
/// </summary>
public sealed class ToolRegistry : IToolRegistry
{
    private readonly Dictionary<string, ITool> _byName;
    private readonly IReadOnlyList<ToolDefinition> _definitions;

    private static readonly JsonSerializerOptions ResultJsonOptions = new()
    {
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.Never,
    };

    public ToolRegistry()
        : this(BuiltIn())
    {
    }

    public ToolRegistry(IEnumerable<ITool> tools)
    {
        _byName = tools.ToDictionary(t => t.Name, t => t, StringComparer.Ordinal);
        _definitions = _byName.Values.Select(t => t.Definition).ToList();
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

    /// <summary>Default tool set used by production wiring.</summary>
    public static IReadOnlyList<ITool> BuiltIn() =>
    [
        new AgeAtDateFromFnrTool(),
        new DaysBetweenTool(),
        new TimeWithinLegalScheduleTool(),
        new LookupKommuneTool(),
        new PathValueTool(),
        new CountAttachmentsTool(),
        new TextMatchesAnyTool(),
        new TextContainsAnyTool(),
    ];
}
