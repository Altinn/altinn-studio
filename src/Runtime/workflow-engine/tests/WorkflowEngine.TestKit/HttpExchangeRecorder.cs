using System.Collections.Concurrent;
using System.Text;

namespace WorkflowEngine.TestKit;

/// <summary>
/// A captured HTTP request/response pair with buffered bodies.
/// </summary>
public sealed record HttpExchange(
    HttpRequestMessage Request,
    string? RequestBody,
    HttpResponseMessage Response,
    string? ResponseBody
);

/// <summary>
/// DelegatingHandler that records all HTTP request/response exchanges passing through it.
/// Buffers request and response bodies so they remain readable after the exchange completes.
/// </summary>
public sealed class HttpExchangeRecorder : DelegatingHandler
{
    private readonly ConcurrentQueue<HttpExchange> _exchanges = [];

    /// <summary>
    /// All captured exchanges, in insertion order.
    /// </summary>
    public IReadOnlyCollection<HttpExchange> Exchanges => _exchanges;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        // Buffer the request body before it's consumed
        string? requestBody = null;
        if (request.Content is not null)
            requestBody = await request.Content.ReadAsStringAsync(cancellationToken);

        var response = await base.SendAsync(request, cancellationToken);

        // Buffer the response body (read + replace so downstream consumers can still read it)
        string? responseBody = null;
        if (response.Content is not null)
        {
            responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            // Replace content with a buffered copy so downstream consumers can still read it.
            // Use parameterless constructor to avoid StringContent's default text/plain Content-Type,
            // then copy the original content headers exactly.
            var originalHeaders = response.Content.Headers.ToList();
            var newContent = new ByteArrayContent(Encoding.UTF8.GetBytes(responseBody));
            foreach (var header in originalHeaders)
                newContent.Headers.TryAddWithoutValidation(header.Key, header.Value);

            response.Content = newContent;
        }

        _exchanges.Enqueue(new HttpExchange(request, requestBody, response, responseBody));
        return response;
    }

    /// <summary>
    /// Clears all captured exchanges.
    /// </summary>
    public void Clear() => _exchanges.Clear();
}
