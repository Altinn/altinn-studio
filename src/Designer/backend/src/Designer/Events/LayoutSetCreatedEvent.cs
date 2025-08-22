using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class LayoutSetCreatedEvent : INotification
{
    public LayoutSetConfig LayoutSet { get; set; }
    public AltinnRepoEditingContext EditingContext { get; set; }
}
