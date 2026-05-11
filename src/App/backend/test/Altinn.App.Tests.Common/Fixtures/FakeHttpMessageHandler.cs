using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;

namespace Altinn.App.Tests.Common.Fixtures;

/// <summary>
/// Very simple abstraction that can be used to extend the functionality of <see cref="FakeHttpMessageHandler"/>.
///
/// Only one endpoint should match a given request. (or an exception is thrown)
/// </summary>
public abstract class Endpoint
{
    /// <summary>
    /// Pretty name of the endpoint for logging and error messages.
    /// </summary>
    public abstract string Name { get; }

    /// <summary>
    /// Determines if the endpoint matches the given request.
    /// Only one endpoint should match a given request.
    /// </summary>
    public abstract bool Matches(HttpRequestMessage request);

    /// <summary>
    /// Handle the request and return a response.
    /// </summary>
    public abstract Task<HttpResponseMessage> Handle(HttpRequestMessage request);

    /// <summary>
    /// Verifies that the endpoint was called as expected.
    /// </summary>
    public abstract void Verify();
}

/// <summary>
/// Simple default HttpMessageHandler that throws NotImplementedException.
/// Used to ensure that tests that do not setup a mock HttpMessageHandler
/// get a clear exception message.
/// </summary>
public class FakeHttpMessageHandler : HttpMessageHandler
{
    public static ActivitySource ActivitySource { get; } =
        new("Altinn.App.Tests.Common.Fixtures.FakeHttpMessageHandler");
    public ConcurrentBag<RequestResponse> RequestResponses { get; } = new();

    /// <summary>
    /// Simple implementation of an endpoint that matches HttpMethods and URL patterns with wildcards.
    /// </summary>
    private class UrlPatternEndpoint : Endpoint
    {
        private readonly HttpMethod _method;
        private readonly string _urlPattern;
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _handler;
        private readonly int _minimumCalls;

        public UrlPatternEndpoint(
            HttpMethod method,
            string urlPattern,
            Func<HttpRequestMessage, Task<HttpResponseMessage>> handler,
            int minimumCalls
        )
        {
            _method = method;
            _urlPattern = urlPattern;
            _handler = handler;
            _minimumCalls = minimumCalls;
        }

        public override string Name => $"{_method} {_urlPattern}";

        public override bool Matches(HttpRequestMessage request)
        {
            if (_method != request.Method)
            {
                return false;
            }
            if (_urlPattern.StartsWith('/'))
            {
                var url =
                    request.RequestUri?.AbsolutePath ?? throw new InvalidOperationException("Request URI is null");
                return MatchUrlPattern(_urlPattern, url);
            }
            var fullUrl = request.RequestUri?.ToString() ?? throw new InvalidOperationException("Request URI is null");
            return MatchUrlPattern(_urlPattern, fullUrl);
        }

        /// <summary>
        /// Matches a URL pattern with wildcards against a URL.
        /// </summary>
        /// <remarks>
        /// Very simple implementation:
        /// - '*' matches zero or more characters until the next '/' or the end of the string
        /// - All other characters must match exactly
        /// </remarks>
        private static bool MatchUrlPattern(ReadOnlySpan<char> pattern, ReadOnlySpan<char> url)
        {
            var (i, j) = (0, 0);

            while (i < pattern.Length)
            {
                if (pattern[i] == '*')
                {
                    // '*' matches zero or more chars until '/' or end
                    while (j < url.Length && url[j] != '/')
                        j++;

                    i++;
                    continue;
                }
                if (pattern[i] == '{')
                {
                    // '{' indicates a path parameter, match until '}'
                    i++;
                    while (i < pattern.Length && pattern[i] != '}')
                        i++;

                    // Move past '}'
                    i++;

                    // Match until next '/' or end
                    while (j < url.Length && url[j] != '/')
                        j++;

                    continue;
                }

                // If url is exhausted, no match
                if (j >= url.Length)
                    return false;

                if (pattern[i] != url[j])
                    return false;

                i++;
                j++;
            }

            // Full match required
            return j == url.Length;
        }

        private volatile int _callCount;

        public override async Task<HttpResponseMessage> Handle(HttpRequestMessage request)
        {
            Interlocked.Increment(ref _callCount);
            return await _handler(request);
        }

        public override void Verify()
        {
            if (_callCount < _minimumCalls)
            {
                throw new Exception(
                    $"Expected endpoint {Name} to be called at least {_minimumCalls} times, but it was called {_callCount} times."
                );
            }
        }
    }

