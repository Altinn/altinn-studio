using System.Net;
using System.Text;

namespace Altinn.Studio.Gateway.Api.Tests;

internal sealed record CapturedEngineRequest(HttpMethod Method, Uri Uri);

/// <summary>
/// Stand-in for the upstream workflow engine: captures every request the gateway sends and
/// answers with a configurable response (or throws a configurable exception).
/// </summary>
internal sealed class FakeWorkflowEngineHandler : HttpMessageHandler
{
    private readonly List<CapturedEngineRequest> _requests = [];

    public IReadOnlyList<CapturedEngineRequest> Requests
    {
        get
        {
            lock (_requests)
            {
                return [.. _requests];
            }
        }
    }

    public Func<HttpRequestMessage, HttpResponseMessage> ResponseFactory { get; set; } = _ => JsonResponse("{}");

    public Exception? ExceptionToThrow { get; set; }

    public void Reset()
    {
        lock (_requests)
        {
            _requests.Clear();
        }

        ResponseFactory = _ => JsonResponse("{}");
        ExceptionToThrow = null;
    }

    public static HttpResponseMessage JsonResponse(
        string json,
        HttpStatusCode statusCode = HttpStatusCode.OK,
        string contentType = "application/json"
    )
    {
        var response = new HttpResponseMessage(statusCode);
        response.Content = new StringContent(json, Encoding.UTF8, contentType);
        return response;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var requestUri =
            request.RequestUri ?? throw new InvalidOperationException("Engine request has no request URI.");
        lock (_requests)
        {
            _requests.Add(new CapturedEngineRequest(request.Method, requestUri));
        }

        if (ExceptionToThrow is not null)
            throw ExceptionToThrow;

        return Task.FromResult(ResponseFactory(request));
    }
}
