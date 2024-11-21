using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class ComponentDeletedEvent : INotification
{
    public string ComponentId { get; set; }
    public string LayoutSetName { get; set; }
    public AltinnRepoEditingContext EditingContext { get; set; }
}
