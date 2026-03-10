using System.Text.Json;

namespace WorkflowEngine.Models;

/// <summary>
/// Shared <see cref="JsonSerializerOptions"/> for command data and workflow context deserialization.
/// Used by the engine (validation + execution) and by command descriptors for response parsing.
/// </summary>
public static class CommandSerializerOptions
{
    public static readonly JsonSerializerOptions Default = new() { PropertyNameCaseInsensitive = true };
}
