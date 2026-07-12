using System.Buffers.Binary;
using System.Buffers.Text;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Web;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.WebUtilities;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using HeaderUtilities = Microsoft.Net.Http.Headers.HeaderUtilities;
using NetContentDispositionHeaderValue = Microsoft.Net.Http.Headers.ContentDispositionHeaderValue;
using NetEntityTagHeaderValue = Microsoft.Net.Http.Headers.EntityTagHeaderValue;
using NetMediaTypeHeaderValue = Microsoft.Net.Http.Headers.MediaTypeHeaderValue;

namespace Altinn.App.Tests.Common.Mocks;

public class StorageClientInterceptor : HttpMessageHandler
{
    public class RequestResponse(HttpRequestMessage Request, byte[]? requestBody, HttpResponseMessage Response)
    {
        public Uri? RequestUrl { get; } = Request.RequestUri;
        public HttpMethod RequestMethod { get; } = Request.Method;
        public string? RequestBody { get; } = requestBody is null ? null : Encoding.UTF8.GetString(requestBody);
        public HttpRequestHeaders RequestHeaders { get; } = Request.Headers;
        public HttpContentHeaders? RequestContentHeaders { get; } = Request.Content?.Headers;

        public HttpStatusCode ResponseStatusCode { get; } = Response.StatusCode;
        public string ResponseBody { get; } = Response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
        public HttpResponseHeaders ResponseHeaders { get; } = Response.Headers;
        public HttpContentHeaders ResponseContentHeaders { get; } = Response.Content.Headers;
    };

    private ConcurrentDictionary<string, Instance> _instances = new();
    private ConcurrentDictionary<Guid, byte[]> _data = new();
    private ConcurrentDictionary<Guid, string> _dataEtags = new();
    private ConcurrentDictionary<Guid, int> _dataContentVersions = new();
    private ConcurrentDictionary<string, int> _instanceVersions = new();
    private ConcurrentDictionary<string, int> _processStateVersions = new();
    private ConcurrentDictionary<string, MutationReplayRecord> _mutationReplayRecords = new();
    private static readonly System.Text.Json.JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public StorageClientInterceptor(ApplicationMetadata appMetadata, bool stampDataElementEtags = true)
    {
        AppMetadata = appMetadata;
        StampDataElementEtags = stampDataElementEtags;
        AppMetadata.Title ??= new()
        {
            { LanguageConst.Nb, "Testapplikasjon" },
            { LanguageConst.En, "Mocked Test App" },
        };
        AppMetadata.DataTypes ??= [];
    }

    public ConcurrentBag<RequestResponse> RequestsResponses { get; } = new();
    public ApplicationMetadata AppMetadata { get; }
    public bool StampDataElementEtags { get; }

    public void AddInstance(Instance instance)
    {
        int defaultPartyId = 123456;
        Guid defaultInstanceGuid = Guid.Parse("00000000-DEAD-FACE-BABE-000000000001");
        instance.InstanceOwner ??= new InstanceOwner() { };
        if (instance.InstanceOwner.PartyId is null && instance.Id is not null)
        {
            var idParts = instance.Id.Split('/');
            Assert.Equal(2, idParts.Length);
            instance.InstanceOwner.PartyId = idParts[0];
        }
        instance.InstanceOwner.PartyId ??= defaultPartyId.ToString();
        instance.Id ??= $"{instance.InstanceOwner.PartyId}/{defaultInstanceGuid}";
        instance.Data ??= [];
        instance.AppId ??= AppMetadata.Id;
        foreach (DataElement dataElement in instance.Data)
        {
            if (!Guid.TryParse(dataElement.Id, out Guid dataId))
            {
                continue;
            }

            if (!string.IsNullOrEmpty(dataElement.ContentEtag))
            {
                SetDataETag(dataId, dataElement.ContentEtag);
            }
            else if (StampDataElementEtags)
            {
                dataElement.ContentEtag = EnsureDataETag(dataId);
            }
        }
        _instances[instance.Id.ToLowerInvariant()] = instance;
    }

    public void SetStorageVersions(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        int instanceVersion,
        int processStateVersion
    )
    {
        string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
        _instanceVersions[instanceId] = instanceVersion;
        _processStateVersions[instanceId] = processStateVersion;
    }

    public (Instance instance, Dictionary<string, byte[]> data) GetInstanceAndData(
        int instanceOwnerPartyId,
        Guid instanceGuid
    )
    {
        var instance = _instances[$"{instanceOwnerPartyId}/{instanceGuid}"];
        var data = instance.Data.ToDictionary(d => d.Id, d => _data[Guid.Parse(d.Id)]);
        return (instance, data);
    }

    public void AddDataRaw(Guid dataId, byte[] data, string? eTag = null)
    {
        _data[dataId] = data;
        if (eTag is not null)
        {
            SetDataETag(dataId, eTag);
        }
        else if (StampDataElementEtags)
        {
            EnsureDataETag(dataId);
        }
    }

    public void AddDataRawWithoutBlobVersion(Guid dataId, byte[] data)
    {
        _data[dataId] = data;
        SetDataETag(dataId, null);
        foreach (Instance instance in _instances.Values)
        {
            DataElement? dataElement = instance.Data?.FirstOrDefault(element => element.Id == dataId.ToString());
            if (dataElement is not null)
            {
                dataElement.ContentEtag = null;
            }
        }
    }

    public void SetDataETag(Guid dataId, string? eTag)
    {
        if (eTag is null)
        {
            _dataEtags.TryRemove(dataId, out _);
            _dataContentVersions.TryRemove(dataId, out _);
            return;
        }

        _dataEtags[dataId] = eTag;
        if (TryParseGeneratedETagVersion(eTag, out int version))
        {
            _dataContentVersions[dataId] = version;
        }
    }

