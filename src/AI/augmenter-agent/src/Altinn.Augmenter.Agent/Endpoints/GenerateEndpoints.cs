using System.Text;

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
            ILogger<Program> logger,
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

            LogParsedInput(logger, "/generate", parsed);

            // TODO: Pass parsed.Files to GeneratePdfAsync once file content is supported in templates.
            var pdfBytes = await pdfGenerator.GeneratePdfAsync(DateTime.UtcNow, cancellationToken);
            return Results.File(pdfBytes, "application/pdf", "generated.pdf");
        })
        .DisableAntiforgery();
    }

    internal static void LogParsedInput(ILogger logger, string endpoint, Models.ParsedFormData parsed)
    {
        logger.LogInformation(
            "[INPUT-CAPTURE] Endpoint={Endpoint} FileCount={FileCount} CallbackUrl={CallbackUrl}",
            endpoint,
            parsed.Files.Count,
            parsed.CallbackUrl ?? "(none)");

        foreach (var file in parsed.Files)
        {
            logger.LogInformation(
                "[INPUT-CAPTURE] File: Name={FileName} ContentType={ContentType} Size={Size} bytes",
                file.Name,
                file.ContentType,
                file.Data.Length);

            // Log full content for text-based files (XML/JSON) to enable test/mock creation
            if (file.ContentType is "application/xml" or "text/xml" or "application/json")
            {
                var content = Encoding.UTF8.GetString(file.Data);
                logger.LogInformation(
                    "[INPUT-CAPTURE] File content for {FileName}:\n{Content}",
                    file.Name,
                    content);
            }
            else
            {
                logger.LogInformation(
                    "[INPUT-CAPTURE] File {FileName} is binary ({ContentType}), content not logged",
                    file.Name,
                    file.ContentType);
            }
        }
    }
}
