using System.Text;
using System.Text.Json;

using Altinn.Augmenter.Agent.Services;

namespace Altinn.Augmenter.Agent.Endpoints;

public static class GenerateEndpoints
{
    public static void MapGenerateEndpoints(this WebApplication app)
    {
        app.MapPost("/generate", async (
            HttpRequest request,
            IMultipartParserService parser,
            IRequestInfoDataMapper dataMapper,
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

            var mappedData = MapApplicationData(parsed.Files, dataMapper, logger);
            if (mappedData == null)
            {
                return Results.BadRequest(new { error = "No valid JSON application data found in uploaded files." });
            }

            using (mappedData)
            {
                var pdfBytes = await pdfGenerator.GeneratePdfAsync(mappedData, cancellationToken);
                return Results.File(pdfBytes, "application/pdf", "generated.pdf");
            }
        })
        .DisableAntiforgery();
    }

    internal static JsonDocument? MapApplicationData(
        IReadOnlyList<Models.UploadedFile> files,
        IRequestInfoDataMapper dataMapper,
        ILogger logger)
    {
        var jsonFile = files.FirstOrDefault(f => f.ContentType == "application/json");
        if (jsonFile == null)
        {
            logger.LogWarning("No JSON file found in uploaded files");
            return null;
        }

        var jsonString = Encoding.UTF8.GetString(jsonFile.Data);
        using var doc = JsonDocument.Parse(jsonString);

        // Support both { "FlatData": { ... } } and direct flat data
        var flatData = doc.RootElement.TryGetProperty("FlatData", out var fd)
            ? fd
            : doc.RootElement;

        return dataMapper.MapToRequestInfo(flatData);
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
