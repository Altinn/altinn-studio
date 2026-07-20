namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Raised when a caller-supplied process-state version does not match the version loaded for the instance.
/// </summary>
internal sealed class ProcessStateStaleException : InstanceStateConflictException
{
    public ProcessStateStaleException(int expectedVersion, int actualVersion)
        : base($"Expected process-state version {expectedVersion}, but the current version is {actualVersion}.")
    {
        ExpectedVersion = expectedVersion;
        ActualVersion = actualVersion;
    }

    public int ExpectedVersion { get; }

    public int ActualVersion { get; }
}
