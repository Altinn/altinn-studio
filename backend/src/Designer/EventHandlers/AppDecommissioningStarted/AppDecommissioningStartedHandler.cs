using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Quartz;

namespace Altinn.Studio.Designer.EventHandlers.AppDecommissioningStarted;

public class AppDecommissioningStartedHandler : INotificationHandler<Events.AppDecommissioningStarted>
{
    private readonly ISchedulerFactory _schedulerFactory;

    public AppDecommissioningStartedHandler(ISchedulerFactory schedulerFactory)
    {
        _schedulerFactory = schedulerFactory;
    }

    public async Task Handle(Events.AppDecommissioningStarted notification, CancellationToken cancellationToken)
    {
        var scheduler = await _schedulerFactory.GetScheduler(cancellationToken);
        var jobData = new JobDataMap
        {
            { "org", notification.EditingContext.Org },
            { "app", notification.EditingContext.Repo },
            { "buildId", notification.BuildId.ToString() }
        };

        var job = JobBuilder.Create<Scheduling.DecommissionPipelineJob>()
            .WithIdentity($"{nameof(Scheduling.DecommissionPipelineJob)}-{notification.EditingContext.Org}-{notification.EditingContext.Repo}-{notification}{notification.BuildId}", "DecommissionPipelineGroup")
            .UsingJobData(jobData)
            .Build();

        var trigger = TriggerBuilder.Create()
            .WithIdentity($"{nameof(Scheduling.DecommissionPipelineJob)}-{notification.EditingContext.Org}-{notification.EditingContext.Repo}-{notification.BuildId}", "DecommissionPipelineGroup")
            .StartNow()
            .WithSimpleSchedule(x => x
                .WithIntervalInSeconds(10)
                .RepeatForever())
            .Build();

        await scheduler.ScheduleJob(job, trigger, cancellationToken);
    }
}
