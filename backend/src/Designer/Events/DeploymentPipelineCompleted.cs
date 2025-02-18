using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public record DeploymentPipelineCompleted : INotification
{

    public required AltinnRepoEditingContext EditingContext { get; init; }
    public required string Environment { get; init; }
    public required PipelineType PipelineType { get; init; }
    public required bool Succeeded { get; init; }
}
