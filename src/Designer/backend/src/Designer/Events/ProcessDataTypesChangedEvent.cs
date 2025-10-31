#nullable disable
using System.Collections.Generic;
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class ProcessDataTypesChangedEvent : INotification
{
    public List<string> NewDataTypes { get; set; }
    public string ConnectedTaskId { get; set; }
    public AltinnRepoEditingContext EditingContext { get; set; }
}
