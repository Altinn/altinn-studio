using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

/// <summary>
/// Raised after the process definition has been written to the repository, on every save. Handlers of
/// this event read the saved BPMN themselves and keep other files consistent with it, so the event
/// carries no description of what changed.
/// </summary>
public class ProcessDefinitionSavedEvent : INotification
{
    public required AltinnRepoEditingContext EditingContext { get; init; }
}
