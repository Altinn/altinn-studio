namespace Altinn.Augmenter.Agent.Configuration;

public sealed class AgentOptions
{
    public const string SectionName = "Agent";

    /// <summary>
    /// Agent provider: <c>pi</c> (production) or <c>claude-cli</c> (local dev).
    /// </summary>
    public string Provider { get; set; } = "pi";

    /// <summary>
    /// Path to the agent CLI executable. Defaults to the provider name on PATH.
    /// </summary>
    public string CliPath { get; set; } = "pi";

    /// <summary>
    /// Anthropic API key, normally sourced from the ANTHROPIC_API_KEY env var
    /// (which providers read directly). Set here only if you must override.
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// Maximum time in seconds to wait for the agent process to complete.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 600;

    /// <summary>
    /// The model to request from Claude CLI (e.g. "sonnet", "opus").
    /// For local servers, use the format "provider/model-name" (e.g. "nvidia/nemotron-3-nano-4b").
    /// If null, uses the CLI default.
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Toggle to route requests to the local API server defined by
    /// <see cref="ApiBaseUrl"/> instead of the Anthropic API.
    /// </summary>
    public bool UseLocalProvider { get; set; }

    /// <summary>
    /// Base URL for a local API server (e.g. LM Studio).
    /// Only used when <see cref="UseLocalProvider"/> is true.
    /// Example: "http://localhost:1234"
    /// </summary>
    public string? ApiBaseUrl { get; set; }

    /// <summary>
    /// Auth token for the local API server. Defaults to "lmstudio" when
    /// <see cref="ApiBaseUrl"/> is set.
    /// </summary>
    public string? ApiAuthToken { get; set; }
}
