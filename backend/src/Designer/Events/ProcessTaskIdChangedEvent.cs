using MediatR;

namespace Altinn.Studio.Designer.Events;

public class ProcessTaskIdChangedEvent : INotification
{
    public string OldId { get; set; }
    public string NewId { get; set; }
}
