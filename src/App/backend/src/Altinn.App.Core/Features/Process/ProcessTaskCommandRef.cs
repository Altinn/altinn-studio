namespace Altinn.App.Core.Features.Process;

/// <summary>
/// One command an <see cref="Internal.Process.ProcessTasks.IProcessTask"/> declares for a lifecycle phase: the
/// <see cref="IProcessTaskCommand.Key"/> of a registered command, and an optional payload handed to it verbatim.
/// </summary>
/// <param name="Key">The key of the <see cref="IProcessTaskCommand"/> to run.</param>
/// <param name="Payload">
/// An optional payload for the command, fixed when the transition is enqueued and available as
/// <see cref="ProcessTaskCommandContext.Payload"/>. Keep it small: it travels through the workflow engine on
/// every callback of the step.
/// </param>
public sealed record ProcessTaskCommandRef(string Key, string? Payload = null);
