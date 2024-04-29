using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Data
{
    /// <inheritdoc/>
    internal class DataService : IDataService
    {
        private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);

        private readonly IDataClient _dataClient;
        private readonly IAppMetadata _appMetadata;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataService"/> class.
        /// </summary>
        /// <param name="dataClient"></param>
        /// <param name="appMetadata"></param>
        public DataService(IDataClient dataClient, IAppMetadata appMetadata)
        {
            _dataClient = dataClient;
            _appMetadata = appMetadata;
        }

        /// <inheritdoc/>
        public async Task<(Guid dataElementId, T? model)> GetByType<T>(Instance instance, string dataTypeId)
        {
            DataElement? dataElement = instance.Data.SingleOrDefault(d => d.DataType.Equals(dataTypeId));

            if (dataElement == null)
            {
                return (Guid.Empty, default);
            }

            var data = await GetDataForDataElement<T>(new InstanceIdentifier(instance), dataElement);

            return (Guid.Parse(dataElement.Id), data);
        }

        /// <inheritdoc/>
        public async Task<T> GetById<T>(Instance instance, Guid dataElementId)
        {
            DataElement dataElement =
                instance.Data.SingleOrDefault(d => d.Id == dataElementId.ToString())
                ?? throw new ArgumentNullException(
                    $"Failed to locate data element with id {dataElementId} in instance {instance.Id}"
                );
            return await GetDataForDataElement<T>(new InstanceIdentifier(instance), dataElement);
        }

        /// <inheritdoc/>
        public async Task<DataElement> InsertJsonObject(
            InstanceIdentifier instanceIdentifier,
            string dataTypeId,
            object data
        )
        {
            using var referenceStream = new MemoryStream();
            await JsonSerializer.SerializeAsync(referenceStream, data, _jsonSerializerOptions);
            referenceStream.Position = 0;
            return await _dataClient.InsertBinaryData(
                instanceIdentifier.ToString(),
                dataTypeId,
                "application/json",
                dataTypeId + ".json",
                referenceStream
            );
        }

        /// <inheritdoc/>
        public async Task<DataElement> UpdateJsonObject(
            InstanceIdentifier instanceIdentifier,
            string dataTypeId,
            Guid dataElementId,
            object data
        )
        {
            using var referenceStream = new MemoryStream();
            await JsonSerializer.SerializeAsync(referenceStream, data, _jsonSerializerOptions);
            referenceStream.Position = 0;
            return await _dataClient.UpdateBinaryData(
                instanceIdentifier,
                "application/json",
                dataTypeId + ".json",
                dataElementId,
                referenceStream
            );
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteById(InstanceIdentifier instanceIdentifier, Guid dataElementId)
        {
            ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

            return await _dataClient.DeleteData(
                applicationMetadata.AppIdentifier.Org,
                applicationMetadata.AppIdentifier.App,
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                dataElementId,
                false
            );
        }

        private async Task<T> GetDataForDataElement<T>(InstanceIdentifier instanceIdentifier, DataElement dataElement)
        {
            ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

            Stream dataStream = await _dataClient.GetBinaryData(
                applicationMetadata.AppIdentifier.Org,
                applicationMetadata.AppIdentifier.App,
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                new Guid(dataElement.Id)
            );
            if (dataStream == null)
            {
                throw new ArgumentNullException(
                    $"Failed to retrieve binary dataStream from dataClient using dataElement.Id {dataElement.Id}."
                );
            }

            return await JsonSerializer.DeserializeAsync<T>(dataStream, _jsonSerializerOptions)
                ?? throw new InvalidOperationException(
                    $"Unable to deserialize data from dataStream to type {nameof(T)}."
                );
        }
    }
}
