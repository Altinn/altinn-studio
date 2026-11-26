namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Instance data that a workflow step restored from its state and can read again as Storage has it now.
/// </summary>
internal interface IReloadableInstanceData
{
    /// <summary>
    /// Replaces the instance with the one Storage has now, as after a save Storage replayed, and drops everything read
    /// or staged so far.
    /// </summary>
    Task ReloadFromStorage(CancellationToken cancellationToken);
}
