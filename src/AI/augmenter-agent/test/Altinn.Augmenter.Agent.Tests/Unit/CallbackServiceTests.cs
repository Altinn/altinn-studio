using System.Text;
using Altinn.Augmenter.Agent.Models;
using Altinn.Augmenter.Agent.Services;
using FluentAssertions;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Altinn.Augmenter.Agent.Tests.Unit;

public class CallbackServiceTests : IDisposable
{
    private readonly WireMockServer _server;
    private readonly HttpClient _httpClient;
    private readonly CallbackService _sut;

    public CallbackServiceTests()
    {
        _server = WireMockServer.Start();
        _httpClient = new HttpClient();
        _sut = new CallbackService(_httpClient);
    }

    [Fact]
    public async Task SendPdfsAsync_PostsPdfsToCallbackUrl()
    {
        _server
            .Given(Request.Create().WithPath("/callback").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200));

        var pdfs = new List<GeneratedPdf>
        {
            new("test.pdf", Encoding.UTF8.GetBytes("%PDF-fake")),
        };

        await _sut.SendPdfsAsync($"{_server.Url}/callback", pdfs);

        var logs = _server.LogEntries;
        logs.Should().HaveCount(1);

        var body = logs.First().RequestMessage.BodyAsBytes;
        body.Should().NotBeNull();
    }

    [Fact]
    public async Task SendPdfsAsync_ServerReturns500_ThrowsException()
    {
        _server
            .Given(Request.Create().WithPath("/callback").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(500));

        var pdfs = new List<GeneratedPdf>
        {
            new("test.pdf", Encoding.UTF8.GetBytes("%PDF-fake")),
        };

        var act = () => _sut.SendPdfsAsync($"{_server.Url}/callback", pdfs);

        await act.Should().ThrowAsync<HttpRequestException>();
    }

    public void Dispose()
    {
        _httpClient.Dispose();
        _server.Dispose();
        GC.SuppressFinalize(this);
    }
}
