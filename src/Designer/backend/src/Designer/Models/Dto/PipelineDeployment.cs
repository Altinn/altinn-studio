using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// A deploy or undeploy of an app through the deploy pipeline. Its JSON is what <see cref="DeploymentEntity"/> gave
/// when the API returned the entity itself, so frontends read it as before.
/// </summary>
public sealed class PipelineDeployment
{
    public required string TagName { get; init; }

    public required string EnvName { get; init; }

    public required DeploymentType DeploymentType { get; init; }

    public PipelineBuild? Build { get; init; }

    public required IReadOnlyList<PipelineDeployEvent> Events { get; init; }

    public required DateTime Created { get; init; }

    public string? CreatedBy { get; init; }

    public required string App { get; init; }

    public required string Org { get; init; }

    public static PipelineDeployment From(DeploymentEntity deployment) =>
        new()
        {
            TagName = deployment.TagName,
            EnvName = deployment.EnvName,
            DeploymentType = deployment.DeploymentType,
            Build = deployment.Build is { } build ? PipelineBuild.From(build) : null,
            Events = (deployment.Events ?? []).Select(PipelineDeployEvent.From).ToList(),
            Created = deployment.Created,
            CreatedBy = deployment.CreatedBy,
            App = deployment.App,
            Org = deployment.Org,
        };
}

/// <summary>
/// The Azure DevOps build that runs a <see cref="PipelineDeployment"/>.
/// </summary>
public sealed class PipelineBuild
{
    public required string Id { get; init; }

    public required BuildStatus Status { get; init; }

    public required BuildResult Result { get; init; }

    public DateTime? Started { get; init; }

    public DateTime? Finished { get; init; }

    public static PipelineBuild From(BuildEntity build) =>
        new()
        {
            Id = build.Id,
            Status = build.Status,
            Result = build.Result,
            Started = build.Started,
            Finished = build.Finished,
        };
}

/// <summary>
/// Something that happened to a <see cref="PipelineDeployment"/>, such as its pipeline finishing or Flux installing it.
/// </summary>
public sealed class PipelineDeployEvent
{
    public string? Message { get; init; }

    public required DateTimeOffset Timestamp { get; init; }

    public required DeployEventType EventType { get; init; }

    public required DateTimeOffset Created { get; init; }

    public required DeployEventOrigin Origin { get; init; }

    public static PipelineDeployEvent From(DeployEvent deployEvent) =>
        new()
        {
            Message = deployEvent.Message,
            Timestamp = deployEvent.Timestamp,
            EventType = deployEvent.EventType,
            Created = deployEvent.Created,
            Origin = deployEvent.Origin,
        };
}
