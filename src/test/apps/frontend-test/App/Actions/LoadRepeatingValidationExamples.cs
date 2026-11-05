using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models;

namespace Altinn.App.Actions;

/// <summary>
/// Loads shared example rows without changing the initial data used by other test pages.
/// </summary>
internal sealed class LoadRepeatingValidationExamples : IUserAction
{
    /// <inheritdoc />
    public string Id => "loadRepeatingValidationExamples";

    /// <inheritdoc />
    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        var data = await context.DataMutator.GetFormData<NestedGroup>()
            ?? throw new InvalidOperationException("Expected the nested-group data element to exist");
        data.Pets =
        [
            new Pet { UniqueId = "validation-showcase-balder", Name = "Balder", Species = "Dog", Age = 4 },
            new Pet { UniqueId = "validation-showcase-maja", Name = "Maja", Species = "Cat", Age = 2 },
            new Pet { UniqueId = "validation-showcase-luna", Name = "Luna", Species = "Rabbit", Age = 3 },
            new Pet { UniqueId = "validation-showcase-felix", Name = "Felix", Species = "Cat", Age = 5 },
            new Pet { UniqueId = "validation-showcase-milo", Name = "Milo", Species = "Dog", Age = 12 },
            new Pet { UniqueId = "validation-showcase-saga", Name = "Saga", Species = "Dog", Age = 7 },
        ];
        data.Endringsmeldinggrp9786 ??= new();
        data.Endringsmeldinggrp9786.Avgivergrp9787 ??= new();
        data.Endringsmeldinggrp9786.Avgivergrp9787.OppgavegiverNavndatadef68 = new()
        {
            value = "fields,error,warning,info,success",
        };
        return UserActionResult.SuccessResult([]);
    }
}
