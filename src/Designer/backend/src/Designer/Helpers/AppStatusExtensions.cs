using Altinn.Platform.Storage.Interface.Enums;

namespace Altinn.Studio.Designer.Helpers;

public static class AppStatusExtensions
{
    /// <summary>
    /// Whether a released version of the app can carry the status. <see cref="AppStatus.Deprecated"/> is only set
    /// when the app is undeployed, and <see cref="AppStatus.Withdrawn"/> is not in use.
    /// </summary>
    public static bool IsReleaseStatus(this AppStatus status) =>
        status is AppStatus.UnderDevelopment or AppStatus.Completed;
}
