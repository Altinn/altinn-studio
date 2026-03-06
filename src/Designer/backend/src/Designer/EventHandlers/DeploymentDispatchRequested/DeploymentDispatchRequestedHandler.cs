using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Scheduling;
using MediatR;
using Quartz;

namespace Altinn.Studio.Designer.EventHandlers.DeploymentDispatchRequested;

public class DeploymentDispatchRequestedHandler : INotificationHandler<Events.DeploymentDispatchRequested>
{
    private readonly ISchedulerFactory _schedulerFactory;

    public DeploymentDispatchRequestedHandler(ISchedulerFactory schedulerFactory)
    {
        _schedulerFactory = schedulerFactory;
    }

    public async Task Handle(Events.DeploymentDispatchRequested notification, CancellationToken cancellationToken)
    {
        var scheduler = await _schedulerFactory.GetScheduler(cancellationToken);
        var jobData = new JobDataMap
        {
            { DeploymentDispatchJobConstants.Arguments.Org, notification.EditingContext.Org },
            { DeploymentDispatchJobConstants.Arguments.WorkflowId, notification.WorkflowId },
        };

        if (!string.IsNullOrWhiteSpace(notification.TraceParent))
        {
            jobData[DeploymentDispatchJobConstants.Arguments.TraceParent] = notification.TraceParent;
        }

        if (!string.IsNullOrWhiteSpace(notification.TraceState))
        {
            jobData[DeploymentDispatchJobConstants.Arguments.TraceState] = notification.TraceState;
        }

        var job = JobBuilder
            .Create<DeploymentDispatchJob>()
            .WithIdentity(
                DeploymentDispatchJobConstants.JobIdentity(notification.EditingContext, notification.WorkflowId),
                DeploymentDispatchJobConstants.DeploymentDispatchGroup
            )
            .UsingJobData(jobData)
            .Build();

        var trigger = TriggerBuilder
            .Create()
            .WithIdentity(
                DeploymentDispatchJobConstants.TriggerIdentity(notification.EditingContext, notification.WorkflowId),
                DeploymentDispatchJobConstants.DeploymentDispatchGroup
            )
            .StartNow()
            .Build();

        if (
            await scheduler.CheckExists(job.Key, cancellationToken)
            || await scheduler.CheckExists(trigger.Key, cancellationToken)
        )
        {
            return;
        }

        await scheduler.ScheduleJob(job, trigger, cancellationToken);
    }
}
