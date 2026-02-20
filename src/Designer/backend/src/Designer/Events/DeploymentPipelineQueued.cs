#nullable enable
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public record DeploymentPipelineQueued : INotification
{
    public required AltinnRepoEditingContext EditingContext { get; set; }
    public required int BuildId { get; set; }
    public required string Environment { get; set; }
    public required PipelineType PipelineType { get; set; }
    public string? TraceParent { get; set; }
    public string? TraceState { get; set; }
}

public enum PipelineType
{
    Deploy,
    Undeploy
}
