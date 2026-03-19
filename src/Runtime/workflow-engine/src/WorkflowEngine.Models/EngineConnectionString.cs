namespace WorkflowEngine.Models;

/// <summary>
/// Holds the database connection string provided by the host at startup.
/// Registered as a singleton by <c>AddWorkflowEngine</c>
/// and consumed by database services at resolution time.
/// </summary>
public sealed record EngineConnectionString(string Value);
