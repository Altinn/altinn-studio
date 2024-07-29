using System.Collections.Generic;
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class LayoutPageAddedEvent : INotification
{
    public AltinnRepoEditingContext EditingContext { get; set; }
}
