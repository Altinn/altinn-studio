#nullable disable
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class ProcessTaskIdChangedEvent : INotification
{
    public string OldId { get; set; }
    public string NewId { get; set; }
    public AltinnRepoEditingContext EditingContext { get; set; }

    /// <summary>
    /// When true, handlers propagate failures without notifying; the publisher sends the final notification.
    /// </summary>
    public bool PublisherNotifies { get; set; }
}
