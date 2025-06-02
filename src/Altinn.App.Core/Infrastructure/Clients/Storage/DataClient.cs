using System.Net;
using System.Net.Http.Headers;
using System.Net.Mime;
using System.Text;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

/// <summary>
/// A client for handling actions on data in Altinn Platform.
/// </summary>
public class DataClient : IDataClient
{
    private readonly PlatformSettings _platformSettings;
    private readonly ILogger _logger;
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly IAppMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerializationService;
    private readonly Telemetry? _telemetry;
    private readonly HttpClient _client;

    /// <summary>
    /// Initializes a new data of the <see cref="DataClient"/> class.
    /// </summary>
    /// <param name="platformSettings">the platform settings</param>
    /// <param name="logger">the logger</param>
    /// <param name="httpClient">A HttpClient from the built in HttpClient factory.</param>
    /// <param name="userTokenProvider">Service to obtain json web token</param>
    /// <param name="appMetadata"></param>
    /// <param name="modelSerializationService"></param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public DataClient(
        IOptions<PlatformSettings> platformSettings,
        ILogger<DataClient> logger,
        HttpClient httpClient,
        IUserTokenProvider userTokenProvider,
        IAppMetadata appMetadata,
        ModelSerializationService modelSerializationService,
        Telemetry? telemetry = null
    )
    {
        _platformSettings = platformSettings.Value;
        _logger = logger;

        httpClient.BaseAddress = new Uri(_platformSettings.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        _client = httpClient;
        _userTokenProvider = userTokenProvider;
        _appMetadata = appMetadata;
        _modelSerializationService = modelSerializationService;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public async Task<DataElement> InsertFormData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        string dataType
    )
        where T : notnull
    {
        using var activity = _telemetry?.StartInsertFormDataActivity(instanceGuid, instanceOwnerPartyId);
        Instance instance = new() { Id = $"{instanceOwnerPartyId}/{instanceGuid}" };
        return await InsertFormData(instance, dataType, dataToSerialize, type);
    }

    /// <inheritdoc />
    public async Task<DataElement> InsertFormData<T>(
        Instance instance,
        string dataTypeString,
        T dataToSerialize,
        Type type
    )
        where T : notnull
    {
        using var activity = _telemetry?.StartInsertFormDataActivity(instance);
        string apiUrl = $"instances/{instance.Id}/data?dataType={dataTypeString}";
        string token = _userTokenProvider.GetUserToken();

        var application = await _appMetadata.GetApplicationMetadata();
        var dataType =
            application.DataTypes.Find(d => d.Id == dataTypeString)
            ?? throw new InvalidOperationException($"Data type {dataTypeString} not found in applicationmetadata.json");

        var (data, contentType) = _modelSerializationService.SerializeToStorage(dataToSerialize, dataType);

        StreamContent streamContent = new StreamContent(new MemoryAsStream(data));
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        HttpResponseMessage response = await _client.PostAsync(token, apiUrl, streamContent);

        if (response.IsSuccessStatusCode)
        {
            string instanceData = await response.Content.ReadAsStringAsync();
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            var dataElement = JsonConvert.DeserializeObject<DataElement>(instanceData)!;

            return dataElement;
        }

        _logger.Log(
            LogLevel.Error,
            "unable to save form data for instance {InstanceId} due to response {StatusCode}",
            instance.Id,
            response.StatusCode
        );
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> UpdateData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid dataId
    )
        where T : notnull
    {
        using var activity = _telemetry?.StartUpdateDataActivity(instanceGuid, dataId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
        string token = _userTokenProvider.GetUserToken();

        //TODO: this method does not get enough information to know the content type from the DataType
        //      if we start to support more than XML
        var serializedBytes = _modelSerializationService.SerializeToXml(dataToSerialize);
        var contentType = "application/xml";

        StreamContent streamContent = new StreamContent(new MemoryAsStream(serializedBytes));
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);

        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, streamContent);

        if (response.IsSuccessStatusCode)
        {
            string instanceData = await response.Content.ReadAsStringAsync();
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instanceData)!;
            return dataElement;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<Stream> GetBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId
    )
    {
        using var activity = _telemetry?.StartGetBinaryDataActivity(instanceGuid, dataId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";

        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

        if (response.IsSuccessStatusCode)
        {
            return await response.Content.ReadAsStreamAsync();
        }
        else if (response.StatusCode == HttpStatusCode.NotFound)
        {
#nullable disable
            return null;
#nullable restore
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<object> GetFormData(
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid dataId
    )
    {
        using var activity = _telemetry?.StartGetFormDataActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";
        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl);
        if (response.IsSuccessStatusCode)
        {
            var bytes = await response.Content.ReadAsByteArrayAsync();

            try
            {
                //TODO: this method does not get enough information to know the content type from the DataType
                //      if we start to support more than XML
                return _modelSerializationService.DeserializeXml(bytes, type);
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Error deserializing form data");
                throw new ServiceException(HttpStatusCode.Conflict, "Error deserializing form data", e);
            }
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<byte[]> GetDataBytes(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId
    )
    {
        using var activity = _telemetry?.StartGetBinaryDataActivity(instanceGuid, dataId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";

        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl);

        if (response.IsSuccessStatusCode)
        {
            return await response.Content.ReadAsByteArrayAsync();
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<List<AttachmentList>> GetBinaryDataList(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid
    )
    {
        using var activity = _telemetry?.StartGetBinaryDataListActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/dataelements";
        string token = _userTokenProvider.GetUserToken();

        DataElementList dataList;
        List<AttachmentList> attachmentList = new List<AttachmentList>();

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            string instanceData = await response.Content.ReadAsStringAsync();
            dataList =
                JsonConvert.DeserializeObject<DataElementList>(instanceData)
                ?? throw new JsonException("Could not deserialize DataElementList");

            ExtractAttachments(dataList.DataElements, attachmentList);

            return attachmentList;
        }

        _logger.Log(LogLevel.Error, "Unable to fetch attachment list {statusCode}", response.StatusCode);

        throw await PlatformHttpException.CreateAsync(response);
    }

    private static void ExtractAttachments(List<DataElement> dataList, List<AttachmentList> attachmentList)
    {
        List<Attachment>? attachments = null;
        IEnumerable<DataElement> attachmentTypes = dataList.GroupBy(m => m.DataType).Select(m => m.First());

        foreach (DataElement attachmentType in attachmentTypes)
        {
            attachments = new List<Attachment>();
            foreach (DataElement data in dataList)
            {
                if (data.DataType != "default" && data.DataType == attachmentType.DataType)
                {
                    attachments.Add(
                        new Attachment
                        {
                            Id = data.Id,
                            Name = data.Filename,
                            Size = data.Size,
                        }
                    );
                }
            }

            if (attachments.Count > 0)
            {
                attachmentList.Add(new AttachmentList { Type = attachmentType.DataType, Attachments = attachments });
            }
        }

        if (attachments != null && attachments.Count > 0)
        {
            attachmentList.Add(new AttachmentList { Type = "attachments", Attachments = attachments });
        }
    }

    /// <inheritdoc />
    public async Task<bool> DeleteBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid
    )
    {
        using var activity = _telemetry?.StartDeleteBinaryDataActivity(instanceGuid, instanceOwnerPartyId);
        return await DeleteData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, false);
    }

    /// <inheritdoc />
    public async Task<bool> DeleteData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        bool delay
    )
    {
        using var activity = _telemetry?.StartDeleteDataActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataGuid}?delay={delay}";
        string token = _userTokenProvider.GetUserToken();

        HttpResponseMessage response = await _client.DeleteAsync(token, apiUrl);

        if (response.IsSuccessStatusCode)
        {
            return true;
        }

        _logger.LogError(
            $"Deleting data element {dataGuid} for instance {instanceIdentifier} failed with status code {response.StatusCode}"
        );
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> InsertBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string dataType,
        HttpRequest request
    )
    {
        using var activity = _telemetry?.StartInsertBinaryDataActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl =
            $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data?dataType={dataType}";
        string token = _userTokenProvider.GetUserToken();
        DataElement dataElement;

        StreamContent content = request.CreateContentStream();

        HttpResponseMessage response = await _client.PostAsync(token, apiUrl, content);

        if (response.IsSuccessStatusCode)
        {
            string instancedata = await response.Content.ReadAsStringAsync();
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata)!;

            return dataElement;
        }

        _logger.LogError(
            $"Storing attachment for instance {instanceGuid} failed with status code {response.StatusCode}"
        );
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> InsertBinaryData(
        string instanceId,
        string dataType,
        string contentType,
        string? filename,
        Stream stream,
        string? generatedFromTask = null
    )
    {
        using var activity = _telemetry?.StartInsertBinaryDataActivity(instanceId);
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceId}/data?dataType={dataType}";
        if (!string.IsNullOrEmpty(generatedFromTask))
        {
            apiUrl += $"&generatedFromTask={generatedFromTask}";
        }
        string token = _userTokenProvider.GetUserToken();

        StreamContent content = new StreamContent(stream);
        content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        if (!string.IsNullOrEmpty(filename))
        {
            content.Headers.ContentDisposition = new ContentDispositionHeaderValue(DispositionTypeNames.Attachment)
            {
                FileName = filename,
                FileNameStar = filename,
            };
        }

        HttpResponseMessage response = await _client.PostAsync(token, apiUrl, content);

        if (response.IsSuccessStatusCode)
        {
            string dataElementString = await response.Content.ReadAsStringAsync();

            var dataElement = JsonConvert.DeserializeObject<DataElement>(dataElementString);
            if (dataElement is not null)
                return dataElement;
        }

        _logger.LogError(
            $"Storing attachment for instance {instanceId} failed with status code {response.StatusCode} - content {await response.Content.ReadAsStringAsync()}"
        );
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> UpdateBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        HttpRequest request
    )
    {
        using var activity = _telemetry?.StartUpdateBinaryDataActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}";
        string token = _userTokenProvider.GetUserToken();

        StreamContent content = request.CreateContentStream();

        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, content);

        if (response.IsSuccessStatusCode)
        {
            string instancedata = await response.Content.ReadAsStringAsync();
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata)!;

            return dataElement;
        }

        _logger.LogError(
            $"Updating attachment {dataGuid} for instance {instanceGuid} failed with status code {response.StatusCode}"
        );
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> UpdateBinaryData(
        InstanceIdentifier instanceIdentifier,
        string? contentType,
        string? filename,
        Guid dataGuid,
        Stream stream
    )
    {
        using var activity = _telemetry?.StartUpdateBinaryDataActivity(instanceIdentifier.GetInstanceId());
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}";
        string token = _userTokenProvider.GetUserToken();
        StreamContent content = new StreamContent(stream);
        ArgumentNullException.ThrowIfNull(contentType);
        content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        if (!string.IsNullOrEmpty(filename))
        {
            content.Headers.ContentDisposition = new ContentDispositionHeaderValue(DispositionTypeNames.Attachment)
            {
                FileName = filename,
                FileNameStar = filename,
            };
        }

        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, content);
        _logger.LogInformation("Update binary data result: {ResultCode}", response.StatusCode);
        if (response.IsSuccessStatusCode)
        {
            string instancedata = await response.Content.ReadAsStringAsync();
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata)!;

            return dataElement;
        }
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> Update(Instance instance, DataElement dataElement)
    {
        using var activity = _telemetry?.StartUpdateDataActivity(instance);
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instance.Id}/dataelements/{dataElement.Id}";
        string token = _userTokenProvider.GetUserToken();

        StringContent jsonString = new StringContent(
            JsonConvert.SerializeObject(dataElement),
            Encoding.UTF8,
            "application/json"
        );
        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, jsonString);

        if (response.IsSuccessStatusCode)
        {
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement result = JsonConvert.DeserializeObject<DataElement>(
                await response.Content.ReadAsStringAsync()
            )!;

            return result;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> LockDataElement(InstanceIdentifier instanceIdentifier, Guid dataGuid)
    {
        using var activity = _telemetry?.StartLockDataElementActivity(instanceIdentifier.GetInstanceId(), dataGuid);
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}/lock";
        string token = _userTokenProvider.GetUserToken();
        _logger.LogDebug(
            "Locking data element {DataGuid} for instance {InstanceIdentifier} URL: {Url}",
            dataGuid,
            instanceIdentifier,
            apiUrl
        );
        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, content: null);
        if (response.IsSuccessStatusCode)
        {
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement result = JsonConvert.DeserializeObject<DataElement>(
                await response.Content.ReadAsStringAsync()
            )!;
            return result;
        }
        _logger.LogError(
            "Locking data element {DataGuid} for instance {InstanceIdentifier} failed with status code {StatusCode}",
            dataGuid,
            instanceIdentifier,
            response.StatusCode
        );
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> UnlockDataElement(InstanceIdentifier instanceIdentifier, Guid dataGuid)
    {
        using var activity = _telemetry?.StartUnlockDataElementActivity(instanceIdentifier.GetInstanceId(), dataGuid);
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}/lock";
        string token = _userTokenProvider.GetUserToken();
        _logger.LogDebug(
            "Unlocking data element {DataGuid} for instance {InstanceIdentifier} URL: {Url}",
            dataGuid,
            instanceIdentifier,
            apiUrl
        );
        HttpResponseMessage response = await _client.DeleteAsync(token, apiUrl);
        if (response.IsSuccessStatusCode)
        {
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement result = JsonConvert.DeserializeObject<DataElement>(
                await response.Content.ReadAsStringAsync()
            )!;
            return result;
        }
        _logger.LogError(
            "Unlocking data element {DataGuid} for instance {InstanceIdentifier} failed with status code {StatusCode}",
            dataGuid,
            instanceIdentifier,
            response.StatusCode
        );
        throw await PlatformHttpException.CreateAsync(response);
    }
}
