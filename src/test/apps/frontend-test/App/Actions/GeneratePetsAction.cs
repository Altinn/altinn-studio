using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models;

namespace Altinn.App.Actions;

public class GeneratePetsAction : IUserAction
{
    public string Id => "generatePets";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        var originalDataElements = context.DataMutator.GetDataElementsForType("nested-group");
        var originalData = await context.DataMutator.GetFormData(originalDataElements.First());
        var data = originalData as NestedGroup;

        if (context.ButtonId == "generatePets")
        {
            GeneratePets(data);
        }
        else if (
            context.ButtonId == "generateWholeFarm"
            || context.ButtonId == "generateAnotherFarm"
        )
        {
            GenerateFarmAnimals(data);
        }

        // This makes sure the group is now visible, and that the panel disappears, even if the user clicked any other
        // button than the one with the id "generatePets" (which in practice will let you add pets to the list manually)
        data.ForceShowPets = true;

        if (context.ButtonId == "resetButton")
        {
            data.Pets = new List<Pet>();
            data.NumPets = 0;
            data.ForceShowPets = false;
            data.PetsUseOptionComponent = null;
        }

        return UserActionResult.SuccessResult([]);
    }

    private static void GeneratePets(NestedGroup data)
    {
        // These pets have to be deterministically generated (no randomness), so we can test this using Cypress
        data.Pets =
        [
            new Pet()
            {
                Age = 15,
                Name = "Preben Potet",
                Species = "Dog",
                UniqueId = Guid.NewGuid().ToString(),
            },
            new Pet()
            {
                Age = 1,
                Name = "Reidar Reddik",
                Species = "Cat",
                UniqueId = Guid.NewGuid().ToString(),
            },
            new Pet()
            {
                Age = 3,
                Name = "Siri Spinat",
                Species = "Fish",
                UniqueId = Guid.NewGuid().ToString(),
            },
            new Pet()
            {
                Age = 7,
                Name = "Kåre Kålrot",
                Species = "Hamster",
                UniqueId = Guid.NewGuid().ToString(),
            },
            new Pet()
            {
                Age = 2,
                Name = "Birte Blomkål",
                Species = "Rabbit",
                UniqueId = Guid.NewGuid().ToString(),
            },
            new Pet()
            {
                // This has the same species and name as the one above, which gives a validation error
                Age = 3,
                Name = "Birte Blomkål",
                Species = "Rabbit",
                UniqueId = Guid.NewGuid().ToString(),
            },
        ];
        data.NumPets = data.Pets.Count;
    }

    private static void GenerateFarmAnimals(NestedGroup data)
    {
        var existingNumAnimals = data.Pets.Count;
        var additionalAnimals = 250;

        var newPets = new Pet[additionalAnimals];

        for (int i = 0; i < additionalAnimals; i++)
        {
            var animalIndex = existingNumAnimals + i;
            var species = animalIndex % 2 == 0 ? "Cow" : "Sheep";
            var name =
                (species == "Cow" ? "Dagros #" : "Dolly #")
                + animalIndex.ToString().PadLeft(3, '0');

            newPets[i] = new Pet
            {
                Age = animalIndex % 10 + 1,
                Name = name,
                Species = species,
                UniqueId = Guid.NewGuid().ToString(),
            };
        }

        data.Pets.AddRange(newPets);
        data.NumPets = data.Pets.Count;
    }
}
