using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Runtime;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The app as it runs in an environment.
/// </summary>
public sealed class RunningApp
{
    public required string Environment { get; init; }

    /// <summary>
    /// The deployed tag, or null when the runtime gateway could not tell it.
    /// </summary>
    public string? Version { get; init; }

    /// <summary>
    /// The build of the deploy that runs, or null when the app has not been deployed since the deploy pipeline began
    /// recording it. It matches the deploy's <see cref="Repository.Models.BuildEntity.Id"/> when this Studio
    /// environment deployed it.
    /// </summary>
    public string? BuildId { get; init; }

    /// <summary>
    /// Whether the app runs its latest version, or null when the runtime could not tell.
    /// </summary>
    public AppStatus? Status { get; init; }

    /// <summary>
    /// When the app was last restarted without a deploy.
    /// </summary>
    public DateTimeOffset? RestartedAt { get; init; }

    /// <summary>
    /// Whether this Studio environment may restart the app, once it is not <see cref="AppStatus.Updating"/>.
    /// </summary>
    public bool CanRestart { get; init; }

    /// <summary>
    /// When the deploy that runs finished, or null when this Studio environment has no record of it, such as when
    /// another Studio environment deployed the app.
    /// </summary>
    public DateTime? PublishedAt { get; init; }

    /// <param name="running">The app as it runs.</param>
    /// <param name="deployments">This Studio environment's deploys of the app to the environment, in any order.</param>
    public static RunningApp From(AppRunState.Running running, IEnumerable<DeploymentEntity> deployments) =>
        new()
        {
            Environment = running.Environment,
            Version = running.Version,
            BuildId = running.BuildId,
            Status = running.Status,
            RestartedAt = running.RestartedAt,
            CanRestart = running.CanRestart,
            PublishedAt = DeployThatRuns(running, deployments)?.Build?.Finished,
        };

    /// <summary>
    /// Every Studio environment queues its deploys in the same Azure DevOps organization, whose build ids are unique,
    /// so another Studio environment's deploy matches none. Without a build id, the latest deploy of the tag is the
    /// best match there is, though the same tag can have been deployed more than once.
    /// </summary>
    private static DeploymentEntity? DeployThatRuns(
        AppRunState.Running running,
        IEnumerable<DeploymentEntity> deployments
    )
    {
        IEnumerable<DeploymentEntity> deploys = deployments.Where(deployment =>
            deployment.DeploymentType == DeploymentType.Deploy
            && string.Equals(deployment.EnvName, running.Environment, StringComparison.OrdinalIgnoreCase)
        );
        return running.BuildId is { } buildId
            ? deploys.FirstOrDefault(deployment => deployment.Build?.Id == buildId)
            : deploys
                .Where(deployment => deployment.TagName == running.Version)
                .MaxBy(deployment => deployment.Created);
    }
}
