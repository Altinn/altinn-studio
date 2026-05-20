using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// File-based <see cref="IToolDefinitionLoader"/>. Each JSON file is expected
/// to be a self-contained OpenAI function-tool spec:
/// <code>
/// { "name": "...", "description": "...", "parameters": { JSON-schema } }
/// </code>
/// </summary>
public sealed class FileToolDefinitionLoader(IOptions<ContentPathsOptions> contentPaths) : IToolDefinitionLoader
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

        var folder = contentPaths.Value.ToolsRoot;
        if (!Directory.Exists(folder))
        {
            throw new InvalidOperationException(
                $"Tools folder not found: {folder}. " +
                $"Mount your tool definitions there — the image ships no defaults.");
        }

        var byName = new Dictionary<string, ToolDefinition>(StringComparer.Ordinal);
        foreach (var file in Directory.GetFiles(folder, "*.json", SearchOption.TopDirectoryOnly).OrderBy(p => p, StringComparer.Ordinal))
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
