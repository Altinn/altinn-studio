using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public record DeploymentPipelineCompleted : INotification
{
    public required AltinnRepoEditingContext EditingContext { get; set; }
    public required string Environment { get; set; }
    public required PipelineType PipelineType { get; set; }
}
