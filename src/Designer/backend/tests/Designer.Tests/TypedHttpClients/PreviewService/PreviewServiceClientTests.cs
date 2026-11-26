using System;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.TypedHttpClients.PreviewService;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using Xunit;

namespace Designer.Tests.TypedHttpClients.PreviewService;

public class PreviewServiceClientTests : IDisposable
{
    private const string SessionUrl = "https://preview.test/0123456789abcdef0123456789abcdef/ttd/my-app/";

    private readonly WireMockServer _server = WireMockServer.Start();

    [Fact]
    public async Task StartSession_AsksForTheDevelopersWorkingCopyAndReturnsTheSessionUrl()
    {
        _server
            .Given(Request.Create().WithPath("/sessions").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new { url = SessionUrl }));

        Uri url = await Client().StartSession("developer", "ttd", "my-app", CancellationToken.None);

        Assert.Equal(new Uri(SessionUrl), url);
        string body = Assert.Single(_server.LogEntries).RequestMessage.Body;
        using JsonDocument request = JsonDocument.Parse(body);
        Assert.Equal("developer", request.RootElement.GetProperty("developer").GetString());
        Assert.Equal("ttd", request.RootElement.GetProperty("org").GetString());
        Assert.Equal("my-app", request.RootElement.GetProperty("app").GetString());
    }

    [Fact]
    public async Task StartSession_ReturnsNullWhenTheDeveloperHasNoWorkingCopy()
    {
        _server
            .Given(Request.Create().WithPath("/sessions").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(404));

        Uri url = await Client().StartSession("developer", "ttd", "my-app", CancellationToken.None);

        Assert.Null(url);
    }

    [Fact]
    public async Task StartSession_ThrowsWhenThePreviewServiceFails()
    {
        _server
            .Given(Request.Create().WithPath("/sessions").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(500));

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            Client().StartSession("developer", "ttd", "my-app", CancellationToken.None)
        );
    }

    [Fact]
    public async Task StartSession_ThrowsWithoutAnInternalBaseUrl()
    {
        var client = new PreviewServiceClient(new HttpClient(), new PreviewServiceSettings());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.StartSession("developer", "ttd", "my-app", CancellationToken.None)
        );
        Assert.Empty(_server.LogEntries.ToList());
    }

    [Fact]
    public async Task CreateInstance_AsksForAnInstanceInTheDevelopersSession()
    {
        _server
            .Given(Request.Create().WithPath("/sessions/instances").UsingPost())
            .RespondWith(
                Response.Create().WithStatusCode(201).WithBodyAsJson(new { instanceId = "51001/instance-guid" })
            );

        string instanceId = await Client()
            .CreateInstance("developer", "ttd", "my-app", new Uri(SessionUrl), "Task_1", CancellationToken.None);

        Assert.Equal("51001/instance-guid", instanceId);
        string body = Assert.Single(_server.LogEntries).RequestMessage.Body;
        using JsonDocument request = JsonDocument.Parse(body);
        Assert.Equal("developer", request.RootElement.GetProperty("developer").GetString());
        Assert.Equal(SessionUrl, request.RootElement.GetProperty("sessionUrl").GetString());
        Assert.Equal("Task_1", request.RootElement.GetProperty("taskId").GetString());
    }

    [Fact]
    public async Task CreateInstance_ReturnsNullWhenTheDeveloperHasNoSuchSession()
    {
        _server
            .Given(Request.Create().WithPath("/sessions/instances").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(404));

        string instanceId = await Client()
            .CreateInstance("developer", "ttd", "my-app", new Uri(SessionUrl), "Task_1", CancellationToken.None);

        Assert.Null(instanceId);
    }

    public void Dispose()
    {
        _server.Stop();
        _server.Dispose();
        GC.SuppressFinalize(this);
    }

    private PreviewServiceClient Client() =>
        new(new HttpClient(), new PreviewServiceSettings { InternalBaseUrl = new Uri(_server.Urls[0]) });
}
