namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// Why a run failed.
/// </summary>
/// <param name="Reason">
/// One of the values in <see cref="RunErrorReason"/>. A string, so that a reason a newer operator adds does not make
/// the run unreadable.
/// </param>
/// <param name="Detail">What went wrong, for a person to read.</param>
internal sealed record RunError(string Reason, string Detail);

/// <summary>
/// The reasons the operator gives in <see cref="RunError.Reason"/>.
/// </summary>
internal static class RunErrorReason
{
    /// <summary>The run waited longer in the queue than its kind allows.</summary>
    public const string QueueTimeout = "queue-timeout";

    /// <summary>The Job or its pod did not start.</summary>
    public const string StartFailed = "start-failed";

    /// <summary>No archive arrived within <see cref="Kind.UploadTimeoutSeconds"/>.</summary>
    public const string ArchiveTimeout = "archive-timeout";

    /// <summary>The command could not run, such as for an archive that does not extract.</summary>
    public const string RunFailed = "run-failed";

    /// <summary>The operator itself failed.</summary>
    public const string Internal = "internal";
}
