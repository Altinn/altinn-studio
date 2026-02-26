using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Web;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

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

    public StorageClientInterceptor(string org = "ttd", string app = "mocked-test-app")
    {
        AppMetadata = new($"{org}/{app}")
        {
            Title = new Dictionary<string, string>
            {
                { LanguageConst.Nb, "Testapplikasjon" },
                { LanguageConst.En, "Mocked Test App" },
            },
            DataTypes = [],
        };
    }

    public ConcurrentBag<RequestResponse> RequestsResponses { get; } = new();
    public ApplicationMetadata AppMetadata { get; }

    public void AddInstance(Instance instance)
    {
        instance.Data ??= [];
        _instances[instance.Id] = instance;
    }

    public void AddDataRaw(Guid dataId, byte[] data)
    {
        _data[dataId] = data;
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
            ("GET", { } path) when TryParseInstanceUrl(path, out int partyId, out Guid instanceGuid) => GetInstance(
                partyId,
                instanceGuid
            ),
            ("GET", { } path) when TryParseDataUrl(path, out int partyId, out Guid instanceGuid, out Guid dataId) =>
                GetData(partyId, instanceGuid, dataId),
            ("POST", { } path) when TryParseDataPostUrl(path, out int partyId, out Guid instanceGuid) => PostData(
                partyId,
                instanceGuid,
                requestBody,
                request
            ),
            ("PUT", { } path) when TryParseDataUrl(path, out int partyId, out Guid instanceGuid, out Guid dataId) =>
                PutData(partyId, instanceGuid, dataId, requestBody, request),
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

        var dataElementJson = System.Text.Json.JsonSerializer.Serialize(dataElement);
        return new HttpResponseMessage(HttpStatusCode.Created)
        {
            Content = new StringContent(dataElementJson, Encoding.UTF8, "application/json"),
        };
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

    private HttpResponseMessage GetInstance(int partyId, Guid instanceGuid)
    {
        if (!_instances.TryGetValue($"{partyId}/{instanceGuid}", out Instance? instance))
        {
            return new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent($"Instance with id {instanceGuid} not found"),
            };
        }
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

    private HttpResponseMessage GetData(int partyId, Guid instanceGuid, Guid dataId)
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
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(storedData)
            {
                Headers =
                {
                    ContentType = new MediaTypeHeaderValue(dataElement.ContentType ?? "application/octet-stream"),
                },
            },
        };
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

        var dataElement = AddData(instance, dataTypeString, contentType, dataContent);
        var dataElementJson = System.Text.Json.JsonSerializer.Serialize(dataElement);
        return new HttpResponseMessage(HttpStatusCode.Created)
        {
            Content = new StringContent(dataElementJson, Encoding.UTF8, "application/json"),
        };
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
