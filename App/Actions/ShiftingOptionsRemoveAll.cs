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
using Altinn.App.services.options;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Actions;

public class ShiftingOptionsRemoveAll(IDataClient dataClient, IAppMetadata appMetadata) : IUserAction
{
    public string Id => "shiftingOptionsRemoveAll";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(context.Instance);
        var applicationMetadata = await appMetadata.GetApplicationMetadata();
        var (dataId, _, data) = await FetchDataModel(context.Instance, "ServiceModel-test");

        RemoveAllRows(data);

        await dataClient.UpdateData(data, instanceIdentifier.InstanceGuid, typeof(Skjema),
            applicationMetadata.AppIdentifier.Org, applicationMetadata.AppIdentifier.App,
            instanceIdentifier.InstanceOwnerPartyId,
            new Guid(dataId));
        var userActionResult = UserActionResult.SuccessResult(new List<ClientAction>());
        userActionResult.AddUpdatedDataModel(dataId, data);
        return userActionResult;
    }

    public static void RemoveAllRows(Skjema data)
    {
        data.ShiftingOptions ??= new ShiftingOptions();
        data.ShiftingOptions.Balloons ??= new List<Balloon>();
        data.ShiftingOptions.Balloons.Clear();
    }

    private async Task<(string, string, Skjema)> FetchDataModel(Instance instance, string dataTypeId)
    {
        var dataModel = instance.Data.FirstOrDefault(d => d.DataType.Equals(dataTypeId));
        if (dataModel == null)
        {
            throw new ArgumentException("Failed to locate data model");
        }

        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
        var applicationMetadata = await appMetadata.GetApplicationMetadata();
        var dataElement = await dataClient.GetFormData(instanceIdentifier.InstanceGuid, typeof(Skjema),
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