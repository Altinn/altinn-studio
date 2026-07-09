namespace Altinn.App.Ai.Enrichment.Chat;

/// <summary>
/// Parsed view of a chat-completion response. <see cref="Error"/> is non-null
/// when the gateway returned a non-2xx or the body couldn't be parsed —
/// callers must check it before reading <see cref="Content"/> / <see cref="ToolCalls"/>.
/// </summary>
public sealed record ChatResponse
{
    public string Content { get; init; } = "";

    public IReadOnlyList<ToolCall> ToolCalls { get; init; } = Array.Empty<ToolCall>();

    public string? FinishReason { get; init; }

    /// <summary>OpenAI usage block (prompt/completion/total tokens). May be empty when the gateway omits it.</summary>
    public IReadOnlyDictionary<string, object?> Usage { get; init; } = new Dictionary<string, object?>();

    public int ElapsedMs { get; init; }

    public int StatusCode { get; init; }

    /// <summary>Transport- or response-parsing error. Null on success.</summary>
    public string? Error { get; init; }

    public bool Ok => Error is null && StatusCode == 200;
}

/// <summary>Parsed tool call from a model response.</summary>
public sealed record ToolCall
{
    public required string Id { get; init; }
    public required string Name { get; init; }

    /// <summary>Raw JSON-encoded argument blob as returned by the model.</summary>
    public required string ArgumentsRaw { get; init; }
}
