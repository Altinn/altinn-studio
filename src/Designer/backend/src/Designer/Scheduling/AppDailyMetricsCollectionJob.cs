using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Common.Telemetry;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;
using Microsoft.Rest.TransientFaultHandling;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

/// <summary>
/// Collects the per-app instance metrics of one UTC day from Storage, for all orgs or the org in the job data,
/// in the org's production and TT02 environments, and stores them in the daily metrics table. Read-only towards
/// Storage.
/// </summary>
[DisallowConcurrentExecution]
public class AppDailyMetricsCollectionJob : IJob
{
    private readonly IOrgService _orgService;
    private readonly IEnvironmentsService _environmentsService;
    private readonly IAltinnStorageMetricsClient _storageMetricsClient;
    private readonly IAppDailyMetricsRepository _appDailyMetricsRepository;
    private readonly TimeProvider _timeProvider;

    public AppDailyMetricsCollectionJob(
        IOrgService orgService,
        IEnvironmentsService environmentsService,
        IAltinnStorageMetricsClient storageMetricsClient,
        IAppDailyMetricsRepository appDailyMetricsRepository,
        TimeProvider timeProvider
    )
    {
        _orgService = orgService;
        _environmentsService = environmentsService;
        _storageMetricsClient = storageMetricsClient;
        _appDailyMetricsRepository = appDailyMetricsRepository;
        _timeProvider = timeProvider;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var activity = RootSpan.OfJob();
        activity?.SetAlwaysSample();

        var timeout = AppDailyMetricsCollectionJobConstants.JobTimeout;
        activity?.SetTag(ServiceTelemetry.Attributes.AppDailyMetrics.TimeoutSeconds, timeout.TotalSeconds);
        using var timeoutCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(
            context.CancellationToken
        );
        timeoutCancellationTokenSource.CancelAfter(timeout);
        var cancellationToken = timeoutCancellationTokenSource.Token;

        var outcomes = new List<CollectionOutcome>();
        var failedServiceOwners = 0;
        try
        {
            var yesterday = DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime).AddDays(-1);
            var metricDate = ParseMetricDate(context.MergedJobDataMap) ?? yesterday;
            // The open counts describe the moment Storage computes them. They are a snapshot
            // of the day's end only when the day has just ended.
            var includesSnapshot = metricDate == yesterday;
            activity?.SetTag(
                ServiceTelemetry.Attributes.AppDailyMetrics.MetricDate,
                metricDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            );
            activity?.SetTag(ServiceTelemetry.Attributes.AppDailyMetrics.IncludesSnapshot, includesSnapshot);

            var org = context.MergedJobDataMap.GetOptionalString(AppDailyMetricsCollectionJobConstants.JobDataOrgKey);
            IReadOnlyList<string> orgs;
            if (org is null)
            {
                orgs = (await _orgService.GetOrgList(cancellationToken))
                    .Orgs.Keys.Order(StringComparer.Ordinal)
                    .ToList();
            }
            else
            {
                activity.SetServiceOwner(org);
                orgs = [org];
            }
            activity?.SetTag(ServiceTelemetry.Attributes.AppDailyMetrics.ServiceOwnerCount, orgs.Count);

            // The service owner varies per environment span only when the run covers several service owners.
            var setServiceOwnerPerEnvironment = org is null;
            foreach (var orgName in orgs)
            {
                IReadOnlyList<string> environments;
                try
                {
                    environments = (await _environmentsService.GetOrganizationEnvironments(orgName, cancellationToken))
                        .Select(environment => environment.Name)
                        .Where(AppDailyMetricsCollectionJobConstants.IsTargetEnvironment)
                        .Order(StringComparer.Ordinal)
                        .ToList();
                }
                catch (Exception ex) when (IsIsolatedFailure(ex, cancellationToken))
                {
                    activity?.AddException(ex);
                    failedServiceOwners++;
                    continue;
                }

                foreach (var environment in environments)
                {
                    outcomes.Add(
                        await CollectEnvironmentAsync(
                            orgName,
                            environment,
                            metricDate,
                            includesSnapshot,
                            setServiceOwnerPerEnvironment,
                            cancellationToken
                        )
                    );
                }
            }
        }
        catch (OperationCanceledException ex)
            when (timeoutCancellationTokenSource.IsCancellationRequested
                && !context.CancellationToken.IsCancellationRequested
            )
        {
            activity?.SetStatus(ActivityStatusCode.Error, "Job timed out.");
            activity?.AddException(ex);
            activity?.SetTag(ServiceTelemetry.Attributes.AppDailyMetrics.TimedOut, true);
            throw new TimeoutException($"{nameof(AppDailyMetricsCollectionJob)} timed out after {timeout}.", ex);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
        finally
        {
            SetOutcomeTags(activity, outcomes, failedServiceOwners);
        }
    }

