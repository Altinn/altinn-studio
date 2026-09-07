using Altinn.Studio.Gateway.Api.Clients.Designer;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Application.Pdf;

internal static class HandlePdf
{
    private const string WaitForSelector = "body[data-status='ready']";

    internal static async Task<IResult> GeneratePdf(
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<StudioEnvironments> studioEnvironments,
        PdfGenerateRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!IsAllowedRenderUrl(request.Url, studioEnvironments.CurrentValue))
        {
            return TypedResults.BadRequest("url must be an https URL on a configured Altinn Studio host.");
        }

        using var client = httpClientFactory.CreateClient("pdf3-proxy");
        var pdf3Request = new Pdf3ProxyRequest(request.Url, WaitForSelector, new Pdf3ProxyOptions("a4", true));
        using var response = await client.PostAsJsonAsync(
            "/pdf",
            pdf3Request,
            AppJsonSerializerContext.Default.Pdf3ProxyRequest,
            cancellationToken
        );
        response.EnsureSuccessStatusCode();
        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        return Results.Bytes(bytes, "application/pdf");
    }

    /// <summary>
    /// The PDF renderer navigates a headless browser to the given URL, so only pages served by a
    /// configured Altinn Studio environment over HTTPS may be rendered.
    /// </summary>
    internal static bool IsAllowedRenderUrl(string? url, StudioEnvironments studioEnvironments)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var renderUri) || renderUri.Scheme != Uri.UriSchemeHttps)
        {
            return false;
        }

        return studioEnvironments.Values.Any(environment =>
            Uri.TryCreate(environment.Url, UriKind.Absolute, out var studioUri)
            && string.Equals(studioUri.Host, renderUri.Host, StringComparison.OrdinalIgnoreCase)
        );
    }
}

internal record PdfGenerateRequest(string Url);

internal record Pdf3ProxyRequest(string Url, string WaitFor, Pdf3ProxyOptions Options);

internal record Pdf3ProxyOptions(string Format, bool PrintBackground);
