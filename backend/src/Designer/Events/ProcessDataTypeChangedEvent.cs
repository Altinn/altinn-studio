using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class ProcessDataTypeChangedEvent : INotification
{
    public string OldDataType { get; set; }
    public string NewDataType { get; set; }
    public string ConnectedTaskId { get; set; }
    public AltinnRepoEditingContext EditingContext { get; set; }
}
