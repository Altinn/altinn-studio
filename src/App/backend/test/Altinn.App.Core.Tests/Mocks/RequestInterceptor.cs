using System.Net;
using Altinn.App.Core.Exceptions;

namespace Altinn.App.PlatformServices.Tests.Mocks;

public class RequestInterceptor : DelegatingHandler
{
    private HttpRequestMessage? _request;

    private readonly HttpResponseMessage _response;

    public RequestInterceptor(HttpStatusCode responseCode, Stream responseContent)
    {
        StreamContent streamContent = new StreamContent(responseContent);
        _response = new HttpResponseMessage(responseCode) { Content = streamContent };
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        _request = request;
        return Task.FromResult(_response);
    }

    /// <summary>
    /// Ensures that the request body is serialized.
    /// </summary>
    /// <returns>A stringified version of the request body.</returns>
    public async Task<string> GetRequestContentAsStringAsync()
    {
        if (_request is null)
        {
            throw new RequestInterceptorException("No request has been captured.");
        }

        if (_request.Method != HttpMethod.Post)
        {
            throw new RequestInterceptorException("Only POST requests are assumed to have request body");
        }

        return await _request.Content!.ReadAsStringAsync();
    }

    internal class RequestInterceptorException : AltinnException
    {
        internal RequestInterceptorException(string? message)
            : base(message) { }
    }
}
