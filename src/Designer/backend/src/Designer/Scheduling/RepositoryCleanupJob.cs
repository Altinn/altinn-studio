using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Altinn.Studio.Designer.Telemetry;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

[DisallowConcurrentExecution]
public class RepositoryCleanupJob : IJob
{
    private readonly IRepositoryCleanupService _repositoryCleanupService;
    private readonly SchedulingSettings _schedulingSettings;

    public RepositoryCleanupJob(
        IRepositoryCleanupService repositoryCleanupService,
        SchedulingSettings schedulingSettings
    )
    {
        _repositoryCleanupService = repositoryCleanupService;
        _schedulingSettings = schedulingSettings;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(RepositoryCleanupJob)}.{nameof(Execute)}",
            ActivityKind.Internal
        );
        activity?.SetAlwaysSample();

        RepositoryCleanupSettings settings = _schedulingSettings.RepositoryCleanup;
        activity?.SetTag("retention.days", settings.RetentionDays);
        activity?.SetTag("batch.maximum", settings.MaxRepositoriesPerRun);
        activity?.SetTag("timeout.minutes", settings.JobTimeoutMinutes);

        using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            context.CancellationToken
        );
        timeoutCancellationTokenSource.CancelAfter(settings.JobTimeout);

        try
        {
            RepositoryCleanupResult result = await _repositoryCleanupService.DeleteInactiveRepositoriesAsync(
                timeoutCancellationTokenSource.Token
            );
            activity?.SetTag("repositories.candidates", result.Candidates);
            activity?.SetTag("repositories.deleted", result.Deleted);
            activity?.SetTag("repositories.failed", result.Failed);
            activity?.SetTag("repositories.skipped", result.Skipped);
        }
        catch (OperationCanceledException exception)
            when (timeoutCancellationTokenSource.IsCancellationRequested
                && !context.CancellationToken.IsCancellationRequested
            )
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Job timed out.");
            activity?.AddException(exception);
            throw new TimeoutException(
                $"{nameof(RepositoryCleanupJob)} timed out after {settings.JobTimeout}.",
                exception
            );
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(exception);
            throw;
        }
    }
}
