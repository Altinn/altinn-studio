using System.Threading.Tasks;
using Altinn.App.Core.Features;

namespace Altinn.App.Logic.Instantiation;

using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

public class InstantiationValidator : IInstantiationValidator
{
    public Task<InstantiationValidationResult> Validate(Instance instance)
    {
        const string invalidLocal = "512001"; // MultParty Prompt
        const string invalidTt02 = "310732001"; // Søvnig Impulsiv Tiger AS

        if (instance.InstanceOwner.OrganisationNumber is invalidTt02 || instance.InstanceOwner.PartyId == invalidLocal)
        {
            return Task.FromResult(
                new InstantiationValidationResult() { Valid = false, Message = "err_instantiation" }
            );
        }

        return Task.FromResult(
            new InstantiationValidationResult() { Valid = true, Message = string.Empty }
        );
    }
}
