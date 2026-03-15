using System.Net;

namespace WorkflowEngine.TestKit;

/// <summary>
/// A test HTTP handler that captures outbound requests and returns configurable responses.
/// </summary>
public sealed class MockHttpHandler : HttpMessageHandler
{
    public HttpStatusCode ResponseStatusCode { get; set; } = HttpStatusCode.OK;
    public string? ResponseContent { get; set; }
    public List<CapturedRequest> Requests { get; } = [];

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var body = request.Content != null ? await request.Content.ReadAsStringAsync(cancellationToken) : null;

        var headers = new Dictionary<string, string[]>();
        foreach (var header in request.Headers)
            headers[header.Key] = header.Value.ToArray();

        var contentType = request.Content?.Headers?.ContentType?.ToString();

        Requests.Add(
            new CapturedRequest(
                request.Method,
                request.RequestUri ?? throw new InvalidOperationException("RequestUri was null"),
                headers,
                contentType,
                body
            )
        );

        return new HttpResponseMessage(ResponseStatusCode)
        {
            Content = ResponseContent != null ? new StringContent(ResponseContent) : new StringContent(""),
        };
    }

    public sealed record CapturedRequest(
        HttpMethod Method,
        Uri RequestUri,
        Dictionary<string, string[]> Headers,
        string? ContentType,
        string? Body
    );
}
