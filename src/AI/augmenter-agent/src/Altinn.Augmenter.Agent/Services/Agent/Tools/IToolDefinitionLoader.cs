namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Loads OpenAI tool definitions from <c>ContentPaths.ToolsRoot/*.json</c> at
/// startup. Keeps tool descriptions (which often carry domain vocabulary)
/// out of the public image.
/// </summary>
public interface IToolDefinitionLoader
{
    /// <summary>
    /// Read every <c>*.json</c> file in the configured tools folder and return
    /// the parsed definitions keyed by the embedded <c>name</c> field. Throws
    /// on a missing folder, a malformed JSON file, or a duplicate tool name.
    /// </summary>
    IReadOnlyDictionary<string, ToolDefinition> LoadAll();
}
