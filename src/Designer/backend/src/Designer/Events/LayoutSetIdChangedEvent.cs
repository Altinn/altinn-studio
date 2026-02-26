#nullable disable
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class LayoutSetIdChangedEvent : INotification
{
    public AltinnRepoEditingContext EditingContext { get; set; }
    public string LayoutSetName { get; set; }
    public string NewLayoutSetName { get; set; }
}
