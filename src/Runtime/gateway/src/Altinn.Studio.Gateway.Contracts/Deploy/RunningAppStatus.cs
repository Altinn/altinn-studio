using System.Text.Json.Serialization;

namespace Altinn.Studio.Gateway.Contracts.Deploy;

/// <summary>
/// Whether the app runs its latest version. A deploy and a restart both replace the app's instances, so the status
/// does not say which of them is underway.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<RunningAppStatus>))]
public enum RunningAppStatus
{
    /// <summary>Every instance runs the latest version and is available.</summary>
    [JsonStringEnumMemberName("ready")]
    Ready,

    /// <summary>Instances are being replaced.</summary>
    [JsonStringEnumMemberName("updating")]
    Updating,

    /// <summary>Instances stopped being replaced before they were all available, such as when they keep crashing.</summary>
    [JsonStringEnumMemberName("failed")]
    Failed,
}
