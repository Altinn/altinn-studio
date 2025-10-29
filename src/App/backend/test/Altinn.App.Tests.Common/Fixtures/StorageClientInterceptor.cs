using System.Collections.Concurrent;
using System.Net.Http.Headers;
using Altinn.App.Core.Infrastructure.Clients.Storage;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Tests.Common.Mocks;

public class StorageClientInterceptor : HttpMessageHandler
{
    public void AddStorageClients(IServiceCollection services)
    {
        services.AddHttpClient<IDataClient, DataClient>().ConfigurePrimaryHttpMessageHandler(() => this);
        services.AddHttpClient<IInstanceClient, InstanceClient>().ConfigurePrimaryHttpMessageHandler(() => this);
    }

    private ConcurrentDictionary<string, Instance> _instances = new();
    private ConcurrentDictionary<Guid, byte[]> _data = new();

    public void AddInstance(Instance instance)
    {
        _instances[instance.Id] = instance;
    }

    public void AddData(Guid dataId, byte[] data)
    {
        _data[dataId] = data;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var requestBody = request.Content is not null
            ? await request.Content.ReadAsByteArrayAsync(cancellationToken)
            : null;

        return (request.Method.Method, request.RequestUri?.AbsolutePath.Trim('/').Split('/')) switch
        {
            ("GET", { } path) when TryParseInstanceUrl(path, out int partyId, out Guid instanceGuid) => GetInstance(
                partyId,
                instanceGuid
            ),
            ("GET", { } path) when TryParseDataUrl(path, out int partyId, out Guid instanceGuid, out Guid dataId) =>
                GetData(partyId, instanceGuid, dataId),
            var (method, _) => throw new Exception(
                $"Unhandled request to {request.RequestUri?.AbsolutePath} with method {method} and body\n\n{(requestBody is not null ? System.Text.Encoding.UTF8.GetString(requestBody) : "[no body]")}"
            ),
        };
    }

    private HttpResponseMessage GetData(int partyId, Guid instanceGuid, Guid dataId)
    {
        if (!_instances.TryGetValue($"{partyId}/{instanceGuid}", out Instance? instance))
        {
            return new HttpResponseMessage(System.Net.HttpStatusCode.NotFound)
            {
                Content = new StringContent($"Instance with id {instanceGuid} not found"),
            };
        }
        var dataElement = instance.Data.FirstOrDefault(de => de.Id == dataId.ToString());
        if (dataElement == null)
        {
            return new HttpResponseMessage(System.Net.HttpStatusCode.NotFound)
            {
                Content = new StringContent($"Data element with id {dataId} not found in instance {instanceGuid}"),
            };
        }

        if (!_data.TryGetValue(dataId, out var storedData))
        {
            return new HttpResponseMessage(System.Net.HttpStatusCode.NotFound)
            {
                Content = new StringContent($"Data with id {dataId} not found"),
            };
        }
        return new HttpResponseMessage(System.Net.HttpStatusCode.OK)
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

    private HttpResponseMessage GetInstance(int partyId, Guid instanceGuid)
    {
        throw new NotImplementedException();
    }

    public bool TryParseInstanceUrl(string[] pathSegments, out int instanceOwnerPartyId, out Guid instanceGuid)
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

    public bool TryParseDataUrl(
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
}
