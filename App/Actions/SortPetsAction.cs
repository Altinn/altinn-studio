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

public class SortPetsAction : IUserAction
{
    public string Id => "sortPets";

    private readonly ILogger<SortPetsAction> _logger;
    private readonly IDataClient _dataClient;
    private readonly IAppMetadata _appMetadata;

    public SortPetsAction(ILogger<SortPetsAction> logger, IDataClient dataClient, IAppMetadata appMetadata)
    {
        _logger = logger;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
    }

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        var (dataId, data) = await FetchDataModel(context.Instance);

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

        var userActionResult = UserActionResult.SuccessResult(new List<ClientAction>());
        userActionResult.AddUpdatedDataModel(dataId, data);
        return userActionResult;
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