using Altinn.Augmenter.Agent.Services;

namespace Altinn.Augmenter.Agent.Endpoints;

public static class GenerateEndpoints
{
    public static void MapGenerateEndpoints(this WebApplication app)
    {
        app.MapPost("/generate", async (
            HttpRequest request,
            IMultipartParserService parser,
            IPdfGeneratorService pdfGenerator,
            CancellationToken cancellationToken) =>
        {
            Models.ParsedFormData parsed;
            try
            {
                parsed = await parser.ParseAsync(request, cancellationToken);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (IOException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
            catch (OperationCanceledException)
            {
                return Results.StatusCode(499);
            }

            if (parsed.Files.Count == 0)
            {
                return Results.BadRequest(new { error = "At least one file is required." });
            }

            var pdfBytes = await pdfGenerator.GeneratePdfAsync(DateTime.UtcNow, cancellationToken);
            return Results.File(pdfBytes, "application/pdf", "generated.pdf");
        })
        .DisableAntiforgery();
    }
}
