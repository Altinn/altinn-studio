using System.Diagnostics;
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
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

/// <summary>
/// A client for handling actions on data in Altinn Platform.
/// </summary>
public sealed class DataClient : IDataClient
{
    private readonly PlatformSettings _platformSettings;
    private readonly ILogger _logger;
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;
    private readonly IAppMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerializationService;
    private readonly Telemetry? _telemetry;
    private readonly HttpClient _client;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    private static readonly TimeSpan _httpOperationTimeout = TimeSpan.FromSeconds(100);

    /// <summary>
    /// Initializes a new data of the <see cref="DataClient"/> class.
    /// </summary>
    /// <param name="httpClient">A HttpClient from the built-in HttpClient factory.</param>
    /// <param name="serviceProvider">The service provider</param>
    public DataClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        _authenticationTokenResolver = serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();
        _appMetadata = serviceProvider.GetRequiredService<IAppMetadata>();
        _modelSerializationService = serviceProvider.GetRequiredService<ModelSerializationService>();
        _platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;
        _logger = serviceProvider.GetRequiredService<ILogger<DataClient>>();
        _telemetry = serviceProvider.GetService<Telemetry>();

        httpClient.BaseAddress = new Uri(_platformSettings.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        httpClient.Timeout = Timeout.InfiniteTimeSpan;
        _client = httpClient;
    }

    /// <inheritdoc />
    [Obsolete("Use InsertFormData with Instance parameter instead")]
    public async Task<DataElement> InsertFormData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        string dataType,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull
    {
        if (type != dataToSerialize.GetType())
        {
            throw new ArgumentException(
                $"The provided type {type.FullName} does not match the type of dataToSerialize {dataToSerialize.GetType().FullName}"
            );
        }
        Instance instance = new() { Id = $"{instanceOwnerPartyId}/{instanceGuid}" };
        return await InsertFormData(instance, dataType, dataToSerialize, authenticationMethod, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<DataElement> InsertFormData(
        Instance instance,
        string dataTypeId,
        object dataToSerialize,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartInsertFormDataActivity(instance);
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var dataType =
            appMetadata.DataTypes.Find(d => d.Id == dataTypeId)
            ?? throw new InvalidOperationException($"Data type {dataTypeId} not found in applicationmetadata.json");

        var (data, contentType) = _modelSerializationService.SerializeToStorage(dataToSerialize, dataType, null);

        return await InsertBinaryData(
            instance.Id,
            dataTypeId,
            contentType,
            null,
            new MemoryAsStream(data),
            null,
            authenticationMethod,
            cancellationToken
        );
    }

    /// <inheritdoc />
    [Obsolete("Use the UpdateFormData method with Instance parameter instead")]
    public async Task<DataElement> UpdateData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartUpdateDataActivity(instanceGuid, dataId);
        // Verify that all dataTypes uses XML serialization so that the deprecated method might work as expected without access to dataElement.ContentType
        if (type != dataToSerialize.GetType())
        {
            throw new ArgumentException(
                $"The provided type {type.FullName} does not match the type of dataToSerialize {dataToSerialize.GetType().FullName}"
            );
        }
        var classRef = type.FullName;
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        if (TypeAllowsJson(classRef, appMetadata))
        {
            throw new InvalidOperationException(
                $"The data type {classRef} is configured to use JSON serialization and must use UpdateFormData method instead"
            );
        }

        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        var serializedBytes = _modelSerializationService.SerializeToXml(dataToSerialize);
        var contentType = "application/xml";

        StreamContent streamContent = new(new MemoryAsStream(serializedBytes));
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);

        HttpResponseMessage response = await _client.PutAsync(
            token,
            apiUrl,
            streamContent,
            cancellationToken: cts.Token
        );

        if (response.IsSuccessStatusCode)
        {
            string instanceData = await response.Content.ReadAsStringAsync(cts.Token);
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instanceData)!;
            return dataElement;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> UpdateFormData(
        Instance instance,
        object dataToSerialize,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartUpdateDataActivity(instance, dataElement);

        var appMetadata = await _appMetadata.GetApplicationMetadata();

        var dataType =
            appMetadata.DataTypes.Find(d => d.Id == dataElement.DataType)
            ?? throw new InvalidOperationException(
                $"Data type {dataElement.DataType} not found in applicationmetadata.json"
            );

        var (data, contentType) = _modelSerializationService.SerializeToStorage(dataToSerialize, dataType, dataElement);

        return await UpdateBinaryData(
            new InstanceIdentifier(instance),
            contentType,
            dataElement.Filename,
            Guid.Parse(dataElement.Id),
            new MemoryAsStream(data),
            authenticationMethod,
            cancellationToken
        );
    }

    /// <inheritdoc />
    public async Task<Stream> GetBinaryData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartGetBinaryDataActivity(instanceGuid, dataId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl, cancellationToken: cts.Token);

        if (response.IsSuccessStatusCode)
        {
            return await response.Content.ReadAsStreamAsync(cts.Token);
        }

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            // ! TODO: Remove null return in v9 and throw exception instead
            return null!;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<Stream> GetBinaryDataStream(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(timeout ?? _httpOperationTimeout);
        using Activity? activity = _telemetry?.StartGetBinaryDataActivity(instanceGuid, dataId);
        var instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        var apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        HttpResponseMessage response = await _client.GetStreamingAsync(token, apiUrl, cancellationToken: cts.Token);

        if (response.IsSuccessStatusCode)
        {
            try
            {
                Stream stream = await response.Content.ReadAsStreamAsync(cts.Token);
                return new ResponseWrapperStream(response, stream);
            }
            catch (Exception)
            {
                response.Dispose();
                throw;
            }
        }

        throw await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response, cts.Token);
    }

