using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class LayoutPageAddedEvent : INotification
{
    public AltinnRepoEditingContext EditingContext { get; set; }
    public string LayoutName { get; set; }
    public LayoutSetConfig LayoutSetConfig { get; set; }
}
