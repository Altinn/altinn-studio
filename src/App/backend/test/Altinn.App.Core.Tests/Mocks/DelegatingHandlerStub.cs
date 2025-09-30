#nullable disable
using System.Net;

namespace Altinn.App.PlatformServices.Tests.Mocks;

public class DelegatingHandlerStub : DelegatingHandler
{
    private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _handlerFunc;

    public DelegatingHandlerStub()
    {
        _handlerFunc = (request, cancellationToken) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
    }

    public DelegatingHandlerStub(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handlerFunc)
    {
        _handlerFunc = handlerFunc;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        return _handlerFunc(request, cancellationToken);
    }
}
