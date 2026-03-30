#nullable enable

using Altinn.Studio.AppTunnel;
using Microsoft.Net.Http.Headers;

namespace LocalTest.Tunnel;

public sealed class AppTunnelProxy
{
    private readonly AppTunnelClient _client;

    public AppTunnelProxy(AppTunnelClient client)
    {
        _client = client;
    }

    public bool IsConnected => _client.IsConnected;

    public async Task ProxyAsync(
        HttpContext context,
        string? appId,
        CancellationToken cancellationToken
    )
    {
        using var request = await CreateRequestAsync(context, cancellationToken);
        await _client.Proxy(request, appId, context, cancellationToken);
    }

    private static async Task<HttpRequestMessage> CreateRequestAsync(
        HttpContext context,
        CancellationToken cancellationToken
    )
    {
        if (RequestRequiresUpgrade(context.Request))
            throw new InvalidOperationException("upgrade requests are not supported by the app tunnel");

        var request = new HttpRequestMessage(
            new HttpMethod(context.Request.Method),
            context.Request.PathBase + context.Request.Path + context.Request.QueryString
        );

        if (RequestMayHaveBody(context.Request))
            request.Content = new StreamContent(context.Request.Body);

        foreach (var header in context.Request.Headers)
        {
            if (string.Equals(header.Key, HeaderNames.Host, StringComparison.OrdinalIgnoreCase))
            {
                request.Headers.Host = header.Value;
                continue;
            }

            if (TunnelHttpHeaders.ShouldSkipRequestHeader(header.Key))
                continue;

            if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
            {
                request.Content ??= new ByteArrayContent([]);
                request.Content.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
            }
        }
        if (
            request.Content is not null
            && request.Headers.TransferEncodingChunked == true
            && request.Content.Headers.ContentLength is not null
        )
        {
            request.Content.Headers.ContentLength = null;
        }

        return request;
    }

    private static bool RequestMayHaveBody(HttpRequest request) =>
        request.ContentLength is > 0 || request.Headers.ContainsKey(HeaderNames.TransferEncoding);

    private static bool RequestRequiresUpgrade(HttpRequest request) =>
        request.Headers.ContainsKey(HeaderNames.Upgrade)
        || request.Headers.TryGetValue(HeaderNames.Connection, out var connection)
            && connection.Any(value => value?.Contains("upgrade", StringComparison.OrdinalIgnoreCase) == true);
}
