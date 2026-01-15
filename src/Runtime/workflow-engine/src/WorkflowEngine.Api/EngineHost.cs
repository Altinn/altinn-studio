using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Api;

internal sealed class EngineHost(IServiceProvider serviceProvider) : BackgroundService
{
    private readonly IEngine _engine = serviceProvider.GetRequiredService<IEngine>();
    private readonly ILogger<EngineHost> _logger = serviceProvider.GetRequiredService<ILogger<EngineHost>>();

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.Startup();
        _logger.DegreeOfParallelism(Environment.ProcessorCount);
        await _engine.Start(stoppingToken);
        _logger.Initialized();

        int failCount = 0;
        int maxFailsAllowed = 100;
        var healthCheckInterval = TimeSpan.FromSeconds(10);

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(healthCheckInterval, stoppingToken);
            var status = _engine.Status;

            if (status.IsDisabled())
                continue;

            if (status.HasFullQueue())
                _logger.EngineHasBackpressure(_engine.InboxCount, status);

            if (status.IsHealthy())
            {
                if (failCount > 0)
                    _logger.EngineHasRecovered(status);

                failCount = 0;
                _logger.EngineIsHealthy(_engine.InboxCount);
                continue;
            }

            failCount++;
            _logger.EngineIsUnhealthy(status);

            if (failCount >= maxFailsAllowed)
            {
                _logger.PermanentFailure(failCount);
                throw new EngineCriticalException("Critical failure in EngineHost. Forcing application shutdown.");
            }

            _logger.EngineRestart();
            await _engine.Stop();
            await _engine.Start(stoppingToken);
        }

        _logger.Shutdown();
    }
}

internal static partial class EngineHostLogs
{
    [LoggerMessage(LogLevel.Information, "Starting process engine.")]
    public static partial void Startup(this ILogger<EngineHost> logger);

    [LoggerMessage(LogLevel.Information, "Degree of parallelism: {MaxParallelJobs}")]
    public static partial void DegreeOfParallelism(this ILogger<EngineHost> logger, int maxParallelJobs);

    [LoggerMessage(LogLevel.Information, "Process engine initialized.")]
    public static partial void Initialized(this ILogger<EngineHost> logger);

    [LoggerMessage(
        LogLevel.Warning,
        "Process engine has backpressure, processing queue is full ({InboxCount}). Current status: {HealthStatus}"
    )]
    public static partial void EngineHasBackpressure(
        this ILogger<EngineHost> logger,
        int inboxCount,
        EngineHealthStatus healthStatus
    );

    [LoggerMessage(LogLevel.Information, "Process engine has recovered and is healthy. Current status: {HealthStatus}")]
    public static partial void EngineHasRecovered(this ILogger<EngineHost> logger, EngineHealthStatus healthStatus);

    [LoggerMessage(LogLevel.Debug, "Process engine is healthy and has inbox count: {InboxCount}")]
    public static partial void EngineIsHealthy(this ILogger<EngineHost> logger, int inboxCount);

    [LoggerMessage(LogLevel.Warning, "Process engine is unhealthy. Current status: {HealthStatus}")]
    public static partial void EngineIsUnhealthy(this ILogger<EngineHost> logger, EngineHealthStatus healthStatus);

    [LoggerMessage(LogLevel.Critical, "The process engine has failed {FailCount} times. Shutting down host.")]
    public static partial void PermanentFailure(this ILogger<EngineHost> logger, int failCount);

    [LoggerMessage(LogLevel.Warning, "Forcing process engine restart")]
    public static partial void EngineRestart(this ILogger<EngineHost> logger);

    [LoggerMessage(LogLevel.Information, "Process engine host shutting down.")]
    public static partial void Shutdown(this ILogger<EngineHost> logger);
}
