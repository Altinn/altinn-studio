using System.Text;

using Altinn.Augmenter.Agent.Pipelines;
using Altinn.Augmenter.Agent.Services;

namespace Altinn.Augmenter.Agent.Endpoints;

public static class GenerateEndpoints
{
    public static void MapGenerateEndpoints(this WebApplication app)
    {
        app.MapPost("/generate", async (
            HttpRequest request,
            IMultipartParserService parser,
            IPdfPipeline pipeline,
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

            var pdfs = await pipeline.ExecuteAsync(parsed.Files, cancellationToken);

            if (pdfs.Count == 0)
            {
                return Results.BadRequest(new { error = "No PDFs were generated." });
            }

            var response = pdfs.Select(pdf => new
            {
                name = pdf.Name,
                data = Convert.ToBase64String(pdf.Data),
            });

            return Results.Json(new { pdfs = response });
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
