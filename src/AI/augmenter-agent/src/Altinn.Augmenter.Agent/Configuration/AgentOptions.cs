namespace Altinn.Augmenter.Agent.Configuration;

public sealed class AgentOptions
{
    public const string SectionName = "Agent";

    /// <summary>
    /// Path to the Claude CLI executable. Defaults to "claude" (expects it on PATH).
    /// </summary>
    public string CliPath { get; set; } = "claude";

    /// <summary>
    /// Maximum time in seconds to wait for the agent process to complete.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 600;

    /// <summary>
    /// The model to request from Claude CLI (e.g. "sonnet", "opus").
    /// If null, uses the CLI default.
    /// </summary>
    public string? Model { get; set; }
}
