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
        var originalDataElement = context.DataMutator.DataElements.First(de => de.DataType == "nested-group");
        var originalData = await context.DataMutator.GetFormData(originalDataElement);
        var data = originalData as NestedGroup;

        if (context.ButtonId == "generatePets")
        {
            GeneratePets(data);
        }
        else if (context.ButtonId == "generateWholeFarm")
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

        return UserActionResult.SuccessResult(new List<ClientAction>());
    }

    private void GeneratePets(NestedGroup data)
    {
        // These pets have to be deterministically generated (no randomness), so we can test this using Cypress
        data.Pets = new List<Pet>();
        data.Pets.Add(new Pet()
        {
            Age = 15,
            Name = "Preben Potet",
            Species = "Dog",
            UniqueId = Guid.NewGuid().ToString(),
        });
        data.Pets.Add(new Pet()
        {
            Age = 1,
            Name = "Reidar Reddik",
            Species = "Cat",
            UniqueId = Guid.NewGuid().ToString(),
        });
        data.Pets.Add(new Pet()
        {
            Age = 3,
            Name = "Siri Spinat",
            Species = "Fish",
            UniqueId = Guid.NewGuid().ToString(),
        });
        data.Pets.Add(new Pet()
        {
            Age = 7,
            Name = "Kåre Kålrot",
            Species = "Hamster",
            UniqueId = Guid.NewGuid().ToString(),
        });
        data.Pets.Add(new Pet()
        {
            Age = 2,
            Name = "Birte Blomkål",
            Species = "Rabbit",
            UniqueId = Guid.NewGuid().ToString(),
        });
        data.Pets.Add(new Pet()
        {
            // This has the same species and name as the one above, which gives a validation error
            Age = 3,
            Name = "Birte Blomkål",
            Species = "Rabbit",
            UniqueId = Guid.NewGuid().ToString(),
        });
        data.NumPets = data.Pets.Count;
    }

    private void GenerateFarmAnimals(NestedGroup data)
    {
        var numAnimals = 250; // This will be painful!
        data.Pets = new List<Pet>();

        for (int i = 0; i < numAnimals; i++)
        {
            var species = i % 2 == 0 ? "Cow" : "Sheep";
            var name = species == "Cow" ? "Dagros #" : "Dolly #";
            name += i.ToString().PadLeft(3, '0');
            data.Pets.Add(new Pet()
            {
                Age = i % 10 + 1,
                Name = name,
                Species = species,
                UniqueId = Guid.NewGuid().ToString(),
            });
        }
        data.NumPets = data.Pets.Count;
    }
}