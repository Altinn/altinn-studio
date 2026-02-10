using System;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

public class FormDataHelper(Instance instance, IDataClient dataClient)
{
    private readonly Guid _instanceGuid = new Guid(instance.Id.Split("/")[1]);
    private readonly int _partyId = int.Parse(instance.InstanceOwner.PartyId);

    public async Task<T> GetFormData<T>() where T : class
    {
        DataElement dataElement = instance.Data.Find(d => d.DataType == typeof(T).Name);
        Guid dataElementGuid = new Guid(dataElement.Id);

        object formData = await dataClient.GetFormData(
            _instanceGuid,
            typeof(T),
            instance.Org,
            instance.AppId,
            _partyId,
            dataElementGuid);

        return formData as T;
    }

    public async Task InsertFormData<T>(T formData) where T : class
    {
        await dataClient.InsertFormData(
            instance,
            typeof(T).Name,
            formData,
            typeof(T));
    }

    public async Task UpdateFormData<T>(T formData) where T : class
    {
        DataElement dataElement = instance.Data.Find(d => d.DataType == typeof(T).Name);
        Guid dataElementGuid = new Guid(dataElement.Id);

        await dataClient.UpdateData(
            formData,
            _instanceGuid,
            typeof(T),
            instance.Org,
            instance.AppId,
            _partyId,
            dataElementGuid);
    }
}
