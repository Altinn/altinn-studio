namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// A single error occurrence recorded during step execution.
/// </summary>
internal sealed record ErrorEntry(DateTimeOffset Timestamp, string Message, int? HttpStatusCode, bool WasRetryable);