    private readonly ConcurrentBag<Endpoint> _endpoints = new();

    public void RegisterEndpoint(
        HttpMethod method,
        string urlPattern,
        Func<HttpRequestMessage, Task<HttpResponseMessage>> handler,
        int minimumCalls = 1
    )
    {
        _endpoints.Add(new UrlPatternEndpoint(method, urlPattern, handler, minimumCalls));
    }

    /// <summary>
    /// Registers a simple endpoint that returns a fixed response.
    /// </summary>
    public void RegisterEndpoint(
        HttpMethod method,
        string urlPattern,
        HttpStatusCode statusCode,
        string contentType,
        string content,
        int minimumCalls = 1
    )
    {
        RegisterEndpoint(
            method,
            urlPattern,
            request =>
                Task.FromResult(
                    new HttpResponseMessage(statusCode)
                    {
                        Content = new StringContent(content)
                        {
                            Headers = { ContentType = new MediaTypeHeaderValue(contentType) },
                        },
                    }
                ),
            minimumCalls
        );
    }

    public void RegisterEndpoint(Endpoint endpoint)
    {
        _endpoints.Add(endpoint);
    }

    public void RegisterJsonEndpoint<T>(HttpMethod method, string urlPattern, T responseObject, int minimumCalls = 1)
    {
        RegisterEndpoint(
            method,
            urlPattern,
            request =>
                Task.FromResult(
                    new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(responseObject))
                        {
                            Headers =
                            {
                                ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json"),
                            },
                        },
                    }
                ),
            minimumCalls
        );
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        using var activity = ActivitySource.StartActivity("FakeHttpMessageHandler.SendAsync");
        activity?.SetTag("method", request.Method.ToString());
        activity?.SetTag("url", request.RequestUri?.ToString() ?? "null");
        if (request.Content is not null)
        {
            // Ensure content is buffered for multiple reads
            await request.Content.LoadIntoBufferAsync();
        }
        var endpoints = _endpoints.Where(e => e.Matches(request)).ToList();
        if (endpoints.Count == 0)
        {
            var exception = new HttpRequestException("No endpoints were found");
            activity
                ?.AddException(exception)
                .SetStatus(ActivityStatusCode.Error)
                .AddTag("non-matching-endpoints", _endpoints.Select(e => e.Name).ToArray());

            throw exception;
        }
        if (endpoints.Count > 1)
        {
            var exception = new HttpRequestException(
                $"Multiple endpoints were found: {string.Join(", ", endpoints.Select(e => e.Name))}"
            );
            activity
                ?.AddException(exception)
                .SetStatus(ActivityStatusCode.Error)
                .AddTag("endpoints", string.Join(", ", endpoints.Select(e => e.Name)));
            throw exception;
        }
        activity?.SetTag("endpoint", endpoints[0].Name);
        var response = await endpoints[0].Handle(request);
        activity?.SetTag("responseStatusCode", (int)response.StatusCode);
        var responsString = await response.Content.ReadAsStringAsync(cancellationToken);
        activity?.SetTag("responseContent", responsString.Substring(0, Math.Min(responsString.Length, 30)));

        RequestResponses.Add(await RequestResponse.FromHttpMessages(request, response));
        return response;
    }

    public void Verify()
    {
        foreach (var endpoint in _endpoints)
        {
            endpoint.Verify();
        }
    }
}

public class RequestResponse
{
    public static async Task<RequestResponse> FromHttpMessages(
        HttpRequestMessage request,
        HttpResponseMessage response
    ) =>
        new()
        {
            RequestUrl = request.RequestUri,
            RequestMethod = request.Method,
            RequestHeaders = request.Headers,
            RequestContentHeaders = request.Content?.Headers,
            RequestContent = request.Content == null ? null : await request.Content.ReadAsStringAsync(),
            ResponseStatusCode = response.StatusCode,
            ResponseHeaders = response.Headers,
            ResponseContentHeaders = response.Content.Headers,
            ResponseContent = await response.Content.ReadAsStringAsync(),
        };

    public required Uri? RequestUrl { get; init; }
    public required HttpMethod RequestMethod { get; init; }
    public required HttpRequestHeaders RequestHeaders { get; init; }
    public required HttpContentHeaders? RequestContentHeaders { get; init; }
    public required string? RequestContent { get; init; }

    public required HttpStatusCode ResponseStatusCode { get; init; }
    public required HttpResponseHeaders ResponseHeaders { get; init; }
    public required HttpContentHeaders ResponseContentHeaders { get; init; }
    public required string ResponseContent { get; init; }
};
