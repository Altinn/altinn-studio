#nullable disable
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class LayoutPageDeletedEvent : INotification
{
    public AltinnRepoEditingContext EditingContext { get; set; }
    public string LayoutSetName { get; set; }
    public string LayoutName { get; set; }
}
