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

public class FillAction : IUserAction
{
    private readonly ILogger<FillAction> _logger;
    private readonly IDataClient _dataClient;
    private readonly IAppMetadata _appMetadata;

    public FillAction(ILogger<FillAction> logger, IDataClient dataClient, IAppMetadata appMetadata)
    {
        _logger = logger;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
    }

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(context.Instance);
        var applicationMetadata = await _appMetadata.GetApplicationMetadata();
        _logger.LogInformation("FillAction triggered");
        var (dataId, dataType, data) = await FetchDataModel(context.Instance, "ServiceModel-test");

        if (data.TestCustomButtonInput == "Hello b")
        {
            return UserActionResult.FailureResult(new ActionError()
            {
                Code = "machine-readable-error-code",
                Message = "Her kommer det en feilmelding",
                Metadata = new Dictionary<string, string>()
                {
                    { "key1", "value1" },
                }
            });
        }

        if (data.TestCustomButtonInput == "Generate frontend actions")
        {
            return UserActionResult.SuccessResult(new List<ClientAction>()
                { ClientAction.NextPage(), ClientAction.PreviousPage(), ClientAction.NavigateToPage("grid") });
        }

        data.TestCustomButtonReadOnlyInput = "Her kommer det data fra backend";
        await _dataClient.UpdateData(data, instanceIdentifier.InstanceGuid, typeof(Skjema),
            applicationMetadata.AppIdentifier.Org, applicationMetadata.AppIdentifier.App,
            instanceIdentifier.InstanceOwnerPartyId,
            new Guid(dataId));
        var userActionResult = UserActionResult.SuccessResult(new List<ClientAction>());
        userActionResult.AddUpdatedDataModel(dataId, data);
        return userActionResult;
    }

    public string Id => "fill";

    private async Task<(string, string, Skjema)> FetchDataModel(Instance instance, string dataTypeId)
    {
        var dataModel = instance.Data.FirstOrDefault(d => d.DataType.Equals(dataTypeId));
        if (dataModel == null)
        {
            throw new ArgumentException("Failed to locate data model");
        }

        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
        var applicationMetadata = await _appMetadata.GetApplicationMetadata();
        var dataElement = await _dataClient.GetFormData(instanceIdentifier.InstanceGuid, typeof(Skjema),
            applicationMetadata.AppIdentifier.Org, applicationMetadata.AppIdentifier.App,
            instanceIdentifier.InstanceOwnerPartyId,
            new Guid(dataModel.Id));
        if (dataElement == null || dataElement is not Skjema)
        {
            throw new ArgumentException($"Failed to locate data element of type {dataTypeId}");
        }

        return ((string, string, Skjema))(dataModel.Id, dataModel.DataType, dataElement);
    }
}