namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Indicates that Storage replayed an already committed instance mutation.
/// </summary>
/// <remarks>
/// The mutation is durable in Storage, but local change-to-data-element mapping was not performed. The unit of work has
/// been rebuilt from Storage's authoritative instance state before this exception is thrown.
/// </remarks>
internal sealed class InstanceMutationReplayedException : Exception
{
    public InstanceMutationReplayedException(string message)
        : base(message) { }
}
