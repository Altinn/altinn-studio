#nullable enable

using System.IO;
using Microsoft.Net.Http.Headers;

namespace LocalTest.Tunnel;

public sealed class AppTunnelProxy
{
    private static readonly HashSet<string> SkippedRequestHeaders =
    [
        HeaderNames.Connection,
        HeaderNames.Upgrade,
        "Proxy-Connection",
    ];

    private static readonly HashSet<string> SkippedResponseHeaders =
    [
        HeaderNames.Connection,
        HeaderNames.TransferEncoding,
    ];

    private readonly AppTunnelClient _client;

    public AppTunnelProxy(AppTunnelClient client)
    {
        _client = client;
    }

    public bool IsConnected => _client.IsConnected;

    public async Task ProxyAsync(HttpContext context, CancellationToken cancellationToken)
    {
        using var request = await CreateRequestAsync(context, cancellationToken);
        using var response = await _client.SendAsync(request, cancellationToken);

        context.Response.StatusCode = (int)response.StatusCode;
        CopyResponseHeaders(context, response);
        await response.Content.CopyToAsync(context.Response.Body, cancellationToken);
    }

    private static async Task<HttpRequestMessage> CreateRequestAsync(
        HttpContext context,
        CancellationToken cancellationToken
    )
    {
        var request = new HttpRequestMessage(
            new HttpMethod(context.Request.Method),
            context.Request.PathBase + context.Request.Path + context.Request.QueryString
        );

        if (context.Request.ContentLength is > 0)
        {
            var body = await ReadBodyAsync(context.Request, cancellationToken);
            if (body.Length > 0)
            {
                request.Content = new ByteArrayContent(body);
            }
        }

        foreach (var header in context.Request.Headers)
        {
            if (string.Equals(header.Key, HeaderNames.Host, StringComparison.OrdinalIgnoreCase))
            {
                request.Headers.Host = header.Value;
                continue;
            }

            if (SkippedRequestHeaders.Contains(header.Key))
            {
                continue;
            }

            if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
            {
                request.Content ??= new ByteArrayContent([]);
                request.Content.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
        }

        return request;
    }

    private static async Task<byte[]> ReadBodyAsync(
        HttpRequest request,
        CancellationToken cancellationToken
    )
    {
        using var buffer = new MemoryStream();
        await request.Body.CopyToAsync(buffer, cancellationToken);
        Altinn.Studio.AppTunnel.TunnelProtocol.EnsureBodyWithinLimit((int)buffer.Length);
        return buffer.ToArray();
    }

    private static void CopyResponseHeaders(HttpContext context, HttpResponseMessage response)
    {
        foreach (var header in response.Headers)
        {
            if (!SkippedResponseHeaders.Contains(header.Key))
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }
        }

        foreach (var header in response.Content.Headers)
        {
            if (!SkippedResponseHeaders.Contains(header.Key))
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }
        }

        context.Response.Headers.Remove(HeaderNames.TransferEncoding);
    }
}
