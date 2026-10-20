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
        var activity = RootSpan.OfJob();
        activity?.SetAlwaysSample();

        RepositoryCleanupSettings settings = _schedulingSettings.RepositoryCleanup;
        activity?.SetTag(ServiceTelemetry.Attributes.RepositoryCleanup.RetentionDays, settings.RetentionDays);
        activity?.SetTag(ServiceTelemetry.Attributes.RepositoryCleanup.BatchMaximum, settings.MaxRepositoriesPerRun);
        activity?.SetTag(ServiceTelemetry.Attributes.RepositoryCleanup.TimeoutMinutes, settings.JobTimeoutMinutes);

        using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            context.CancellationToken
        );
        timeoutCancellationTokenSource.CancelAfter(settings.JobTimeout);

        try
        {
            RepositoryCleanupResult result = await _repositoryCleanupService.DeleteInactiveRepositoriesAsync(
                timeoutCancellationTokenSource.Token
            );
            activity?.SetTag(ServiceTelemetry.Attributes.RepositoryCleanup.Candidates, result.Candidates);
            activity?.SetTag(ServiceTelemetry.Attributes.RepositoryCleanup.Deleted, result.Deleted);
            activity?.SetTag(ServiceTelemetry.Attributes.RepositoryCleanup.Failed, result.Failed);
            activity?.SetTag(ServiceTelemetry.Attributes.RepositoryCleanup.Skipped, result.Skipped);
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
