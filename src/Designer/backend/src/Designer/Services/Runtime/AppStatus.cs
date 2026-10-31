using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Services.Runtime;

/// <summary>
/// Whether an app runs its latest version. A deploy and a restart both replace the app's instances, so the status
/// does not say which of them is underway.
/// </summary>
public enum AppStatus
{
    /// <summary>Every instance runs the latest version and is available.</summary>
    [EnumMember(Value = "ready")]
    Ready,

    /// <summary>Instances are being replaced.</summary>
    [EnumMember(Value = "updating")]
    Updating,

    /// <summary>Not every instance is available, though none is being replaced. A restart may help.</summary>
    [EnumMember(Value = "unavailable")]
    Unavailable,

    /// <summary>Instances stopped being replaced before they were all available.</summary>
    [EnumMember(Value = "failed")]
    Failed,
}
