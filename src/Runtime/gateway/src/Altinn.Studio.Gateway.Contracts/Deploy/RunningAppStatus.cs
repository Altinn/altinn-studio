using System.Text.Json.Serialization;

namespace Altinn.Studio.Gateway.Contracts.Deploy;

/// <summary>
/// Whether the app runs its latest version, and whether it answers. A deploy and a restart both replace the app's
/// instances, so the status does not say which of them is underway.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<RunningAppStatus>))]
public enum RunningAppStatus
{
    /// <summary>
    /// Every instance runs the latest version and is available, or is starting or being created, such as after a
    /// scale-up.
    /// </summary>
    [JsonStringEnumMemberName("ready")]
    Ready,

    /// <summary>
    /// Instances are being replaced, or created for the first time, and the new ones are on their way to becoming
    /// available.
    /// </summary>
    [JsonStringEnumMemberName("updating")]
    Updating,

    /// <summary>
    /// New instances fail to start, such as when they keep crashing or the cluster refuses to create them, so the
    /// replacement does not finish. Some instances still answer, usually the previous ones.
    /// </summary>
    [JsonStringEnumMemberName("stuck")]
    Stuck,

    /// <summary>
    /// No instance is being replaced, but some fail or are missing, such as when they keep crashing, find no room in
    /// the cluster, or the cluster refuses to create them. The others still answer. A restart may help.
    /// </summary>
    [JsonStringEnumMemberName("degraded")]
    Degraded,

    /// <summary>No instance answers, other than while the app's first instances start.</summary>
    [JsonStringEnumMemberName("unavailable")]
    Unavailable,
}
