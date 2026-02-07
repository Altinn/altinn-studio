using System.Net;
using System.Text.Json;
using Altinn.Augmenter.Agent.Tests.Integration.Helpers;
using FluentAssertions;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Altinn.Augmenter.Agent.Tests.Integration;

public class GenerateAsyncTests : IClassFixture<TestWebApplicationFactory>, IDisposable
{
    private readonly HttpClient _client;
    private readonly WireMockServer _callbackServer;

    public GenerateAsyncTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
        _callbackServer = WireMockServer.Start();
    }

    [Fact]
    public async Task PostGenerateAsync_WithValidRequest_ReturnsAccepted()
    {
        _callbackServer
            .Given(Request.Create().WithPath("/callback").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200));

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("{}"u8.ToArray());
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
        content.Add(fileContent, "file", "test.json");
        content.Add(new StringContent($"{_callbackServer.Url}/callback"), "callback-url");

        var response = await _client.PostAsync("/generate-async", content);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("status").GetString().Should().Be("accepted");

        // Poll for the background task to complete (Typst CLI may take a moment)
        for (var i = 0; i < 20; i++)
        {
            if (_callbackServer.LogEntries.Any())
            {
                break;
            }

            await Task.Delay(500);
        }

        _callbackServer.LogEntries.Should().HaveCountGreaterOrEqualTo(1);
    }

    [Fact]
    public async Task PostGenerateAsync_WithMissingCallbackUrl_Returns400()
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("{}"u8.ToArray());
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
        content.Add(fileContent, "file", "test.json");

        var response = await _client.PostAsync("/generate-async", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostGenerateAsync_WithInvalidCallbackUrl_Returns400()
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("{}"u8.ToArray());
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
        content.Add(fileContent, "file", "test.json");
        content.Add(new StringContent("not-a-url"), "callback-url");

        var response = await _client.PostAsync("/generate-async", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    public void Dispose()
    {
        _callbackServer.Dispose();
        GC.SuppressFinalize(this);
    }
}
