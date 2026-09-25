namespace Altinn.App.Core.Features.Process;

/// <summary>
/// One occurrence of an ordinary workflow command in a process task's ordered lifecycle declaration.
/// Reusing a key creates separate durable steps, each with its own engine-assigned step ID.
/// </summary>
/// <param name="Key">The stable key returned by a registered <see cref="IWorkflowEngineCommand"/>.</param>
/// <param name="Payload">
/// Optional serialized input, fixed when the workflow is enqueued. The command owns its format; apps can
/// serialize their own DTOs without registering payload types in the framework. Keep the input small.
/// </param>
public sealed record WorkflowCommandRef(string Key, string? Payload = null);
