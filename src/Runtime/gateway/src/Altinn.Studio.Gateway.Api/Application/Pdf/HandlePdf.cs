namespace Altinn.Studio.Gateway.Api.Application.Pdf;

internal static class HandlePdf
{
    private const string WaitForSelector = "body[data-status='ready']";

    internal static async Task<IResult> GeneratePdf(
        IHttpClientFactory httpClientFactory,
        PdfGenerateRequest request,
        CancellationToken cancellationToken
    )
    {
        using var client = httpClientFactory.CreateClient("pdf3-proxy");
        var pdf3Request = new Pdf3ProxyRequest(request.Url, WaitForSelector);
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
}

internal record PdfGenerateRequest(string Url);

internal record Pdf3ProxyRequest(string Url, string WaitFor);
