using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class LayoutSetDeletedEvent : INotification
{
    public string LayoutSetId { get; set; }
    public AltinnRepoEditingContext EditingContext { get; set; }
}
