using System.Text.Json.Serialization;

namespace Altinn.Augmenter.Agent.Services.Agent.Chat;

/// <summary>
/// OpenAI-compatible chat message. Same shape regardless of role; null fields
/// are omitted when serialized so a system/user message doesn't carry a
/// stray <c>tool_call_id</c>.
/// </summary>
public sealed record ChatMessage
{
    /// <summary>"system", "user", "assistant", or "tool".</summary>
    public required string Role { get; init; }

    /// <summary>Message body. Null on assistant messages that contain only tool_calls.</summary>
    public string? Content { get; init; }

    /// <summary>Required on role="tool" messages, references the assistant's tool_call id.</summary>
    [JsonPropertyName("tool_call_id")]
    public string? ToolCallId { get; init; }

    /// <summary>Set on assistant messages that request tool invocations.</summary>
    [JsonPropertyName("tool_calls")]
    public IReadOnlyList<AssistantToolCall>? ToolCalls { get; init; }

    public static ChatMessage System(string content) => new() { Role = "system", Content = content };
    public static ChatMessage User(string content) => new() { Role = "user", Content = content };

    /// <summary>Echo back an assistant message that requested tool calls, so the model sees its own request next turn.</summary>
    public static ChatMessage Assistant(string? content, IReadOnlyList<AssistantToolCall> toolCalls) => new()
    {
        Role = "assistant",
        Content = content,
        ToolCalls = toolCalls,
    };

    /// <summary>Reply to a single tool call. Content is the tool's serialized result.</summary>
    public static ChatMessage Tool(string toolCallId, string content) => new()
    {
        Role = "tool",
        ToolCallId = toolCallId,
        Content = content,
    };
}

/// <summary>Tool invocation requested by the model — the assistant-message shape.</summary>
public sealed record AssistantToolCall
{
    public required string Id { get; init; }
    public string Type { get; init; } = "function";
    public required AssistantToolCallFunction Function { get; init; }
}

public sealed record AssistantToolCallFunction
{
    public required string Name { get; init; }

    /// <summary>JSON-encoded argument blob, exactly as the model produced it.</summary>
    public required string Arguments { get; init; }
}
