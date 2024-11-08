using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models;

namespace Altinn.App.Actions;

public class SortPetsAction : IUserAction
{
    public string Id => "sortPets";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        var originalDataElement = context.DataMutator.DataElements.First(de => de.DataType == "nested-group");
        var originalData = await context.DataMutator.GetFormData(originalDataElement);
        var data = originalData as NestedGroup;

        // Valid sort orders can be found in 'pet-sort-order.json'
        var sortOrder = data.PetSortOrder;

        // Always secondary sort by age
        if (sortOrder == "ascSpecies")
        {
            data.Pets = data.Pets.OrderBy(p => p.SpeciesLabel).ThenBy(p => p.Age).ToList();
            data.PetSortOrder = "descSpecies";
        }
        else if (sortOrder == "descSpecies")
        {
            data.Pets = data.Pets.OrderByDescending(p => p.SpeciesLabel).ThenBy(p => p.Age).ToList();
            data.PetSortOrder = "ascSpecies";
        }
        else if (sortOrder == "ascName")
        {
            data.Pets = data.Pets.OrderBy(p => p.Name).ThenBy(p => p.Age).ToList();
            data.PetSortOrder = "descName";
        }
        else if (sortOrder == "descName")
        {
            data.Pets = data.Pets.OrderByDescending(p => p.Name).ThenBy(p => p.Age).ToList();
            data.PetSortOrder = "ascName";
        }
        else if (sortOrder == "ascAge")
        {
            data.Pets = data.Pets.OrderBy(p => p.Age).ToList();
            data.PetSortOrder = "descAge";
        }
        else if (sortOrder == "descAge")
        {
            data.Pets = data.Pets.OrderByDescending(p => p.Age).ToList();
            data.PetSortOrder = "ascAge";
        }
        else
        {
            return UserActionResult.FailureResult(new ActionError()
            {
                Code = "invalid-sort-order",
                Message = "Invalid sort order in data model",
                Metadata = new Dictionary<string, string>()
                {
                    { "sortOrder", sortOrder },
                }
            });
        }

        return UserActionResult.SuccessResult(new List<ClientAction>());
    }
}