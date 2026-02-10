using System.Diagnostics.Metrics;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services;

public sealed class PdfGenerationBackgroundService(
    PdfGenerationQueue queue,
    IServiceScopeFactory scopeFactory,
    IOptions<CallbackOptions> callbackOptions,
    ILogger<PdfGenerationBackgroundService> logger,
    IMeterFactory meterFactory) : BackgroundService
{
    private readonly CallbackOptions _callbackOptions = callbackOptions.Value;

    private readonly Counter<long> _jobsProcessed = meterFactory
        .Create("Altinn.Augmenter.Agent")
        .CreateCounter<long>("jobs.processed", description: "Total jobs successfully processed");

    private readonly Counter<long> _jobsFailed = meterFactory
        .Create("Altinn.Augmenter.Agent")
        .CreateCounter<long>("jobs.failed", description: "Total jobs that failed after all retries");

    private readonly Counter<long> _jobsRetried = meterFactory
        .Create("Altinn.Augmenter.Agent")
        .CreateCounter<long>("jobs.retried", description: "Total retry attempts");

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in queue.Reader.ReadAllAsync(stoppingToken))
        {
            var maxRetries = _callbackOptions.MaxRetries;
            var baseDelay = TimeSpan.FromSeconds(_callbackOptions.RetryBaseDelaySeconds);

            for (var attempt = 0; attempt <= maxRetries; attempt++)
            {
                try
                {
                    if (attempt > 0)
                    {
                        _jobsRetried.Add(1);
                        var delay = baseDelay * (1 << (attempt - 1)); // exponential backoff
                        logger.LogWarning(
                            "Retrying job for {CallbackUrl} (attempt {Attempt}/{MaxRetries}) after {Delay}s",
                            job.CallbackUrl, attempt, maxRetries, delay.TotalSeconds);
                        await Task.Delay(delay, stoppingToken);
                    }

                    using var scope = scopeFactory.CreateScope();
                    var pdfGenerator = scope.ServiceProvider.GetRequiredService<IPdfGeneratorService>();
                    var callbackService = scope.ServiceProvider.GetRequiredService<ICallbackService>();

                    var pdfBytes = await pdfGenerator.GeneratePdfAsync(job.Timestamp, stoppingToken);
                    await callbackService.SendPdfAsync(job.CallbackUrl, pdfBytes, stoppingToken);

                    _jobsProcessed.Add(1);
                    logger.LogInformation("PDF sent to callback URL: {CallbackUrl}", job.CallbackUrl);
                    break;
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    if (attempt == maxRetries)
                    {
                        _jobsFailed.Add(1);
                        logger.LogError(ex,
                            "Failed to generate or send PDF to {CallbackUrl} after {Attempts} attempts. Job dropped.",
                            job.CallbackUrl, attempt + 1);
                    }
                    else
                    {
                        logger.LogWarning(ex,
                            "Attempt {Attempt} failed for {CallbackUrl}",
                            attempt + 1, job.CallbackUrl);
                    }
                }
            }
        }
    }
}
