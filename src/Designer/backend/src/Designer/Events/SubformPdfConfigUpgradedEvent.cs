using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class SubformPdfConfigUpgradedEvent : INotification
{
    public required AltinnRepoEditingContext EditingContext { get; init; }
    public required SubformPdfConfigUpgrade Upgrade { get; init; }
}
