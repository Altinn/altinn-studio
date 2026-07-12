using System.Net;
using System.Net.Http.Json;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Mocks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Storage;

public sealed class StorageClientInterceptorTests
{
    [Fact]
    public async Task GetInstance_StampsDataElementETagByDefault()
    {
        var (storage, _, dataId) = CreateStorage();
        using var client = new HttpClient(storage);

        HttpResponseMessage response = await client.GetAsync(InstanceUrl);
        Instance instance = (await response.Content.ReadFromJsonAsync<Instance>())!;

        Assert.Equal(StorageClientInterceptor.CreateDataETag(1), Assert.Single(instance.Data).ContentEtag);
        Assert.Equal(StorageClientInterceptor.CreateDataETag(1), GetStoredDataElement(instance, dataId).ContentEtag);
    }

    [Fact]
    public async Task GetInstance_WhenDefaultStampingIsDisabled_LeavesLegacyDataElementWithoutETag()
    {
        var (storage, _, _) = CreateStorage(stampDataElementEtags: false);
        using var client = new HttpClient(storage);

        HttpResponseMessage response = await client.GetAsync(InstanceUrl);
        Instance instance = (await response.Content.ReadFromJsonAsync<Instance>())!;

        Assert.Null(Assert.Single(instance.Data).ContentEtag);
    }

    [Fact]
    public async Task GetData_WhenIfMatchDoesNotMatch_ReturnsPreconditionFailedWithoutVersionHeadersOrETag()
    {
        var (storage, _, dataId) = CreateStorage();
        using var client = new HttpClient(storage);
        using var request = new HttpRequestMessage(HttpMethod.Get, DataUrl(dataId));
        request.Headers.IfMatch.ParseAdd(StorageClientInterceptor.CreateDataETag(2));

        HttpResponseMessage response = await client.SendAsync(request);

        AssertPreconditionFailedWithoutVersionHeadersOrETag(response);
    }

