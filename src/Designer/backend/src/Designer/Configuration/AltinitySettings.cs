namespace Altinn.Studio.Designer.Configuration;

/// <summary>
/// Configuration for Altinity AI agent integration
/// </summary>
public class AltinitySettings
{
    /// <summary>
    /// URL to the Altinity agent service (e.g., http://localhost:8071)
    /// </summary>
    public required string AgentUrl { get; set; }

    /// <summary>
    /// Timeout in seconds for agent operations
    /// </summary>
    public int TimeoutSeconds { get; set; } = 300;
}
