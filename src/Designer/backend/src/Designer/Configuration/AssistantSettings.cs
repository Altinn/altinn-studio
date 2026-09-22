namespace Altinn.Studio.Designer.Configuration;

/// <summary>
/// Configuration for Assistant integration
/// </summary>
public class AssistantSettings
{
    /// <summary>
    /// URL to the Assistant service (e.g., http://localhost:8071)
    /// </summary>
    public required string AgentUrl { get; set; }

    /// <summary>
    /// Timeout in seconds for agent operations
    /// </summary>
    public int TimeoutSeconds { get; set; } = 300;
}
