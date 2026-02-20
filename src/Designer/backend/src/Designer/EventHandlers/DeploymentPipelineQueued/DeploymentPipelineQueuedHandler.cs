#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Scheduling;
using MediatR;
using Quartz;

namespace Altinn.Studio.Designer.EventHandlers.DeploymentPipelineQueued;

public class DeploymentPipelineQueuedHandler : INotificationHandler<Events.DeploymentPipelineQueued>
{
    private readonly ISchedulerFactory _schedulerFactory;

    public DeploymentPipelineQueuedHandler(ISchedulerFactory schedulerFactory)
    {
        _schedulerFactory = schedulerFactory;
    }

    public async Task Handle(Events.DeploymentPipelineQueued notification, CancellationToken cancellationToken)
    {
        var scheduler = await _schedulerFactory.GetScheduler(cancellationToken);
        var jobData = new JobDataMap
        {
            { DeploymentPipelinePollingJobConstants.Arguments.Org, notification.EditingContext.Org },
            { DeploymentPipelinePollingJobConstants.Arguments.App, notification.EditingContext.Repo },
            { DeploymentPipelinePollingJobConstants.Arguments.Developer, notification.EditingContext.Developer },
            { DeploymentPipelinePollingJobConstants.Arguments.BuildId, notification.BuildId.ToString() },
            { DeploymentPipelinePollingJobConstants.Arguments.PipelineType, notification.PipelineType.ToString() },
            { DeploymentPipelinePollingJobConstants.Arguments.Environment, notification.Environment }
        };

        if (!string.IsNullOrWhiteSpace(notification.TraceParent))
        {
            jobData[DeploymentPipelinePollingJobConstants.Arguments.TraceParent] = notification.TraceParent;
        }

        if (!string.IsNullOrWhiteSpace(notification.TraceState))
        {
            jobData[DeploymentPipelinePollingJobConstants.Arguments.TraceState] = notification.TraceState;
        }

        var job = JobBuilder.Create<Scheduling.DeploymentPipelinePollingJob>()
            .WithIdentity(DeploymentPipelinePollingJobConstants.JobIdentity(notification.EditingContext, notification.BuildId), DeploymentPipelinePollingJobConstants.DeploymentPipelineGroup)
            .UsingJobData(jobData)
            .Build();

        var trigger = TriggerBuilder.Create()
            .WithIdentity(DeploymentPipelinePollingJobConstants.TriggerIdentity(notification.EditingContext, notification.BuildId), DeploymentPipelinePollingJobConstants.DeploymentPipelineGroup)
            .StartNow()
            .WithSimpleSchedule(x => x
                .WithIntervalInSeconds(DeploymentPipelinePollingJobConstants.PollingIntervalInSeconds)
                .RepeatForever())
            .Build();

        await scheduler.ScheduleJob(job, trigger, cancellationToken);
    }
}
