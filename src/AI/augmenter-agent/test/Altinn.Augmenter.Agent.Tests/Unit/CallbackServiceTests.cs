using System.Text;
using Altinn.Augmenter.Agent.Services;
using FluentAssertions;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Altinn.Augmenter.Agent.Tests.Unit;

public class CallbackServiceTests : IDisposable
{
    private readonly WireMockServer _server;
    private readonly CallbackService _sut;

    public CallbackServiceTests()
    {
        _server = WireMockServer.Start();
        _sut = new CallbackService(new HttpClient());
    }

    [Fact]
    public async Task SendPdfAsync_PostsPdfToCallbackUrl()
    {
        _server
            .Given(Request.Create().WithPath("/callback").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(200));

        var pdfBytes = Encoding.UTF8.GetBytes("%PDF-fake");

        await _sut.SendPdfAsync($"{_server.Url}/callback", pdfBytes);

        var logs = _server.LogEntries;
        logs.Should().HaveCount(1);

        var body = logs.First().RequestMessage.BodyAsBytes;
        body.Should().NotBeNull();
    }

    [Fact]
    public async Task SendPdfAsync_ServerReturns500_ThrowsException()
    {
        _server
            .Given(Request.Create().WithPath("/callback").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(500));

        var pdfBytes = Encoding.UTF8.GetBytes("%PDF-fake");

        var act = () => _sut.SendPdfAsync($"{_server.Url}/callback", pdfBytes);

        await act.Should().ThrowAsync<HttpRequestException>();
    }

    public void Dispose()
    {
        _server.Dispose();
        GC.SuppressFinalize(this);
    }
}
