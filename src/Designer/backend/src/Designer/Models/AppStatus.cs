namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Lifecycle status of an app in an environment, registered in Storage and Resource Registry on deploy and undeploy.
/// The values are a subset of the statuses supported by resource administration.
/// </summary>
public enum AppStatus
{
    UnderDevelopment,
    Completed,
    Deprecated,
}
