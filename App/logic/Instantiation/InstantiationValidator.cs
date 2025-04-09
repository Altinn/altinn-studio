using System.Threading.Tasks;
using Altinn.App.Core.Features;

namespace Altinn.App.Logic.Instantiation;

using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

public class InstantiationValidator : IInstantiationValidator
{
    public Task<InstantiationValidationResult> Validate(Instance instance)
    {
        if (instance.InstanceOwner.OrganisationNumber is "950474084" or "310732001")
        {
            return Task.FromResult(new InstantiationValidationResult()
            {
                Valid = false,
                Message = "err_instantiation"
            });
        }

        return Task.FromResult(new InstantiationValidationResult()
        {
            Valid = true,
            Message = string.Empty
        });
    }
}