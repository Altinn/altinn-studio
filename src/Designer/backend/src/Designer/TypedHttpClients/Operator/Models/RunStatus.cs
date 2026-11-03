using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// Where a run is. <see cref="Completed"/>, <see cref="Failed"/>, <see cref="Canceled"/> and <see cref="Expired"/>
/// are final. A create after a run has ended starts a new run, which retries one that failed or expired.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<RunStatus>))]
internal enum RunStatus
{
    /// <summary>The run waits for sandbox capacity.</summary>
    [JsonStringEnumMemberName("queued")]
    Queued,

    /// <summary>The operator creates the Job and waits for its pod.</summary>
    [JsonStringEnumMemberName("starting")]
    Starting,

    /// <summary>
    /// The Job is ready. Upload the archive with <see cref="IOperatorClient.UploadArchive"/> within
    /// <see cref="Kind.UploadTimeoutSeconds"/>, or the run fails.
    /// </summary>
    [JsonStringEnumMemberName("awaiting-archive")]
    AwaitingArchive,

    /// <summary>The command runs in the sandbox.</summary>
    [JsonStringEnumMemberName("running")]
    Running,

    /// <summary>
    /// The command ran and has a result, whatever its exit code. Whether it did what the caller wanted is in the
    /// result, such as in its report. Fetch it by <see cref="Run.ResultExpiresAt"/>.
    /// </summary>
    [JsonStringEnumMemberName("completed")]
    Completed,

    /// <summary>The run could not complete. <see cref="Run.Error"/> says why.</summary>
    [JsonStringEnumMemberName("failed")]
    Failed,

    /// <summary>The caller canceled the run.</summary>
    [JsonStringEnumMemberName("canceled")]
    Canceled,

    /// <summary>The run waited longer in the queue than its kind allows.</summary>
    [JsonStringEnumMemberName("expired")]
    Expired,
}
