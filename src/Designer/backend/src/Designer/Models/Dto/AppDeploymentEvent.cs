using System;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// A deploy or undeploy of an app that finished, for the admin page to mark in its charts.
/// </summary>
public class AppDeploymentEvent
{
    /// <summary>
    /// The version that was deployed, as the app's own release tag.
    /// </summary>
    public required string TagName { get; init; }

    /// <summary>
    /// "deploy" or "decommission".
    /// </summary>
    public required string DeploymentType { get; init; }

    /// <summary>
    /// When the pipeline finished, which is when the change reached the environment.
    /// </summary>
    public required DateTimeOffset FinishedAt { get; init; }

    public required string CreatedBy { get; init; }
}
