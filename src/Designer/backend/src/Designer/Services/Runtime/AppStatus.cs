using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Services.Runtime;

/// <summary>
/// Whether an app runs its latest version. A deploy and a restart both replace the app's instances, so the status
/// does not say which of them is underway.
/// </summary>
public enum AppStatus
{
    /// <summary>Every instance runs the latest version and is available, or is on its way to.</summary>
    [EnumMember(Value = "ready")]
    Ready,

    /// <summary>Instances are being replaced, and the new ones are on their way to becoming available.</summary>
    [EnumMember(Value = "updating")]
    Updating,

    /// <summary>
    /// New instances fail to start, so the replacement does not finish. Some instances still answer, usually the
    /// previous ones.
    /// </summary>
    [EnumMember(Value = "stuck")]
    Stuck,

    /// <summary>No instance is being replaced, but some fail or are missing. The others still answer.</summary>
    [EnumMember(Value = "degraded")]
    Degraded,

    /// <summary>No instance answers.</summary>
    [EnumMember(Value = "unavailable")]
    Unavailable,
}
