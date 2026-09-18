using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Tools;

/// <summary>
/// A deterministic primitive the LLM can call during per-punkt orchestration.
/// Implementations must be pure, side-effect-free, and JSON-serializable in return.
/// Errors are returned as { "error": "..." } objects rather than thrown — the
/// LLM needs to be able to read and reason about a failed call.
///
/// The OpenAI tool definition (description + JSON-schema) lives in config —
/// see <see cref="IToolDefinitionLoader"/>. <see cref="Name"/> is the join key.
/// </summary>
public interface ITool
{
    string Name { get; }

    /// <summary>
    /// Invoke the tool with arguments parsed from the model's tool_call.
    /// <paramref name="application"/> is the full søknads-JSON, auto-injected
    /// by <see cref="IToolRegistry"/> for tools that read from it
    /// (path_value, count_attachments). Tools that don't need it ignore the parameter.
    /// </summary>
    object Invoke(JsonElement arguments, JsonDocument application);
}
