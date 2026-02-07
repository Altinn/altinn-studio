using Altinn.Augmenter.Agent.Services;

namespace Altinn.Augmenter.Agent.Endpoints;

public static class GenerateAsyncEndpoints
{
    public static void MapGenerateAsyncEndpoints(this WebApplication app)
    {
        app.MapPost("/generate-async", async (
            HttpRequest request,
            IMultipartParserService parser,
            IPdfGeneratorService pdfGenerator,
            ICallbackService callbackService,
            ILogger<Program> logger) =>
        {
            Models.ParsedFormData parsed;
            try
            {
                parsed = await parser.ParseAsync(request);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }

            if (string.IsNullOrWhiteSpace(parsed.CallbackUrl))
            {
                return Results.BadRequest(new { error = "callback-url is required." });
            }

            if (!Uri.TryCreate(parsed.CallbackUrl, UriKind.Absolute, out var uri)
                || (uri.Scheme != "http" && uri.Scheme != "https"))
            {
                return Results.BadRequest(new { error = "callback-url must be a valid HTTP(S) URL." });
            }

            _ = Task.Run(async () =>
            {
                try
                {
                    var pdfBytes = await pdfGenerator.GeneratePdfAsync(DateTime.UtcNow);
                    await callbackService.SendPdfAsync(parsed.CallbackUrl, pdfBytes);
                    logger.LogInformation("PDF sent to callback URL: {CallbackUrl}", parsed.CallbackUrl);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to generate or send PDF to {CallbackUrl}", parsed.CallbackUrl);
                }
            });

            return Results.Ok(new { status = "accepted" });
        })
        .DisableAntiforgery();
    }
}
