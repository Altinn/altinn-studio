using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models;

namespace Altinn.App.Actions;

public class SortPetsAction : IUserAction
{
    public string Id => "sortPets";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        var originalDataElements = context.DataMutator.GetDataElementsForType("nested-group");
        var originalData = await context.DataMutator.GetFormData(originalDataElements.First());
        var data =
            originalData as NestedGroup
            ?? throw new InvalidOperationException(
                "Expected the 'nested-group' data element to hold a NestedGroup model");

        // Valid sort orders can be found in 'pet-sort-order.json'
        var sortOrder = data.PetSortOrder;

        // The repeating group is empty until the user (or 'generatePets') adds rows
        var pets = data.Pets ?? new List<Pet>();

        // Always secondary sort by age
        if (sortOrder == "ascSpecies")
        {
            data.Pets = pets.OrderBy(p => p.SpeciesLabel).ThenBy(p => p.Age).ToList();
            data.PetSortOrder = "descSpecies";
        }
        else if (sortOrder == "descSpecies")
        {
            data.Pets = pets.OrderByDescending(p => p.SpeciesLabel).ThenBy(p => p.Age).ToList();
            data.PetSortOrder = "ascSpecies";
        }
        else if (sortOrder == "ascName")
        {
            data.Pets = pets.OrderBy(p => p.Name).ThenBy(p => p.Age).ToList();
            data.PetSortOrder = "descName";
        }
        else if (sortOrder == "descName")
        {
            data.Pets = pets.OrderByDescending(p => p.Name).ThenBy(p => p.Age).ToList();
            data.PetSortOrder = "ascName";
        }
        else if (sortOrder == "ascAge")
        {
            data.Pets = pets.OrderBy(p => p.Age).ToList();
            data.PetSortOrder = "descAge";
        }
        else if (sortOrder == "descAge")
        {
            data.Pets = pets.OrderByDescending(p => p.Age).ToList();
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
                    { "sortOrder", sortOrder ?? string.Empty },
                }
            });
        }

        return UserActionResult.SuccessResult(new List<ClientAction>());
    }
}