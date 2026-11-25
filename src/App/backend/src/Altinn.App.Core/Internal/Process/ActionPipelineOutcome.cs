using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models.Process;

namespace Altinn.App.Core.Internal.Process;

/// <summary>Where an action pipeline left the instance when a request that started it or sent it a message ends.</summary>
internal abstract record ActionPipelineOutcome
{
    private ActionPipelineOutcome() { }

    /// <summary>The pipeline holds the instance on the task and waits for messages.</summary>
    internal sealed record Open(InstanceWithStorageMetadata Instance) : ActionPipelineOutcome;

    /// <summary>The pipeline ended by moving the process.</summary>
    internal sealed record Moved(InstanceWithStorageMetadata Instance) : ActionPipelineOutcome;

    /// <summary>The pipeline ended by returning the instance to idle on the same task.</summary>
    internal sealed record Released(InstanceWithStorageMetadata Instance) : ActionPipelineOutcome;

    /// <summary>No pipeline held the task, so the message was not sent.</summary>
    internal sealed record NotOpen(InstanceWithStorageMetadata Instance) : ActionPipelineOutcome;

    /// <summary>
    /// Nothing started or was sent, or the pipeline failed or did not answer in time, for the reason the result gives.
    /// </summary>
    internal sealed record Refused(ProcessChangeResult Result) : ActionPipelineOutcome;
}