    public DataElement AddData(Instance instance, string dataType, string contentType, byte[] data)
    {
        var dataId = Guid.NewGuid();
        var dataElement = new DataElement()
        {
            Id = dataId.ToString(),
            DataType = dataType,
            ContentType = contentType,
            Size = data.Length,
        };
        instance.Data.Add(dataElement);
        _data[dataId] = data;
        if (StampDataElementEtags)
        {
            dataElement.ContentEtag = EnsureDataETag(dataId);
        }
        return dataElement;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var requestBody = request.Content is not null
            ? await request.Content.ReadAsByteArrayAsync(cancellationToken)
            : null;

        var response = (request.Method.Method, request.RequestUri?.AbsolutePath.Trim('/').Split('/')) switch
        {
            ("GET", { } path) when TryParseInstanceUrl(path, out int partyId, out Guid instanceGuid) =>
                GetInstanceResponse(partyId, instanceGuid),
            ("GET", { } path) when TryParseDataUrl(path, out int partyId, out Guid instanceGuid, out Guid dataId) =>
                GetData(partyId, instanceGuid, dataId, request),
            ("POST", { } path) when TryParseDataPostUrl(path, out int partyId, out Guid instanceGuid) => PostData(
                partyId,
                instanceGuid,
                requestBody,
                request
            ),
            ("POST", { } path) when TryParseMutationUrl(path, out int partyId, out Guid instanceGuid) =>
                await PostMutation(partyId, instanceGuid, requestBody, request, cancellationToken),
            ("PUT", { } path) when TryParseDataUrl(path, out int partyId, out Guid instanceGuid, out Guid dataId) =>
                PutData(partyId, instanceGuid, dataId, requestBody, request),
            ("DELETE", { } path) when TryParseDataUrl(path, out int partyId, out Guid instanceGuid, out Guid dataId) =>
                DeleteData(partyId, instanceGuid, dataId, request),
            ("PUT", { } path)
                when TryParseDataElementMetadataUrl(path, out int partyId, out Guid instanceGuid, out Guid dataId) =>
                PutDataElement(partyId, instanceGuid, dataId, requestBody, request),
            ("PUT", { } path) when TryParsePresentationTextsUrl(path, out int partyId, out Guid instanceGuid) =>
                PutPresentationTexts(partyId, instanceGuid, requestBody, request),
            ("PUT", { } path) when TryParseDataValuesUrl(path, out int partyId, out Guid instanceGuid) => PutDataValues(
                partyId,
                instanceGuid,
                requestBody,
                request
            ),
            var (method, _) => throw new Exception(
                $"Unhandled request to {request.RequestUri?.AbsolutePath} with method {method} and body\n\n{(requestBody is not null ? System.Text.Encoding.UTF8.GetString(requestBody) : "[no body]")}"
            ),
        };
        RequestsResponses.Add(new RequestResponse(request, requestBody, response));
        return response;
    }

