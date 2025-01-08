using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Actions;

public class GeneratePetsAction : IUserAction
{
    public string Id => "generatePets";

    private readonly ILogger<GeneratePetsAction> _logger;
    private readonly IDataClient _dataClient;
    private readonly IAppMetadata _appMetadata;

    public GeneratePetsAction(ILogger<GeneratePetsAction> logger, IDataClient dataClient, IAppMetadata appMetadata)
    {
        _logger = logger;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
    }

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        var (dataId, data) = await FetchDataModel(context.Instance);

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

        var userActionResult = UserActionResult.SuccessResult(new List<ClientAction>());
        userActionResult.AddUpdatedDataModel(dataId, data);
        return userActionResult;
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

    private async Task<(string, NestedGroup)> FetchDataModel(Instance instance)
    {
        var dataModel = instance.Data.FirstOrDefault(d => d.DataType.Equals("nested-group"));
        if (dataModel == null)
        {
            throw new ArgumentException("Failed to locate data model");
        }

        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
        var applicationMetadata = await _appMetadata.GetApplicationMetadata();
        var dataElement = await _dataClient.GetFormData(instanceIdentifier.InstanceGuid, typeof(NestedGroup),
            applicationMetadata.AppIdentifier.Org, applicationMetadata.AppIdentifier.App,
            instanceIdentifier.InstanceOwnerPartyId,
            new Guid(dataModel.Id));
        if (dataElement == null || dataElement is not NestedGroup)
        {
            throw new ArgumentException($"Failed to load data element for nested-group with id {dataModel.Id}");
        }

        return ((string, NestedGroup))(dataModel.Id, dataElement);
    }
}