namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Creates the <see cref="IServiceTaskCheckpoints"/> backing one service-task attempt. Instances
/// are stateful per attempt (read caching, snapshot mirroring, the attempt's cancellation token),
/// so the DI seam is this factory, not the checkpoints themselves. The runtime registers
/// <see cref="StorageServiceTaskCheckpointsFactory"/> as the default.
/// </summary>
/// <remarks>
/// <c>Create</c> takes the execution's <see cref="IInstanceDataAccessor"/> rather than an
/// <see cref="Altinn.Platform.Storage.Interface.Models.Instance"/> deliberately: an implementation
/// that mirrors writes must decorate the live execution snapshot — the one later commands re-sign
/// into the state blob — and the accessor guarantees that identity where a detached or re-fetched
/// instance would let the mirror drift. It is the accessor, not the
/// <see cref="IInstanceDataMutator"/>, because checkpoints live outside the save-on-success unit of
/// work: checkpoints must never be handed the power to mutate it.
/// </remarks>
internal interface IServiceTaskCheckpointsFactory
{
    IServiceTaskCheckpoints Create(
        IInstanceDataAccessor instanceDataAccessor,
        string serviceTaskType,
        CancellationToken cancellationToken
    );
}
