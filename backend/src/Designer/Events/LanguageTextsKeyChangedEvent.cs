using System.Collections.Generic;
using Altinn.Studio.Designer.Models;
using MediatR;

namespace Altinn.Studio.Designer.Events;

public class LanguageTextsKeyChangedEvent : INotification
{
    public List<TextIdMutation> idMutations { get; set; }
    public AltinnRepoEditingContext EditingContext { get; set; }
}
