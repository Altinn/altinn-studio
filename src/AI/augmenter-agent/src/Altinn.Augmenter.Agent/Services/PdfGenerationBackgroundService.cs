namespace Altinn.Augmenter.Agent.Services;

public sealed class PdfGenerationBackgroundService(
    PdfGenerationQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<PdfGenerationBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var pdfGenerator = scope.ServiceProvider.GetRequiredService<IPdfGeneratorService>();
                var callbackService = scope.ServiceProvider.GetRequiredService<ICallbackService>();

                var pdfBytes = await pdfGenerator.GeneratePdfAsync(job.Timestamp, stoppingToken);
                await callbackService.SendPdfAsync(job.CallbackUrl, pdfBytes, stoppingToken);

                logger.LogInformation("PDF sent to callback URL: {CallbackUrl}", job.CallbackUrl);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Failed to generate or send PDF to {CallbackUrl}", job.CallbackUrl);
            }
        }
    }
}