    [Fact]
    public async Task GetData_WhenIfMatchIsNotABlobVersionId_ReturnsBadRequest()
    {
        var (storage, _, dataId) = CreateStorage();
        using var client = new HttpClient(storage);
        using var request = new HttpRequestMessage(HttpMethod.Get, DataUrl(dataId));
        request.Headers.IfMatch.ParseAdd("\"not-a-blob-version\"");

        HttpResponseMessage response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetData_WhenIfMatchHasMalformedRawSyntax_ReturnsBadRequest()
    {
        var (storage, _, dataId) = CreateStorage();
        using var client = new HttpClient(storage);
        using var request = new HttpRequestMessage(HttpMethod.Get, DataUrl(dataId));
        request.Headers.TryAddWithoutValidation("If-Match", "not-quoted");

        HttpResponseMessage response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    public static TheoryData<string> InvalidIfMatchLists =>
        new()
        {
            $"{StorageClientInterceptor.CreateDataETag(1)}, {StorageClientInterceptor.CreateDataETag(2)}",
            $"W/{StorageClientInterceptor.CreateDataETag(1)}",
            "*",
        };

    [Theory]
    [MemberData(nameof(InvalidIfMatchLists))]
    public async Task GetData_WhenIfMatchIsNotExactlyOneStrongTag_ReturnsBadRequest(string ifMatch)
    {
        var (storage, _, dataId) = CreateStorage();
        using var client = new HttpClient(storage);
        using var request = new HttpRequestMessage(HttpMethod.Get, DataUrl(dataId));
        request.Headers.TryAddWithoutValidation("If-Match", ifMatch);

        using HttpResponseMessage response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostMutation_WhenExpectedCurrentBlobVersionDoesNotMatch_ReturnsPreconditionFailedWithoutVersionHeadersOrETag()
    {
        var (storage, _, dataId) = CreateStorage();
        using var client = new HttpClient(storage);
        using HttpResponseMessage response = await client.PostAsJsonAsync(
            MutationUrl,
            new
            {
                updateDataElements = new[]
                {
                    new
                    {
                        dataElementId = dataId,
                        expectedCurrentBlobVersion = StorageClientInterceptor.CreateDataETag(2),
                    },
                },
            }
        );

        AssertPreconditionFailedWithoutVersionHeadersOrETag(response);
    }

    [Fact]
    public async Task PostMutation_WhenIdempotentReplayIsStale_ReturnsPreconditionFailedWithoutVersionHeadersOrETag()
    {
        var (storage, _, _) = CreateStorage();
        using var client = new HttpClient(storage);
        var originalMutation = new { dataValues = new Dictionary<string, string> { ["status"] = "first" } };
        using HttpRequestMessage firstRequest = CreateMutationRequest(
            originalMutation,
            expectedInstanceVersion: 1,
            idempotencyKey: "replay-key"
        );
        using HttpResponseMessage firstResponse = await client.SendAsync(firstRequest);
        firstResponse.EnsureSuccessStatusCode();
        using HttpResponseMessage interveningResponse = await client.PostAsJsonAsync(
            MutationUrl,
            new { dataValues = new Dictionary<string, string> { ["status"] = "second" } }
        );
        interveningResponse.EnsureSuccessStatusCode();
        using HttpRequestMessage replayRequest = CreateMutationRequest(
            originalMutation,
            expectedInstanceVersion: 1,
            idempotencyKey: "replay-key"
        );

        using HttpResponseMessage replayResponse = await client.SendAsync(replayRequest);

        AssertPreconditionFailedWithoutVersionHeadersOrETag(replayResponse);
    }

    [Theory]
    [InlineData("If-Instance-Version-Match")]
    [InlineData("If-Process-State-Version-Match")]
    public async Task GetData_WhenVersionPreconditionDoesNotMatch_ReturnsPreconditionFailedWithoutVersionHeadersOrETag(
        string headerName
    )
    {
        var (storage, _, dataId) = CreateStorage();
        using var client = new HttpClient(storage);
        using var request = new HttpRequestMessage(HttpMethod.Get, DataUrl(dataId));
        request.Headers.Add(headerName, "2");

        using HttpResponseMessage response = await client.SendAsync(request);

        AssertPreconditionFailedWithoutVersionHeadersOrETag(response);
    }

    private const int InstanceOwnerPartyId = 123456;
    private static readonly Guid InstanceGuid = Guid.Parse("00000000-dead-face-babe-000000000001");
    private static string InstanceUrl =>
        $"http://storage/storage/api/v1/instances/{InstanceOwnerPartyId}/{InstanceGuid}";

    private static string DataUrl(Guid dataId) => $"{InstanceUrl}/data/{dataId}";

    private static string MutationUrl => $"{InstanceUrl}/mutations";

    private static HttpRequestMessage CreateMutationRequest(
        object mutation,
        int expectedInstanceVersion,
        string idempotencyKey
    )
    {
        var request = new HttpRequestMessage(HttpMethod.Post, MutationUrl) { Content = JsonContent.Create(mutation) };
        request.Headers.Add("If-Instance-Version-Match", expectedInstanceVersion.ToString());
        request.Headers.Add("Idempotency-Key", idempotencyKey);
        return request;
    }

    private static void AssertPreconditionFailedWithoutVersionHeadersOrETag(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.PreconditionFailed, response.StatusCode);
        Assert.Null(response.Headers.ETag);
        Assert.False(response.Headers.Contains("Instance-Version"));
        Assert.False(response.Headers.Contains("Process-State-Version"));
    }

    private static (StorageClientInterceptor Storage, Instance Instance, Guid DataId) CreateStorage(
        bool stampDataElementEtags = true
    )
    {
        const string dataTypeId = "payment";
        var appMetadata = new ApplicationMetadata("ttd/test")
        {
            DataTypes = [new DataType { Id = dataTypeId, AllowedContentTypes = ["application/json"] }],
        };
        var storage = new StorageClientInterceptor(appMetadata, stampDataElementEtags);
        Guid dataId = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{InstanceGuid}",
            AppId = appMetadata.Id,
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
            Data =
            [
                new DataElement
                {
                    Id = dataId.ToString(),
                    InstanceGuid = InstanceGuid.ToString(),
                    DataType = dataTypeId,
                    ContentType = "application/json",
                },
            ],
        };
        storage.AddInstance(instance);
        storage.AddDataRaw(dataId, "content"u8.ToArray());
        return (storage, instance, dataId);
    }

    private static DataElement GetStoredDataElement(Instance instance, Guid dataId) =>
        Assert.Single(instance.Data, dataElement => dataElement.Id == dataId.ToString());
}
