using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class LayoutSetDeletedEvent : INotification
{
    public AltinnRepoEditingContext EditingContext { get; set; }
    public string LayoutSetName { get; set; }
}
