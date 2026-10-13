using System.Net.Mime;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.Assistant.Runner;

internal static class RunnerApi
{
    /// <summary>Kestrel's own default is 30 MB.</summary>
    public const long MaxArchiveBytes = 50 * 1024 * 1024;

    public static WebApplicationBuilder AddRunnerApi(this WebApplicationBuilder builder)
    {
        builder.WebHost.ConfigureKestrel(kestrel => kestrel.Limits.MaxRequestBodySize = MaxArchiveBytes);
        return builder;
    }

    /// <summary>
    /// A job stops every process of the job user when it ends, so a pod runs one job at a time.
    /// A busy pod answers 503 at once, and the client tries again. With more pods, the Service
    /// sends the new connection to a random pod.
    /// </summary>
    public static WebApplication MapRunnerApi(this WebApplication app)
    {
        var jobSlot = new JobSlot();

        app.MapGet("/health", () => Results.Ok());
        app.MapPost(
            "/api/v1/upgrades/v9",
            (HttpContext context, IJobRunner runner) => RunJobAsync(context, runner, jobSlot, JobCommand.UpgradeToV9)
        );
        app.MapPost(
            "/api/v1/builds",
            (HttpContext context, IJobRunner runner) => RunJobAsync(context, runner, jobSlot, JobCommand.Build)
        );
        return app;
    }

    private static async Task<IResult> RunJobAsync(
        HttpContext context,
        IJobRunner runner,
        JobSlot jobSlot,
        JobCommand command
    )
    {
        if (
            !MediaTypeHeaderValue.TryParse(context.Request.ContentType, out var contentType)
            || !string.Equals(
                contentType.MediaType.Value,
                MediaTypeNames.Application.GZip,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return Results.StatusCode(StatusCodes.Status415UnsupportedMediaType);
        }

        if (!jobSlot.TryTake())
        {
            return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        try
        {
            using var archive = new MemoryStream();
            try
            {
                await context.Request.Body.CopyToAsync(archive, context.RequestAborted);
            }
            catch (BadHttpRequestException error)
            {
                return Results.StatusCode(error.StatusCode);
            }

            archive.Position = 0;
            return await runner.RunAsync(command, archive, context.RequestAborted) switch
            {
                JobResult result => Results.Ok(result),
                InvalidArchive invalid => Results.Problem(invalid.Detail, statusCode: StatusCodes.Status400BadRequest),
                var outcome => throw new InvalidOperationException($"Unknown job outcome {outcome}."),
            };
        }
        finally
        {
            jobSlot.Release();
        }
    }

    private sealed class JobSlot
    {
        private int _isTaken;

        public bool TryTake() => Interlocked.Exchange(ref _isTaken, 1) == 0;

        public void Release() => Volatile.Write(ref _isTaken, 0);
    }
}
