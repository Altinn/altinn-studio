namespace Altinn.App.Core.Tests.Features.Options.Altinn3LibraryProvider;

internal sealed class Altinn3LibraryCodeListClientMessageHandlerMock : DelegatingHandler
{
    // Instrumentation to test that caching works
    public int CallCount => _callCount;
    private int _callCount = 0;

    public string? LastRequestUri;
    private readonly Func<HttpResponseMessage> _httpResponseMessage;

    public Altinn3LibraryCodeListClientMessageHandlerMock(Func<HttpResponseMessage> httpResponseMessage)
    {
        _httpResponseMessage = httpResponseMessage;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        LastRequestUri = request.RequestUri?.ToString();
        Interlocked.Increment(ref _callCount);
        return Task.FromResult(_httpResponseMessage());
    }
}
