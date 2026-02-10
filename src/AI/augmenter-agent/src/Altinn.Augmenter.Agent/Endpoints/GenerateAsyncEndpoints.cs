using Altinn.Augmenter.Agent.Models;
using Altinn.Augmenter.Agent.Services;

namespace Altinn.Augmenter.Agent.Endpoints;

public static class GenerateAsyncEndpoints
{
    public static void MapGenerateAsyncEndpoints(this WebApplication app)
    {
        app.MapPost("/generate-async", async (
            HttpRequest request,
            IMultipartParserService parser,
            IPdfGenerationQueue queue,
            ICallbackUrlValidator validator,
            CancellationToken cancellationToken) =>
        {
            ParsedFormData parsed;
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

            if (string.IsNullOrWhiteSpace(parsed.CallbackUrl))
            {
                return Results.BadRequest(new { error = "callback-url is required." });
            }

            var validationError = validator.Validate(parsed.CallbackUrl);
            if (validationError != null)
            {
                return Results.BadRequest(new { error = validationError });
            }

            var job = new PdfGenerationJob(parsed.CallbackUrl, DateTime.UtcNow, parsed.Files);
            if (!queue.TryEnqueue(job))
            {
                return Results.StatusCode(503);
            }

            return Results.Ok(new { status = "accepted" });
        })
        .DisableAntiforgery();
    }
}
