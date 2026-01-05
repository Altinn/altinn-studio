using Altinn.App.ProcessEngine.Exceptions;
using Altinn.App.ProcessEngine.Extensions;

namespace Altinn.App.ProcessEngine;

internal sealed class ProcessEngineHost(IServiceProvider serviceProvider) : BackgroundService
{
    private readonly IProcessEngine _processEngine = serviceProvider.GetRequiredService<IProcessEngine>();
    private readonly ILogger<ProcessEngineHost> _logger = serviceProvider.GetRequiredService<
        ILogger<ProcessEngineHost>
    >();

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Starting process engine.");
        _logger.LogInformation("API key is {ApiKey}", _processEngine.Settings.ApiKey);
        _logger.LogInformation("Degree of parallelism: {MaxParallelJobs}", Environment.ProcessorCount);
        await _processEngine.Start(stoppingToken);
        _logger.LogInformation("Process engine initialized.");

        int failCount = 0;
        int maxFailsAllowed = 100;
        var healthCheckInterval = TimeSpan.FromSeconds(10);

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(healthCheckInterval, stoppingToken);
            var status = _processEngine.Status;

            if (status.IsDisabled())
                continue;

            if (status.HasFullQueue())
                _logger.LogWarning(
                    "Process engine has backpressure, processing queue is full ({InboxCount}). Current status: {HealthStatus}",
                    _processEngine.InboxCount,
                    status
                );

            if (status.IsHealthy())
            {
                if (failCount > 0)
                    _logger.LogInformation(
                        "Process engine has recovered and is healthy. Current status: {HealthStatus}",
                        status
                    );

                failCount = 0;
                _logger.LogDebug(
                    "Process engine is healthy and has inbox count: {InboxCount}",
                    _processEngine.InboxCount
                );
                continue;
            }

            failCount++;
            _logger.LogWarning("Process engine is unhealthy. Current status: {HealthStatus}", status);

            if (failCount >= maxFailsAllowed)
            {
                _logger.LogCritical("The process engine has failed {FailCount} times. Shutting down host.", failCount);
                throw new ProcessEngineCriticalException(
                    "Critical failure in ProcessEngineHost. Forcing application shutdown."
                );
            }

            _logger.LogWarning("Forcing process engine restart");
            await _processEngine.Stop();
            await _processEngine.Start(stoppingToken);
        }

        _logger.LogInformation("Process engine host shutting down.");
    }
}
