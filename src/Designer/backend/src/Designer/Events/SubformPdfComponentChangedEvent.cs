using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class SubformPdfComponentChangedEvent : INotification
{
    public required AltinnRepoEditingContext EditingContext { get; init; }
    public required SubformPdfComponentChange Change { get; init; }
}
