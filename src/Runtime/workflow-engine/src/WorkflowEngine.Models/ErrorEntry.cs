namespace WorkflowEngine.Models;

/// <summary>
/// A single error occurrence recorded during step execution.
/// </summary>
public sealed record ErrorEntry(DateTimeOffset Timestamp, string Message, int? HttpStatusCode, bool WasRetryable);
