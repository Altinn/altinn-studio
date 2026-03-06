#nullable enable
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public record DeploymentDispatchRequested : INotification
{
    public required AltinnRepoEditingContext EditingContext { get; set; }
    public required string WorkflowId { get; set; }
    public string? TraceParent { get; set; }
    public string? TraceState { get; set; }
}
