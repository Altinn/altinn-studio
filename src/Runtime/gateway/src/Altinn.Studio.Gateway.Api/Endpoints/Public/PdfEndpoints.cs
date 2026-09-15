using Altinn.Studio.Gateway.Api.Application.Pdf;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

internal static class PdfEndpoints
{
    public static RouteGroupBuilder MapPdfEndpoints(this RouteGroupBuilder publicApiV1)
    {
        publicApiV1
            .MapPost("/pdf", HandlePdf.GeneratePdf)
            .RequireAuthorization("MaskinportenScope")
            .WithTags("Pdf")
            .WithName("GeneratePdf")
            .WithSummary("Generate PDF.")
            .WithDescription("Proxies PDF generation requests to the internal pdf3 service.");

        return publicApiV1;
    }
}
