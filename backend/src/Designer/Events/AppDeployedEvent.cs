using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class AppDeployedEvent : INotification
{
    public AltinnRepoEditingContext EditingContext { get; set; }

    public string StudioEnvironment { get; set; }

    public string AppsEnvironment { get; set; }
    public DeployType DeployType { get; set; }
}

public enum DeployType
{
    NewApp,
    ExistingApp
}
