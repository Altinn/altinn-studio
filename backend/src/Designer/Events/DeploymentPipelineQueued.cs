using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class DeploymentPipelineQueued : INotification
{
    public required AltinnRepoEditingContext EditingContext { get; set; }
    public required int BuildId { get; set; }
}
