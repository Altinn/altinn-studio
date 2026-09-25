using Altinn.App.Core.Constants;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Configuration available when validating a BPMN task at app startup.
/// </summary>
public sealed record ProcessTaskValidationContext
{
    /// <summary>The BPMN element id of the task being validated.</summary>
    public required string TaskId { get; init; }

    /// <summary>The hosting environment, for configuration that varies by environment.</summary>
    public required HostingEnvironment Environment { get; init; }

    /// <summary>The application metadata, including declared data types.</summary>
    public required ApplicationMetadata ApplicationMetadata { get; init; }
}
