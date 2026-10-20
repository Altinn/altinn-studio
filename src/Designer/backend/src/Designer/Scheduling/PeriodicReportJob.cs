using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.Extensions.Logging;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

/// <summary>
/// Sends the periodic report for every org and environment with contact points subscribed to the frequency
/// of the trigger that fired. Reports are sent one at a time, and a failing report does not stop the others.
/// </summary>
[DisallowConcurrentExecution]
public class PeriodicReportJob(
    IContactPointsRepository contactPointsRepository,
    IReportService reportService,
    ILogger<PeriodicReportJob> logger
) : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        var frequency = Enum.Parse<ReportFrequency>(
            context.MergedJobDataMap.GetRequiredString(PeriodicReportJobConstants.FrequencyKey)
        );
        var cancellationToken = context.CancellationToken;

        var activity = RootSpan.OfJob();
        activity?.SetAlwaysSample();
        activity?.SetTag(ServiceTelemetry.Attributes.PeriodicReport.Frequency, frequency.ToString());

        var targets = await contactPointsRepository.GetReportTargetsAsync(frequency, cancellationToken);
        activity?.SetTag(ServiceTelemetry.Attributes.PeriodicReport.TargetCount, targets.Count);

        int failedCount = 0;
        foreach (var target in targets)
        {
            cancellationToken.ThrowIfCancellationRequested();
            using var reportActivity = ServiceTelemetry.Source.StartActivity(
                $"{nameof(PeriodicReportJob)}.SendReport",
                ActivityKind.Internal
            );
            reportActivity.SetServiceOwner(target.Org);
            reportActivity.SetTargetEnvironment(target.Environment);

            try
            {
                await reportService.SendReportAsync(target.Org, target.Environment, frequency, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                failedCount++;
                reportActivity?.SetStatus(ActivityStatusCode.Error);
                reportActivity?.AddException(ex);
                logger.LogError(
                    ex,
                    "Failed to send the {Frequency} report for {Org} in {Environment}",
                    frequency,
                    target.Org,
                    target.Environment
                );
            }
        }

        activity?.SetTag(ServiceTelemetry.Attributes.PeriodicReport.FailedCount, failedCount);
        if (failedCount > 0)
        {
            activity?.SetStatus(ActivityStatusCode.Error, $"{failedCount} of {targets.Count} reports failed.");
        }
        logger.LogInformation(
            "Sent {SentCount} of {ReportCount} {Frequency} reports",
            targets.Count - failedCount,
            targets.Count,
            frequency
        );
    }
}
