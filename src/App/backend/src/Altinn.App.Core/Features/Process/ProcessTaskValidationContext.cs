using Altinn.App.Core.Constants;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What an <see cref="Internal.Process.ProcessTasks.IProcessTask"/> is handed when its configuration for one BPMN
/// task is validated at app startup.
/// </summary>
public sealed record ProcessTaskValidationContext
{
    /// <summary>
    /// The BPMN element id of the task being validated.
    /// </summary>
    public required string TaskId { get; init; }

    /// <summary>
    /// The hosting environment the app is starting in, for configuration that resolves per environment.
    /// </summary>
    public required HostingEnvironment Environment { get; init; }

    /// <summary>
    /// The application metadata, for checks against declared data types.
    /// </summary>
    public required ApplicationMetadata ApplicationMetadata { get; init; }
}
