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

namespace Altinn.App.Actions;

public class ConflictingOptionsReset(IDataClient dataClient, IAppMetadata appMetadata) : IUserAction
{
    public string Id => "conflictingOptionsReset";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(context.Instance);
        var applicationMetadata = await appMetadata.GetApplicationMetadata();
        var (dataId, _, data) = await FetchDataModel(context.Instance, "ServiceModel-test");

        SetDefaultData(data);

        await dataClient.UpdateData(data, instanceIdentifier.InstanceGuid, typeof(Skjema),
            applicationMetadata.AppIdentifier.Org, applicationMetadata.AppIdentifier.App,
            instanceIdentifier.InstanceOwnerPartyId,
            new Guid(dataId));
        var userActionResult = UserActionResult.SuccessResult(new List<ClientAction>());
        userActionResult.AddUpdatedDataModel(dataId, data);
        return userActionResult;
    }

    public static void SetDefaultData(Skjema data)
    {
        data.ConflictingOptions = new ConflictingOptions();
        data.ConflictingOptions.IsForeign = false;
        data.ConflictingOptions.Animals = [
            new Animal
            {
                Name = "Katt",
                NumLegs = 4,
                Color = "BLACK,BROWN", // Brown is only possible when isForeign is true, black always works
                CommentLabels = "", // Let DataProcessor.cs figure this out
                Comments = new List<AnimalComment>
                {
                    new()
                    {
                        Type = "CRITICISM",
                        TypeLabel = "",
                        Text = "Her er en kritisk kommentar, for denne katten lukter vondt"
                    },
                    new()
                    {
                        Type = "PRAISE",
                        TypeLabel = "",
                        Text = "Her er en skrytende kommentar, for denne katten er så søt"
                    }
                }
            },
            new Animal
            {
                Name = "Tiger",
                NumLegs = 5, // 5 legs is not possible as long as isForeign is false
                Color = "RED,PINK", // Pink is only possible when isForeign is false, red always works
                CommentLabels = "", // Let DataProcessor.cs figure this out
                Comments = new List<AnimalComment>
                {
                    new()
                    {
                        Type = "SUGGESTION",
                        Text = "Her er et forslag til forbedring av denne tigeren"
                    },
                    new()
                    {
                        Type = "SPAM",
                        Text = "Her er en kommentar som er søppel, for KOM OG KJØP BILLIGE KLOMPELØVER"
                    }
                }
            }
        ];
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