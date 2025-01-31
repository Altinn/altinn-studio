using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Quartz;

namespace Altinn.Studio.Designer.EventHandlers.DeploymentPipelineQueued;

public class DeploymentPipelineQueuedHandler : INotificationHandler<Events.DeploymentPipelineQueued>
{
    private readonly ISchedulerFactory _schedulerFactory;
    private const string DeploymentPipelineGroup = nameof(DeploymentPipelineGroup);
    private const int PollingIntervalInSeconds = 10;

    public DeploymentPipelineQueuedHandler(ISchedulerFactory schedulerFactory)
    {
        _schedulerFactory = schedulerFactory;
    }

    public async Task Handle(Events.DeploymentPipelineQueued notification, CancellationToken cancellationToken)
    {
        var scheduler = await _schedulerFactory.GetScheduler(cancellationToken);
        var jobData = new JobDataMap
        {
            { "org", notification.EditingContext.Org },
            { "app", notification.EditingContext.Repo },
            { "developer", notification.EditingContext.Developer },
            { "buildId", notification.BuildId.ToString() }
        };

        var job = JobBuilder.Create<Scheduling.DeploymentPipelinePollingJob>()
            .WithIdentity($"{nameof(Scheduling.DeploymentPipelinePollingJob)}-{notification.EditingContext.Org}-{notification.EditingContext.Repo}-{notification.BuildId}", DeploymentPipelineGroup)
            .UsingJobData(jobData)
            .Build();

        var trigger = TriggerBuilder.Create()
            .WithIdentity($"{nameof(Scheduling.DeploymentPipelinePollingJob)}-{notification.EditingContext.Org}-{notification.EditingContext.Repo}-{notification.BuildId}", DeploymentPipelineGroup)
            .StartNow()
            .WithSimpleSchedule(x => x
                .WithIntervalInSeconds(PollingIntervalInSeconds)
                .RepeatForever())
            .Build();

        await scheduler.ScheduleJob(job, trigger, cancellationToken);
    }
}