    private async Task<CollectionOutcome> CollectEnvironmentAsync(
        string org,
        string environment,
        DateOnly metricDate,
        bool includesSnapshot,
        bool setServiceOwner,
        CancellationToken cancellationToken
    )
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(AppDailyMetricsCollectionJob)}.CollectEnvironment"
        );
        if (setServiceOwner)
        {
            activity.SetServiceOwner(org);
        }
        activity.SetTargetEnvironment(environment);

        try
        {
            StudioDailyMetrics metrics;
            try
            {
                metrics = await _storageMetricsClient.GetDailyMetrics(org, environment, metricDate, cancellationToken);
            }
            catch (HttpRequestWithStatusException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Skip(activity, "metrics_endpoint_not_found");
            }

            var observations = BuildObservations(metrics);
            await _appDailyMetricsRepository.UpsertDayAsync(
                new AppDailyMetricsBatch
                {
                    Org = org,
                    Environment = environment,
                    MetricDate = metricDate,
                    ComputedAt = metrics.ComputedAt,
                    IncludesSnapshot = includesSnapshot,
                    Observations = observations,
                },
                cancellationToken
            );
            activity?.SetTag(ServiceTelemetry.Attributes.AppDailyMetrics.AppCount, observations.Count);
            return CollectionOutcome.Collected;
        }
        catch (Exception ex) when (IsIsolatedFailure(ex, cancellationToken))
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            activity?.SetTag(ServiceTelemetry.Attributes.AppDailyMetrics.CollectionSkipReason, "collection_failed");
            return CollectionOutcome.Failed;
        }
    }

    private static DateOnly? ParseMetricDate(JobDataMap jobData)
    {
        var value = jobData.GetOptionalString(AppDailyMetricsCollectionJobConstants.JobDataDateKey);
        if (value is null)
        {
            return null;
        }

        if (
            !DateOnly.TryParseExact(
                value,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var date
            )
        )
        {
            throw new ArgumentException(
                $"Job data '{AppDailyMetricsCollectionJobConstants.JobDataDateKey}' must be a date as yyyy-MM-dd, was '{value}'."
            );
        }

        return date;
    }

    private static List<AppDailyMetricsObservation> BuildObservations(StudioDailyMetrics metrics)
    {
        return metrics
            .Apps.OrderBy(app => app.App, StringComparer.Ordinal)
            .Select(app => new AppDailyMetricsObservation
            {
                App = app.App,
                InstancesCreated = ToInt(app.InstancesCreated),
                InstancesCompleted = ToInt(app.InstancesCompleted),
                SecondsToCompleteP50 = app.SecondsToCompleteP50,
                OpenInstances = ToInt(app.OpenInstances),
                OpenOver90Days = ToInt(app.OpenOver90Days),
                OpenByTask = app.OpenByTask.ToDictionary(
                    task => task.TaskId,
                    task => ToInt(task.OpenInstances),
                    StringComparer.Ordinal
                ),
            })
            .ToList();
    }

    // Storage counts with bigint; the table stores integer, which is more than enough for one app.
    private static int ToInt(long count) => checked((int)count);

    private static CollectionOutcome Skip(Activity? activity, string reason)
    {
        activity?.SetTag(ServiceTelemetry.Attributes.AppDailyMetrics.CollectionSkipReason, reason);
        return CollectionOutcome.Skipped;
    }

    private static void SetOutcomeTags(Activity? activity, List<CollectionOutcome> outcomes, int failedServiceOwners)
    {
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppDailyMetrics.EnvironmentCollectedCount,
            outcomes.Count(o => o == CollectionOutcome.Collected)
        );
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppDailyMetrics.EnvironmentSkippedCount,
            outcomes.Count(o => o == CollectionOutcome.Skipped)
        );
        activity?.SetTag(
            ServiceTelemetry.Attributes.AppDailyMetrics.EnvironmentFailedCount,
            outcomes.Count(o => o == CollectionOutcome.Failed)
        );
        activity?.SetTag(ServiceTelemetry.Attributes.AppDailyMetrics.ServiceOwnerFailedCount, failedServiceOwners);
    }

    // Timeouts of individual Storage calls surface as cancellations; only the job's token aborts the run.
    private static bool IsIsolatedFailure(Exception ex, CancellationToken cancellationToken)
    {
        return ex is not OperationCanceledException || !cancellationToken.IsCancellationRequested;
    }

    private enum CollectionOutcome
    {
        Collected,
        Skipped,
        Failed,
    }
}
