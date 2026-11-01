namespace Altinn.Studio.Designer.Filters.Deployments;

/// <summary>
/// Why an app could not be restarted. The frontend shows <c>api_errors.{code}</c>.
/// </summary>
public static class DeploymentErrorCodes
{
    public const string AppNotRunning = nameof(AppNotRunning);
    public const string AppUpdating = nameof(AppUpdating);
    public const string AppPaused = nameof(AppPaused);
    public const string AppDeployedElsewhere = nameof(AppDeployedElsewhere);
}
