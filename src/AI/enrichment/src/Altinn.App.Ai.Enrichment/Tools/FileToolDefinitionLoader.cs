using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Tools;

/// <summary>
/// File-based <see cref="IToolDefinitionLoader"/> reading from an agent's
/// <c>tools/</c> folder. Each JSON file is expected to be a self-contained
/// OpenAI function-tool spec:
/// <code>
/// { "name": "...", "description": "...", "parameters": { JSON-schema } }
/// </code>
/// </summary>
public sealed class FileToolDefinitionLoader(string toolsDirectory) : IToolDefinitionLoader
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    private IReadOnlyDictionary<string, ToolDefinition>? _cached;

    public IReadOnlyDictionary<string, ToolDefinition> LoadAll()
    {
        if (_cached is not null)
            return _cached;

        if (!Directory.Exists(toolsDirectory))
        {
            throw new InvalidOperationException(
                $"Tools folder not found: {toolsDirectory}. " +
                $"Put your tool definitions there — the library ships no defaults.");
        }

        var byName = new Dictionary<string, ToolDefinition>(StringComparer.Ordinal);
        foreach (var file in Directory.GetFiles(toolsDirectory, "*.json", SearchOption.TopDirectoryOnly).OrderBy(p => p, StringComparer.Ordinal))
        {
            var payload = JsonSerializer.Deserialize<ToolFunctionDefinition>(File.ReadAllText(file), JsonOpts)
                ?? throw new InvalidOperationException($"Tool definition file is empty: {file}");

            if (string.IsNullOrWhiteSpace(payload.Name))
                throw new InvalidOperationException($"Tool definition missing 'name' field: {file}");

            if (byName.ContainsKey(payload.Name))
                throw new InvalidOperationException($"Duplicate tool name '{payload.Name}' (second occurrence: {file})");

            byName[payload.Name] = new ToolDefinition { Function = payload };
        }
        _cached = byName;
        return _cached;
    }
}