    private HttpResponseMessage PutData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        byte[]? dataContent,
        HttpRequestMessage request
    )
    {
        if (dataContent is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "No data content provided in PutData request");
        }

        if (!_instances.TryGetValue($"{instanceOwnerPartyId}/{instanceGuid}", out var instance))
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Instance with id {instanceOwnerPartyId}/{instanceGuid} not found"
            );
        }
        var dataElement = instance.Data.FirstOrDefault(de => de.Id == dataId.ToString());
        if (dataElement == null)
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Data element with id {dataId} not found in instance {instanceOwnerPartyId}/{instanceGuid}"
            );
        }

        if (ValidateWritePreconditions(instanceOwnerPartyId, instanceGuid, request, dataId) is { } preconditionFailure)
        {
            return preconditionFailure;
        }

        var dataType = AppMetadata.DataTypes.Find(dt => dt.Id == dataElement.DataType);
        if (dataType == null)
        {
            return CreateErrorResponse(
                HttpStatusCode.BadRequest,
                $"Data type \"{dataElement.DataType ?? "null"}\" not found in application metadata"
            );
        }

        var contentType = request.Content?.Headers.ContentType?.MediaType;
        if (contentType != dataElement.ContentType)
        {
            return CreateErrorResponse(
                HttpStatusCode.BadRequest,
                $"Content type {contentType} does not match existing content type {dataElement.ContentType} for data element {dataId}"
            );
        }
        dataElement.Size = dataContent.Length;
        _data[dataId] = dataContent;
        string contentETag = BumpDataETag(dataId);
        dataElement.ContentEtag = contentETag;

        var dataElementJson = System.Text.Json.JsonSerializer.Serialize(dataElement);
        HttpResponseMessage response = AddVersionHeaders(
            new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = new StringContent(dataElementJson, Encoding.UTF8, "application/json"),
            },
            instanceOwnerPartyId,
            instanceGuid
        );
        response.Headers.ETag = EntityTagHeaderValue.Parse(contentETag);

        return response;
    }

    private HttpResponseMessage DeleteData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        HttpRequestMessage request
    )
    {
        if (!_instances.TryGetValue($"{instanceOwnerPartyId}/{instanceGuid}", out var instance))
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Instance with id {instanceOwnerPartyId}/{instanceGuid} not found"
            );
        }

        if (!instance.Data.Any(dataElement => dataElement.Id == dataId.ToString()))
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Data element with id {dataId} not found in instance {instanceOwnerPartyId}/{instanceGuid}"
            );
        }

        if (ValidateWritePreconditions(instanceOwnerPartyId, instanceGuid, request) is { } preconditionFailure)
        {
            return preconditionFailure;
        }

        instance.Data.RemoveAll(dataElement => dataElement.Id == dataId.ToString());
        _data.TryRemove(dataId, out _);
        _dataEtags.TryRemove(dataId, out _);
        _dataContentVersions.TryRemove(dataId, out _);
        return AddVersionHeaders(new HttpResponseMessage(HttpStatusCode.OK), instanceOwnerPartyId, instanceGuid);
    }

    private bool TryParseInstanceUrl(string[] pathSegments, out int instanceOwnerPartyId, out Guid instanceGuid)
    {
        if (
            pathSegments is ["storage", "api", "v1", "instances", var partyIdStr, var instanceGuidStr]
            && int.TryParse(partyIdStr, out instanceOwnerPartyId)
            && Guid.TryParse(instanceGuidStr, out instanceGuid)
        )
        {
            return true;
        }

        instanceOwnerPartyId = 0;
        instanceGuid = Guid.Empty;
        return false;
    }

    private HttpResponseMessage GetInstanceResponse(int partyId, Guid instanceGuid)
    {
        if (!_instances.TryGetValue($"{partyId}/{instanceGuid}", out Instance? instance))
        {
            return new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent($"Instance with id {instanceGuid} not found"),
            };
        }
        StampContentEtags(instance);
        var instanceJson = System.Text.Json.JsonSerializer.Serialize(instance);
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(instanceJson, System.Text.Encoding.UTF8, "application/json"),
        };
    }

    private bool TryParseDataUrl(
        string[] pathSegments,
        out int instanceOwnerPartyId,
        out Guid instanceGuid,
        out Guid dataId
    )
    {
        if (
            pathSegments
                is ["storage", "api", "v1", "instances", var partyIdStr, var instanceGuidStr, "data", var dataIdStr]
            && int.TryParse(partyIdStr, out instanceOwnerPartyId)
            && Guid.TryParse(instanceGuidStr, out instanceGuid)
            && Guid.TryParse(dataIdStr, out dataId)
        )
        {
            return true;
        }

        instanceOwnerPartyId = 0;
        instanceGuid = Guid.Empty;
        dataId = Guid.Empty;
        return false;
    }

    private HttpResponseMessage GetData(int partyId, Guid instanceGuid, Guid dataId, HttpRequestMessage request)
    {
        if (!_instances.TryGetValue($"{partyId}/{instanceGuid}", out Instance? instance))
        {
            return new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent($"Instance with id {instanceGuid} not found"),
            };
        }
        var dataElement = instance.Data.FirstOrDefault(de => de.Id == dataId.ToString());
        if (dataElement == null)
        {
            return new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent($"Data element with id {dataId} not found in instance {instanceGuid}"),
            };
        }

        if (!_data.TryGetValue(dataId, out var storedData))
        {
            return new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent($"Data with id {dataId} not found"),
            };
        }
        if (ValidateWritePreconditions(partyId, instanceGuid, request, dataId) is { } validationFailure)
        {
            return validationFailure;
        }
        HttpResponseMessage response = new(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(storedData)
            {
                Headers =
                {
                    ContentType = new MediaTypeHeaderValue(dataElement.ContentType ?? "application/octet-stream"),
                },
            },
        };
        if (_dataEtags.TryGetValue(dataId, out string? eTag))
        {
            response.Headers.ETag = EntityTagHeaderValue.Parse(eTag);
        }

        return response;
    }

    private bool TryParseDataPostUrl(string[] pathSegments, out int instanceOwnerPartyId, out Guid instanceGuid)
    {
        if (
            pathSegments is ["storage", "api", "v1", "instances", var partyIdStr, var instanceGuidStr, "data"]
            && int.TryParse(partyIdStr, out instanceOwnerPartyId)
            && Guid.TryParse(instanceGuidStr, out instanceGuid)
        )
        {
            return true;
        }

        instanceOwnerPartyId = 0;
        instanceGuid = Guid.Empty;
        return false;
    }

    private HttpResponseMessage PostData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        byte[]? dataContent,
        HttpRequestMessage request
    )
    {
        if (dataContent is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "No data content provided in PostData request");
        }
        var queryParam = HttpUtility.ParseQueryString(
            request.RequestUri?.Query ?? throw new Exception("Request URI is null")
        );
        var dataTypeString =
            queryParam["dataType"] ?? throw new Exception("Data type is not specified in PostData request");

        var dataType = AppMetadata.DataTypes.FirstOrDefault(dt => dt.Id == dataTypeString);
        if (dataType == null)
        {
            return CreateErrorResponse(
                HttpStatusCode.BadRequest,
                $"Data type {dataTypeString} not found in application metadata"
            );
        }

        var contentType = request.Content?.Headers.ContentType?.MediaType;
        if (contentType is null || !dataType.AllowedContentTypes.Contains(contentType))
        {
            return CreateErrorResponse(
                HttpStatusCode.BadRequest,
                $"Data type {dataTypeString} does not allow content type {contentType}, allowed types are: {string.Join(", ", dataType.AllowedContentTypes)}"
            );
        }

        if (!_instances.TryGetValue($"{instanceOwnerPartyId}/{instanceGuid}", out Instance? instance))
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Instance with id {instanceOwnerPartyId}/{instanceGuid} not found"
            );
        }

        if (ValidateWritePreconditions(instanceOwnerPartyId, instanceGuid, request) is { } preconditionFailure)
        {
            return preconditionFailure;
        }

        var dataElement = AddData(instance, dataTypeString, contentType, dataContent);
        var dataElementJson = System.Text.Json.JsonSerializer.Serialize(dataElement);
        return AddVersionHeaders(
            new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = new StringContent(dataElementJson, Encoding.UTF8, "application/json"),
            },
            instanceOwnerPartyId,
            instanceGuid
        );
    }

    private bool TryParseMutationUrl(string[] pathSegments, out int instanceOwnerPartyId, out Guid instanceGuid)
    {
        if (
            pathSegments is ["storage", "api", "v1", "instances", var partyIdStr, var instanceGuidStr, "mutations"]
            && int.TryParse(partyIdStr, out instanceOwnerPartyId)
            && Guid.TryParse(instanceGuidStr, out instanceGuid)
        )
        {
            return true;
        }

        instanceOwnerPartyId = 0;
        instanceGuid = Guid.Empty;
        return false;
    }

    private async Task<HttpResponseMessage> PostMutation(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        byte[]? requestBody,
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        if (requestBody is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "No mutation content provided");
        }

        if (!_instances.TryGetValue($"{instanceOwnerPartyId}/{instanceGuid}", out Instance? instance))
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Instance with id {instanceOwnerPartyId}/{instanceGuid} not found"
            );
        }

        var (mutation, contentParts, parseFailure) = await ReadMutationRequest(request, requestBody, cancellationToken);
        if (parseFailure is not null)
        {
            return parseFailure;
        }

        if (mutation is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "Invalid mutation content");
        }

        if (TryReplayMutation(instanceOwnerPartyId, instanceGuid, request) is { } replayResponse)
        {
            return replayResponse;
        }

        if (
            ValidateMutation(instanceOwnerPartyId, instanceGuid, instance, mutation, contentParts, request) is
            { } validationFailure
        )
        {
            return validationFailure;
        }

        var createdDataElementIds = new List<Guid>();
        foreach (StorageInstanceMutationCreateDataElement create in mutation.CreateDataElements)
        {
            var part = contentParts[create.ContentPartName];
            Guid dataId = Guid.NewGuid();
            createdDataElementIds.Add(dataId);
            var dataElement = new DataElement
            {
                Id = dataId.ToString(),
                InstanceGuid = instanceGuid.ToString(),
                DataType = create.DataType,
                ContentType = create.ContentType ?? part.ContentType,
                Filename = create.Filename ?? part.Filename,
                Size = part.Bytes.Length,
                Metadata = create.Metadata,
                Locked = create.Locked ?? false,
            };
            instance.Data.Add(dataElement);
            _data[dataId] = part.Bytes;
            dataElement.ContentEtag = BumpDataETag(dataId);
        }

        foreach (StorageInstanceMutationUpdateDataElement update in mutation.UpdateDataElements)
        {
            DataElement dataElement = instance.Data.Single(dataElement =>
                dataElement.Id == update.DataElementId.ToString()
            );
            if (update.ContentPartName is { } contentPartName)
            {
                var part = contentParts[contentPartName];
                dataElement.ContentType = update.ContentType ?? part.ContentType;
                dataElement.Filename = update.Filename ?? part.Filename;
                dataElement.Size = part.Bytes.Length;
                _data[update.DataElementId] = part.Bytes;

                dataElement.ContentEtag = BumpDataETag(update.DataElementId);
            }

            if (update.Metadata is not null)
            {
                dataElement.Metadata = update.Metadata;
            }

            if (update.Locked is not null)
            {
                dataElement.Locked = update.Locked.Value;
            }
        }

        foreach (StorageInstanceMutationDeleteDataElement delete in mutation.DeleteDataElements)
        {
            instance.Data.RemoveAll(dataElement => dataElement.Id == delete.DataElementId.ToString());
            _data.TryRemove(delete.DataElementId, out _);
            _dataEtags.TryRemove(delete.DataElementId, out _);
            _dataContentVersions.TryRemove(delete.DataElementId, out _);
        }

        if (mutation.DeleteInstance is not null)
        {
            DateTime now = DateTime.UtcNow;
            instance.Status ??= new InstanceStatus();
            instance.Status.IsHardDeleted = true;
            instance.Status.IsSoftDeleted = true;
            instance.Status.HardDeleted = now;
            instance.Status.SoftDeleted ??= now;
            instance.LastChanged = now;
            instance.LastChangedBy = "storage-interceptor";
        }

        ApplyInstanceFieldUpdates(instance.PresentationTexts ??= [], mutation.PresentationTexts);
        ApplyInstanceFieldUpdates(instance.DataValues ??= [], mutation.DataValues);
        if (mutation.ProcessState?.State is { } processState)
        {
            if (instance.Process?.Ended is null && processState.Ended is not null)
            {
                instance.Status ??= new InstanceStatus();
                instance.Status.IsArchived = true;
                instance.Status.Archived = processState.Ended;
            }

            instance.Process = processState;
        }

        StampContentEtags(instance);
        string responseBody = JsonConvert.SerializeObject(
            new StorageInstanceMutationResponse { Instance = instance, CreatedDataElementIds = createdDataElementIds }
        );
        HttpResponseMessage response = AddVersionHeaders(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseBody, Encoding.UTF8, "application/json"),
            },
            instanceOwnerPartyId,
            instanceGuid,
            GetMutationSubOperationCount(mutation),
            bumpProcessStateVersion: mutation.ProcessState?.State is not null
        );
        StoreMutationReplayRecord(instanceOwnerPartyId, instanceGuid, request, responseBody, response);
        return response;
    }

    private static async Task<(
        StorageInstanceMutationRequest? Mutation,
        Dictionary<string, MutationContentPart> ContentParts,
        HttpResponseMessage? Failure
    )> ReadMutationRequest(HttpRequestMessage request, byte[] requestBody, CancellationToken cancellationToken)
    {
        string? mediaType = request.Content?.Headers.ContentType?.MediaType;
        if (string.Equals(mediaType, "application/json", StringComparison.OrdinalIgnoreCase))
        {
            StorageInstanceMutationRequest? mutation = JsonConvert.DeserializeObject<StorageInstanceMutationRequest>(
                Encoding.UTF8.GetString(requestBody)
            );
            return (mutation, [], null);
        }

        if (!string.Equals(mediaType, "multipart/form-data", StringComparison.OrdinalIgnoreCase))
        {
            return (
                null,
                [],
                CreateErrorResponse(HttpStatusCode.BadRequest, $"Unsupported mutation content type {mediaType}")
            );
        }

        string? contentType = request.Content?.Headers.ContentType?.ToString();
        if (contentType is null)
        {
            return (null, [], CreateErrorResponse(HttpStatusCode.BadRequest, "Missing multipart content type"));
        }

        var parsedContentType = NetMediaTypeHeaderValue.Parse(contentType);
        string? boundary = HeaderUtilities.RemoveQuotes(parsedContentType.Boundary).Value;
        if (string.IsNullOrEmpty(boundary))
        {
            return (null, [], CreateErrorResponse(HttpStatusCode.BadRequest, "Missing multipart boundary"));
        }

        string? mutationJson = null;
        var contentParts = new Dictionary<string, MutationContentPart>(StringComparer.Ordinal);
        var reader = new MultipartReader(boundary, new MemoryStream(requestBody));
        MultipartSection? section;
        while ((section = await reader.ReadNextSectionAsync(cancellationToken)) is not null)
        {
            if (section.ContentDisposition is null)
            {
                continue;
            }

            var contentDisposition = NetContentDispositionHeaderValue.Parse(section.ContentDisposition);
            string? name = HeaderUtilities.RemoveQuotes(contentDisposition.Name).Value;
            if (string.IsNullOrEmpty(name))
            {
                continue;
            }

            using var partStream = new MemoryStream();
            await section.Body.CopyToAsync(partStream, cancellationToken);
            byte[] bytes = partStream.ToArray();
            if (name == "mutation")
            {
                mutationJson = Encoding.UTF8.GetString(bytes);
                continue;
            }

            string? filename =
                HeaderUtilities.RemoveQuotes(contentDisposition.FileNameStar).Value
                ?? HeaderUtilities.RemoveQuotes(contentDisposition.FileName).Value;
            contentParts[name] = new MutationContentPart(
                bytes,
                section.ContentType ?? "application/octet-stream",
                filename
            );
        }

        if (mutationJson is null)
        {
            return (null, contentParts, CreateErrorResponse(HttpStatusCode.BadRequest, "Missing mutation part"));
        }

        StorageInstanceMutationRequest? mutationRequest = JsonConvert.DeserializeObject<StorageInstanceMutationRequest>(
            mutationJson
        );
        return (mutationRequest, contentParts, null);
    }

    private HttpResponseMessage? ValidateMutation(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Instance instance,
        StorageInstanceMutationRequest mutation,
        IReadOnlyDictionary<string, MutationContentPart> contentParts,
        HttpRequestMessage request
    )
    {
        if (ValidateWritePreconditions(instanceOwnerPartyId, instanceGuid, request) is { } preconditionFailure)
        {
            return preconditionFailure;
        }

        foreach (StorageInstanceMutationCreateDataElement create in mutation.CreateDataElements)
        {
            if (!contentParts.TryGetValue(create.ContentPartName, out MutationContentPart? contentPart))
            {
                return CreateErrorResponse(HttpStatusCode.BadRequest, $"Missing content part {create.ContentPartName}");
            }

            var dataType = AppMetadata.DataTypes.FirstOrDefault(dt => dt.Id == create.DataType);
            if (dataType is null)
            {
                return CreateErrorResponse(
                    HttpStatusCode.BadRequest,
                    $"Data type {create.DataType} not found in application metadata"
                );
            }

            string contentType = create.ContentType ?? contentPart.ContentType;
            if (!dataType.AllowedContentTypes.Contains(contentType))
            {
                return CreateErrorResponse(
                    HttpStatusCode.BadRequest,
                    $"Data type {create.DataType} does not allow content type {contentType}"
                );
            }
        }

        foreach (StorageInstanceMutationUpdateDataElement update in mutation.UpdateDataElements)
        {
            if (!instance.Data.Any(dataElement => dataElement.Id == update.DataElementId.ToString()))
            {
                return CreateErrorResponse(
                    HttpStatusCode.NotFound,
                    $"Data element with id {update.DataElementId} not found in instance {instanceOwnerPartyId}/{instanceGuid}"
                );
            }

            if (update.ContentPartName is { } contentPartName && !contentParts.TryGetValue(contentPartName, out _))
            {
                return CreateErrorResponse(HttpStatusCode.BadRequest, $"Missing content part {contentPartName}");
            }

            if (update.ExpectedCurrentBlobVersion is { } expectedVersion)
            {
                if (
                    string.IsNullOrEmpty(expectedVersion)
                    || expectedVersion == "*"
                    || expectedVersion.StartsWith("W/", StringComparison.Ordinal)
                )
                {
                    return CreateErrorResponse(HttpStatusCode.BadRequest, "Invalid expectedCurrentBlobVersion");
                }

                if (
                    !_dataEtags.TryGetValue(update.DataElementId, out string? currentETag)
                    || !MatchesExpectedContentETag(currentETag, expectedVersion)
                )
                {
                    return CreateErrorResponse(HttpStatusCode.PreconditionFailed, "Content ETag mismatch");
                }
            }
        }

        foreach (StorageInstanceMutationDeleteDataElement delete in mutation.DeleteDataElements)
        {
            if (!instance.Data.Any(dataElement => dataElement.Id == delete.DataElementId.ToString()))
            {
                return CreateErrorResponse(
                    HttpStatusCode.NotFound,
                    $"Data element with id {delete.DataElementId} not found in instance {instanceOwnerPartyId}/{instanceGuid}"
                );
            }
        }

        if (mutation.DeleteInstance is not null)
        {
            if (!mutation.DeleteInstance.Hard)
            {
                return CreateErrorResponse(HttpStatusCode.BadRequest, "deleteInstance.hard must be true.");
            }

            if (GetMutationSubOperationCount(mutation) != 1)
            {
                return CreateErrorResponse(
                    HttpStatusCode.BadRequest,
                    "deleteInstance cannot be combined with other aggregate mutation operations."
                );
            }
        }

        return null;
    }

    private static bool MatchesExpectedContentETag(string currentETag, string expectedVersion)
    {
        if (currentETag == expectedVersion)
        {
            return true;
        }

        return currentETag.Length >= 2
            && currentETag[0] == '"'
            && currentETag[^1] == '"'
            && currentETag[1..^1] == expectedVersion;
    }

    private static void ApplyInstanceFieldUpdates(
        Dictionary<string, string?> target,
        IReadOnlyDictionary<string, string?> updates
    )
    {
        foreach (var (key, value) in updates)
        {
            if (string.IsNullOrEmpty(value))
            {
                target.Remove(key);
            }
            else
            {
                target[key] = value;
            }
        }
    }

    private static int GetMutationSubOperationCount(StorageInstanceMutationRequest mutation) =>
        Math.Max(
            1,
            mutation.CreateDataElements.Count
                + mutation.UpdateDataElements.Count
                + mutation.DeleteDataElements.Count
                + (mutation.DeleteInstance is not null ? 1 : 0)
                + (mutation.DataValues.Count > 0 ? 1 : 0)
                + (mutation.PresentationTexts.Count > 0 ? 1 : 0)
                + (mutation.ProcessState?.State is not null ? 1 : 0)
                + (mutation.ProcessState?.Events?.Count > 0 ? 1 : 0)
        );

    private HttpResponseMessage? TryReplayMutation(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        HttpRequestMessage request
    )
    {
        if (
            !TryGetMutationReplayKey(
                instanceOwnerPartyId,
                instanceGuid,
                request,
                out string replayKey,
                out int previousVersion
            )
        )
        {
            return null;
        }

        if (!_mutationReplayRecords.TryGetValue(replayKey, out MutationReplayRecord? record))
        {
            return null;
        }

        string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
        int currentVersion = _instanceVersions.GetOrAdd(instanceId, 1);
        if (currentVersion == record.ProducedInstanceVersion)
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    MarkMutationResponseReplayed(record.ResponseBody),
                    Encoding.UTF8,
                    "application/json"
                ),
            };
            response.Headers.Add(
                "Instance-Version",
                record.ProducedInstanceVersion.ToString(System.Globalization.CultureInfo.InvariantCulture)
            );
            response.Headers.Add(
                "Process-State-Version",
                record.ProducedProcessStateVersion.ToString(System.Globalization.CultureInfo.InvariantCulture)
            );
            return response;
        }

        if (currentVersion != previousVersion)
        {
            return CreateErrorResponse(HttpStatusCode.PreconditionFailed, "Idempotent mutation replay is stale");
        }

        return null;
    }

    private static string MarkMutationResponseReplayed(string responseBody)
    {
        var body = JObject.Parse(responseBody);
        body["replayed"] = true;
        return body.ToString(Formatting.None);
    }

    private void StoreMutationReplayRecord(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        HttpRequestMessage request,
        string responseBody,
        HttpResponseMessage response
    )
    {
        if (!TryGetMutationReplayKey(instanceOwnerPartyId, instanceGuid, request, out string replayKey, out _))
        {
            return;
        }

        int producedInstanceVersion = int.Parse(
            response.Headers.GetValues("Instance-Version").Single(),
            System.Globalization.CultureInfo.InvariantCulture
        );
        int producedProcessStateVersion = int.Parse(
            response.Headers.GetValues("Process-State-Version").Single(),
            System.Globalization.CultureInfo.InvariantCulture
        );
        _mutationReplayRecords[replayKey] = new MutationReplayRecord(
            producedInstanceVersion,
            producedProcessStateVersion,
            responseBody
        );
    }

    private static bool TryGetMutationReplayKey(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        HttpRequestMessage request,
        out string replayKey,
        out int previousVersion
    )
    {
        replayKey = "";
        previousVersion = 0;
        if (
            !request.Headers.TryGetValues(
                StoragePreconditionHeaders.IdempotencyKeyHeaderName,
                out IEnumerable<string>? keyValues
            )
            || keyValues.SingleOrDefault() is not { Length: > 0 } idempotencyKey
            || !request.Headers.TryGetValues(
                StoragePreconditionHeaders.IfInstanceVersionMatchHeaderName,
                out IEnumerable<string>? versionValues
            )
            || !int.TryParse(
                versionValues.SingleOrDefault(),
                System.Globalization.NumberStyles.None,
                System.Globalization.CultureInfo.InvariantCulture,
                out previousVersion
            )
        )
        {
            return false;
        }

        replayKey = $"{instanceOwnerPartyId}/{instanceGuid}:{previousVersion}:{idempotencyKey}";
        return true;
    }

    private sealed record MutationContentPart(byte[] Bytes, string ContentType, string? Filename);

    private sealed record MutationReplayRecord(
        int ProducedInstanceVersion,
        int ProducedProcessStateVersion,
        string ResponseBody
    );

    private bool TryParseDataElementMetadataUrl(
        string[] pathSegments,
        out int instanceOwnerPartyId,
        out Guid instanceGuid,
        out Guid dataId
    )
    {
        if (
            pathSegments
                is [
                    "storage",
                    "api",
                    "v1",
                    "instances",
                    var partyIdStr,
                    var instanceGuidStr,
                    "dataelements",
                    var dataIdStr,
                ]
            && int.TryParse(partyIdStr, out instanceOwnerPartyId)
            && Guid.TryParse(instanceGuidStr, out instanceGuid)
            && Guid.TryParse(dataIdStr, out dataId)
        )
        {
            return true;
        }

        instanceOwnerPartyId = 0;
        instanceGuid = Guid.Empty;
        dataId = Guid.Empty;
        return false;
    }

    private HttpResponseMessage PutDataElement(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        byte[]? requestBody,
        HttpRequestMessage request
    )
    {
        if (requestBody is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "No data element content provided");
        }

        if (!_instances.TryGetValue($"{instanceOwnerPartyId}/{instanceGuid}", out Instance? instance))
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Instance with id {instanceOwnerPartyId}/{instanceGuid} not found"
            );
        }

        var index = instance.Data.FindIndex(dataElement => dataElement.Id == dataId.ToString());
        if (index < 0)
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Data element with id {dataId} not found in instance {instanceOwnerPartyId}/{instanceGuid}"
            );
        }

        if (ValidateWritePreconditions(instanceOwnerPartyId, instanceGuid, request) is { } preconditionFailure)
        {
            return preconditionFailure;
        }

        DataElement? updatedDataElement = System.Text.Json.JsonSerializer.Deserialize<DataElement>(
            requestBody,
            JsonSerializerOptions
        );
        if (updatedDataElement is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "Invalid data element content");
        }

        instance.Data[index] = updatedDataElement;
        string dataElementJson = System.Text.Json.JsonSerializer.Serialize(updatedDataElement);
        return AddVersionHeaders(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(dataElementJson, Encoding.UTF8, "application/json"),
            },
            instanceOwnerPartyId,
            instanceGuid
        );
    }

    private bool TryParsePresentationTextsUrl(
        string[] pathSegments,
        out int instanceOwnerPartyId,
        out Guid instanceGuid
    )
    {
        if (
            pathSegments
                is ["storage", "api", "v1", "instances", var partyIdStr, var instanceGuidStr, "presentationtexts"]
            && int.TryParse(partyIdStr, out instanceOwnerPartyId)
            && Guid.TryParse(instanceGuidStr, out instanceGuid)
        )
        {
            return true;
        }

        instanceOwnerPartyId = 0;
        instanceGuid = Guid.Empty;
        return false;
    }

    private HttpResponseMessage PutPresentationTexts(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        byte[]? requestBody,
        HttpRequestMessage request
    )
    {
        if (requestBody is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "No presentation texts provided");
        }

        if (!_instances.TryGetValue($"{instanceOwnerPartyId}/{instanceGuid}", out Instance? instance))
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Instance with id {instanceOwnerPartyId}/{instanceGuid} not found"
            );
        }

        if (ValidateWritePreconditions(instanceOwnerPartyId, instanceGuid, request) is { } preconditionFailure)
        {
            return preconditionFailure;
        }

        PresentationTexts? presentationTexts = System.Text.Json.JsonSerializer.Deserialize<PresentationTexts>(
            requestBody,
            JsonSerializerOptions
        );
        if (presentationTexts is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "Invalid presentation texts content");
        }

        instance.PresentationTexts ??= [];
        foreach (var (key, value) in presentationTexts.Texts)
        {
            if (string.IsNullOrEmpty(value))
            {
                instance.PresentationTexts.Remove(key);
            }
            else
            {
                instance.PresentationTexts[key] = value;
            }
        }

        string instanceJson = System.Text.Json.JsonSerializer.Serialize(instance);
        return AddVersionHeaders(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(instanceJson, Encoding.UTF8, "application/json"),
            },
            instanceOwnerPartyId,
            instanceGuid
        );
    }

    private bool TryParseDataValuesUrl(string[] pathSegments, out int instanceOwnerPartyId, out Guid instanceGuid)
    {
        if (
            pathSegments is ["storage", "api", "v1", "instances", var partyIdStr, var instanceGuidStr, "datavalues"]
            && int.TryParse(partyIdStr, out instanceOwnerPartyId)
            && Guid.TryParse(instanceGuidStr, out instanceGuid)
        )
        {
            return true;
        }

        instanceOwnerPartyId = 0;
        instanceGuid = Guid.Empty;
        return false;
    }

    private HttpResponseMessage PutDataValues(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        byte[]? requestBody,
        HttpRequestMessage request
    )
    {
        if (requestBody is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "No data values provided");
        }

        if (!_instances.TryGetValue($"{instanceOwnerPartyId}/{instanceGuid}", out Instance? instance))
        {
            return CreateErrorResponse(
                HttpStatusCode.NotFound,
                $"Instance with id {instanceOwnerPartyId}/{instanceGuid} not found"
            );
        }

        if (ValidateWritePreconditions(instanceOwnerPartyId, instanceGuid, request) is { } preconditionFailure)
        {
            return preconditionFailure;
        }

        DataValues? dataValues = System.Text.Json.JsonSerializer.Deserialize<DataValues>(
            requestBody,
            JsonSerializerOptions
        );
        if (dataValues is null)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "Invalid data values content");
        }

        instance.DataValues ??= [];
        foreach (var (key, value) in dataValues.Values)
        {
            if (string.IsNullOrEmpty(value))
            {
                instance.DataValues.Remove(key);
            }
            else
            {
                instance.DataValues[key] = value;
            }
        }

        string instanceJson = System.Text.Json.JsonSerializer.Serialize(instance);
        return AddVersionHeaders(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(instanceJson, Encoding.UTF8, "application/json"),
            },
            instanceOwnerPartyId,
            instanceGuid
        );
    }

    private HttpResponseMessage? ValidateWritePreconditions(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        HttpRequestMessage request,
        Guid? dataId = null
    )
    {
        string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

        if (
            request.Headers.Contains("If-Instance-Version-Match")
            && ValidateVersionPrecondition(
                instanceOwnerPartyId,
                instanceGuid,
                request,
                "If-Instance-Version-Match",
                _instanceVersions.GetOrAdd(instanceId, 1)
            )
                is { } instanceVersionFailure
        )
        {
            return instanceVersionFailure;
        }

        if (
            request.Headers.Contains("If-Process-State-Version-Match")
            && ValidateVersionPrecondition(
                instanceOwnerPartyId,
                instanceGuid,
                request,
                "If-Process-State-Version-Match",
                _processStateVersions.GetOrAdd(instanceId, 1)
            )
                is { } processStateVersionFailure
        )
        {
            return processStateVersionFailure;
        }

        if (dataId is null || !request.Headers.TryGetValues("If-Match", out IEnumerable<string>? ifMatchValues))
        {
            return null;
        }

        if (
            !NetEntityTagHeaderValue.TryParseList([.. ifMatchValues], out IList<NetEntityTagHeaderValue>? ifMatch)
            || ifMatch.Count != 1
            || ifMatch[0].IsWeak
            || ifMatch[0].Equals(NetEntityTagHeaderValue.Any)
        )
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "Expected one strong If-Match value");
        }

        NetEntityTagHeaderValue expectedETag = ifMatch[0];
        string blobVersionId = expectedETag.Tag.Value![1..^1];
        if (!IsBlobVersionId(blobVersionId))
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, "If-Match ETag value must be a blob version id");
        }

        if (!_dataEtags.TryGetValue(dataId.Value, out string? currentETag) || currentETag != expectedETag.ToString())
        {
            return CreateErrorResponse(HttpStatusCode.PreconditionFailed, "Content ETag mismatch");
        }

        return null;
    }

    private HttpResponseMessage? ValidateVersionPrecondition(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        HttpRequestMessage request,
        string headerName,
        int currentVersion
    )
    {
        if (!request.Headers.TryGetValues(headerName, out IEnumerable<string>? values))
        {
            return null;
        }

        string? value = values.SingleOrDefault();
        if (!int.TryParse(value, out int expectedVersion) || expectedVersion <= 0)
        {
            return CreateErrorResponse(HttpStatusCode.BadRequest, $"Invalid {headerName}");
        }

        if (expectedVersion == currentVersion)
        {
            return null;
        }

        return CreateErrorResponse(HttpStatusCode.PreconditionFailed, $"{headerName} mismatch");
    }

    private HttpResponseMessage AddVersionHeaders(
        HttpResponseMessage response,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        int instanceVersionIncrement = 1,
        bool bumpProcessStateVersion = false
    )
    {
        string instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";
        int instanceVersion = _instanceVersions.AddOrUpdate(
            instanceId,
            instanceVersionIncrement,
            (_, current) => current + instanceVersionIncrement
        );
        int processStateVersion = _processStateVersions.AddOrUpdate(
            instanceId,
            bumpProcessStateVersion ? 2 : 1,
            (_, current) => current + (bumpProcessStateVersion ? 1 : 0)
        );
        response.Headers.Add(
            "Instance-Version",
            instanceVersion.ToString(System.Globalization.CultureInfo.InvariantCulture)
        );
        response.Headers.Add(
            "Process-State-Version",
            processStateVersion.ToString(System.Globalization.CultureInfo.InvariantCulture)
        );
        return response;
    }

    private string BumpDataETag(Guid dataId)
    {
        int contentVersion = _dataContentVersions.AddOrUpdate(dataId, 1, (_, current) => current + 1);
        string eTag = CreateDataETag(contentVersion);
        _dataEtags[dataId] = eTag;
        return eTag;
    }

    private string EnsureDataETag(Guid dataId)
    {
        return _dataEtags.GetOrAdd(
            dataId,
            id =>
            {
                int contentVersion = _dataContentVersions.GetOrAdd(id, 1);
                return CreateDataETag(contentVersion);
            }
        );
    }

    public static string CreateDataETag(int contentVersion)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(contentVersion);
        Span<byte> bytes = stackalloc byte[16];
        BinaryPrimitives.WriteInt32BigEndian(bytes[12..], contentVersion);
        return $"\"{Base64Url.EncodeToString(bytes)}\"";
    }

    private void StampContentEtags(Instance instance)
    {
        foreach (DataElement dataElement in instance.Data ?? [])
        {
            dataElement.ContentEtag =
                Guid.TryParse(dataElement.Id, out Guid dataId) && _dataEtags.TryGetValue(dataId, out string? eTag)
                    ? eTag
                    : null;
        }
    }

    private static bool TryParseGeneratedETagVersion(string eTag, out int version)
    {
        if (eTag.Length == 24 && eTag[0] == '"' && eTag[^1] == '"')
        {
            Span<byte> bytes = stackalloc byte[16];
            if (
                Base64Url.TryDecodeFromChars(eTag.AsSpan(1, 22), bytes, out int bytesWritten)
                && bytesWritten == 16
                && bytes[..12].IndexOfAnyExcept((byte)0) < 0
            )
            {
                version = BinaryPrimitives.ReadInt32BigEndian(bytes[12..]);
                return version > 0;
            }
        }

        version = 0;
        return false;
    }

    private static bool IsBlobVersionId(string value)
    {
        if (value.Length != 22)
        {
            return false;
        }

        Span<byte> bytes = stackalloc byte[16];
        try
        {
            return Base64Url.TryDecodeFromChars(value, bytes, out int bytesWritten) && bytesWritten == 16;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static HttpResponseMessage CreateErrorResponse(
        HttpStatusCode status,
        string stringContent,
        string contentType = "text/plain"
    )
    {
        return new HttpResponseMessage(status)
        {
            Content = new StringContent(stringContent, Encoding.UTF8, contentType),
        };
    }
}
