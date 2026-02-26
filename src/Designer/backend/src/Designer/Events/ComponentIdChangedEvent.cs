#nullable disable
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class ComponentIdChangedEvent : INotification
{
    public string OldComponentId { get; set; }
    public string NewComponentId { get; set; }
    public string LayoutSetName { get; set; }
    public AltinnRepoEditingContext EditingContext { get; set; }
}
