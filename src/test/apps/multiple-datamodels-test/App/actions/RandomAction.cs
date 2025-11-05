using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models.modell1;
using Altinn.App.Models.modell2;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Actions;

public class RandomAction : IUserAction
{
    private readonly ILogger<RandomAction> _logger;
    private readonly IDataClient _dataClient;
    private readonly IAppMetadata _appMetadata;
    private readonly Random _random;

    public RandomAction(
        ILogger<RandomAction> logger,
        IDataClient dataClient,
        IAppMetadata appMetadata
    )
    {
        _logger = logger;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
        _random = new Random();
    }

    public string Id => "random";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(context.Instance);
        var applicationMetadata = await _appMetadata.GetApplicationMetadata();
        _logger.LogInformation("RandomAction triggered");

        var task1 = FetchDataModel<modell1>(context.Instance, "modell1");
        var task2 = FetchDataModel<modell2>(context.Instance, "modell2");

        await Task.WhenAll(task1, task2);

        var (dataId1, data1) = task1.Result;
        var (dataId2, data2) = task2.Result;

        if (data2.shouldsucceed != "yes")
        {
            return UserActionResult.FailureResult(
                new ActionError()
                {
                    Code = "machine-readable-error-code",
                    Message = "Du må krysse av for vellykket",
                    Metadata = new Dictionary<string, string>() { { "key1", "value1" }, }
                }
            );
        }

        data1.randomnum = _random.Next();
        data2.randomchar = RandomString(12);

        await Task.WhenAll(
            _dataClient.UpdateData(
                data1,
                instanceIdentifier.InstanceGuid,
                typeof(modell1),
                applicationMetadata.AppIdentifier.Org,
                applicationMetadata.AppIdentifier.App,
                instanceIdentifier.InstanceOwnerPartyId,
                new Guid(dataId1)
            ),
            _dataClient.UpdateData(
                data2,
                instanceIdentifier.InstanceGuid,
                typeof(modell2),
                applicationMetadata.AppIdentifier.Org,
                applicationMetadata.AppIdentifier.App,
                instanceIdentifier.InstanceOwnerPartyId,
                new Guid(dataId2)
            )
        );

        var userActionResult = UserActionResult.SuccessResult();
        userActionResult.AddUpdatedDataModel(dataId1, data1);
        userActionResult.AddUpdatedDataModel(dataId2, data2);
        return userActionResult;
    }

    private string RandomString(int length)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return new string(
            Enumerable.Repeat(chars, length).Select(s => s[_random.Next(s.Length)]).ToArray()
        );
    }

    private async Task<(string, T)> FetchDataModel<T>(Instance instance, string dataTypeId)
    {
        var dataModel = instance.Data.FirstOrDefault(d => d.DataType.Equals(dataTypeId));
        if (dataModel == null)
        {
            throw new ArgumentException("Failed to locate data model");
        }

        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
        var applicationMetadata = await _appMetadata.GetApplicationMetadata();
        var dataElement = await _dataClient.GetFormData(
            instanceIdentifier.InstanceGuid,
            typeof(T),
            applicationMetadata.AppIdentifier.Org,
            applicationMetadata.AppIdentifier.App,
            instanceIdentifier.InstanceOwnerPartyId,
            new Guid(dataModel.Id)
        );
        if (dataElement == null || dataElement is not T)
        {
            throw new ArgumentException($"Failed to locate data element of type {dataTypeId}");
        }

        return ((string, T))(dataModel.Id, dataElement);
    }
}