    /// <inheritdoc />
    [Obsolete("Use the overload with Instance parameter instead")]
    public async Task<object> GetFormData(
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartGetFormDataActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        var classRef = type.FullName;
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        if (TypeAllowsJson(classRef, appMetadata))
        {
            throw new InvalidOperationException(
                $"The data type {classRef} is configured to use JSON serialization and must use GetFormData with dataElement argument instead"
            );
        }

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl, cancellationToken: cts.Token);
        if (response.IsSuccessStatusCode)
        {
            var bytes = await response.Content.ReadAsByteArrayAsync(cts.Token);

            try
            {
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
    public async Task<object> GetFormData(
        Instance instance,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(instance);
        ArgumentNullException.ThrowIfNull(dataElement);
        using var activity = _telemetry?.StartGetFormDataActivity(instance);

        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var dataType =
            appMetadata.DataTypes.Find(d => d.Id == dataElement.DataType)
            ?? throw new InvalidOperationException(
                $"Data type {dataElement.DataType} not found in applicationmetadata.json"
            );

        InstanceIdentifier instanceIdentifier = new(instance);
        var data = await GetDataBytes(
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            Guid.Parse(dataElement.Id),
            authenticationMethod,
            cancellationToken
        );

        return _modelSerializationService.DeserializeFromStorage(data, dataType, dataElement);
    }

    /// <inheritdoc />
    public async Task<byte[]> GetDataBytes(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartGetBinaryDataActivity(instanceGuid, dataId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataId}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl, cancellationToken: cts.Token);

        if (response.IsSuccessStatusCode)
        {
            return await response.Content.ReadAsByteArrayAsync(cts.Token);
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<List<AttachmentList>> GetBinaryDataList(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartGetBinaryDataListActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/dataelements";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        DataElementList dataList;
        List<AttachmentList> attachmentList = [];

        HttpResponseMessage response = await _client.GetAsync(token, apiUrl, cancellationToken: cts.Token);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            string instanceData = await response.Content.ReadAsStringAsync(cts.Token);
            dataList =
                JsonConvert.DeserializeObject<DataElementList>(instanceData)
                ?? throw new JsonException("Could not deserialize DataElementList");

            ExtractAttachments(dataList.DataElements, attachmentList);

            return attachmentList;
        }

        _logger.Log(LogLevel.Error, "Unable to fetch attachment list {StatusCode}", response.StatusCode);

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
    public async Task<bool> DeleteData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        bool delay,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartDeleteDataActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"instances/{instanceIdentifier}/data/{dataGuid}?delay={delay}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        HttpResponseMessage response = await _client.DeleteAsync(token, apiUrl, cancellationToken: cts.Token);

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
    [Obsolete("The overload that takes a HttpRequest is deprecated, use the overload that takes a Stream instead")]
    public async Task<DataElement> InsertBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string dataType,
        HttpRequest request,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartInsertBinaryDataActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl =
            $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data?dataType={dataType}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        StreamContent content = request.CreateContentStream();
        HttpResponseMessage response = await _client.PostAsync(token, apiUrl, content, cancellationToken: cts.Token);

        if (response.IsSuccessStatusCode)
        {
            string instancedata = await response.Content.ReadAsStringAsync(cts.Token);
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata)!;

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
        string? generatedFromTask = null,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartInsertBinaryDataActivity(instanceId);
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceId}/data?dataType={dataType}";
        if (!string.IsNullOrEmpty(generatedFromTask))
        {
            apiUrl += $"&generatedFromTask={generatedFromTask}";
        }

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        StreamContent content = new(stream);
        content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        if (!string.IsNullOrEmpty(filename))
        {
            content.Headers.ContentDisposition = new ContentDispositionHeaderValue(DispositionTypeNames.Attachment)
            {
                FileName = filename,
                FileNameStar = filename,
            };
        }

        HttpResponseMessage response = await _client.PostAsync(token, apiUrl, content, cancellationToken: cts.Token);

        if (response.IsSuccessStatusCode)
        {
            string dataElementString = await response.Content.ReadAsStringAsync(cts.Token);

            var dataElement = JsonConvert.DeserializeObject<DataElement>(dataElementString);
            if (dataElement is not null)
                return dataElement;
        }

        _logger.LogError(
            "Storing attachment for instance {InstanceId} failed with status code {StatusCode} - content {Content}",
            instanceId,
            response.StatusCode,
            await response.Content.ReadAsStringAsync(cts.Token)
        );
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    [Obsolete("The overload that takes a HttpRequest is deprecated, use the overload that takes a Stream instead")]
    public async Task<DataElement> UpdateBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        HttpRequest request,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartUpdateBinaryDataActivity(instanceGuid, instanceOwnerPartyId);
        string instanceIdentifier = $"{instanceOwnerPartyId}/{instanceGuid}";
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        StreamContent content = request.CreateContentStream();

        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, content, cancellationToken: cts.Token);

        if (response.IsSuccessStatusCode)
        {
            string instancedata = await response.Content.ReadAsStringAsync(cts.Token);
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
        Stream stream,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartUpdateBinaryDataActivity(instanceIdentifier.GetInstanceId());
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        StreamContent content = new(stream);
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

        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, content, cancellationToken: cts.Token);
        _logger.LogInformation("Update binary data result: {ResultCode}", response.StatusCode);
        if (response.IsSuccessStatusCode)
        {
            string instancedata = await response.Content.ReadAsStringAsync(cts.Token);
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement dataElement = JsonConvert.DeserializeObject<DataElement>(instancedata)!;

            return dataElement;
        }
        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> Update(
        Instance instance,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartUpdateDataActivity(instance);
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instance.Id}/dataelements/{dataElement.Id}";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        StringContent jsonString = new(JsonConvert.SerializeObject(dataElement), Encoding.UTF8, "application/json");
        HttpResponseMessage response = await _client.PutAsync(token, apiUrl, jsonString, cancellationToken: cts.Token);

        if (response.IsSuccessStatusCode)
        {
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement result = JsonConvert.DeserializeObject<DataElement>(
                await response.Content.ReadAsStringAsync(cts.Token)
            )!;

            return result;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    /// <inheritdoc />
    public async Task<DataElement> LockDataElement(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartLockDataElementActivity(instanceIdentifier.GetInstanceId(), dataGuid);
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}/lock";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        _logger.LogDebug(
            "Locking data element {DataGuid} for instance {InstanceIdentifier} URL: {Url}",
            dataGuid,
            instanceIdentifier,
            apiUrl
        );
        HttpResponseMessage response = await _client.PutAsync(
            token,
            apiUrl,
            content: null,
            platformAccessToken: null,
            cts.Token
        );
        if (response.IsSuccessStatusCode)
        {
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement result = JsonConvert.DeserializeObject<DataElement>(
                await response.Content.ReadAsStringAsync(cts.Token)
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
    public async Task<DataElement> UnlockDataElement(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var cts = cancellationToken.WithTimeout(_httpOperationTimeout);
        using var activity = _telemetry?.StartUnlockDataElementActivity(instanceIdentifier.GetInstanceId(), dataGuid);
        string apiUrl = $"{_platformSettings.ApiStorageEndpoint}instances/{instanceIdentifier}/data/{dataGuid}/lock";

        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cts.Token
        );

        _logger.LogDebug(
            "Unlocking data element {DataGuid} for instance {InstanceIdentifier} URL: {Url}",
            dataGuid,
            instanceIdentifier,
            apiUrl
        );
        HttpResponseMessage response = await _client.DeleteAsync(token, apiUrl, cancellationToken: cts.Token);
        if (response.IsSuccessStatusCode)
        {
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            DataElement result = JsonConvert.DeserializeObject<DataElement>(
                await response.Content.ReadAsStringAsync(cts.Token)
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

    private static bool TypeAllowsJson(string? classRef, ApplicationMetadata appMetadata)
    {
        return appMetadata.DataTypes.Where(dt => dt?.AppLogic?.ClassRef == classRef).Any(TypeAllowsJson);
    }

    internal static bool TypeAllowsJson(DataType? dataType)
    {
        if (dataType?.AllowedContentTypes is null)
            return false;
        return !dataType.AllowedContentTypes.TrueForAll(ct =>
            !ct.Equals("application/json", StringComparison.OrdinalIgnoreCase)
        );
    }
}
