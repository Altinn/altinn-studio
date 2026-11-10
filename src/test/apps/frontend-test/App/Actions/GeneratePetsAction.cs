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
        var data =
            originalData as NestedGroup
            ?? throw new InvalidOperationException(
                "Expected the 'nested-group' data element to hold a NestedGroup model");

        if (context.ButtonId == "load-validation-examples")
        {
            data.Pets =
            [
                new Pet { UniqueId = "validation-showcase-balder", Name = "Balder", Species = "Dog", Age = 4 },
                new Pet { UniqueId = "validation-showcase-maja", Name = "Maja", Species = "Cat", Age = 2 },
                new Pet { UniqueId = "validation-showcase-luna", Name = "Luna", Species = "Rabbit", Age = 3 },
                new Pet { UniqueId = "validation-showcase-felix", Name = "Felix", Species = "Cat", Age = 5 },
                new Pet { UniqueId = "validation-showcase-milo", Name = "Milo", Species = "Dog", Age = 12 },
                new Pet { UniqueId = "validation-showcase-saga", Name = "Saga", Species = "Dog", Age = 7 },
                new Pet { UniqueId = "validation-showcase-nala", Name = "Nala", Species = "Cat", Age = 6 },
            ];
            data.Endringsmeldinggrp9786 ??= new();
            data.Endringsmeldinggrp9786.Avgivergrp9787 ??= new();
            data.Endringsmeldinggrp9786.Avgivergrp9787.OppgavegiverNavndatadef68 = new()
            {
                value = "fields,error,warning,info,success",
            };
            return UserActionResult.SuccessResult([]);
        }

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
        // The repeating group is empty until the user (or 'generatePets') adds rows
        var pets = data.Pets ??= new List<Pet>();
        var existingNumAnimals = pets.Count;
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

        pets.AddRange(newPets);
        data.NumPets = pets.Count;
    }
}
