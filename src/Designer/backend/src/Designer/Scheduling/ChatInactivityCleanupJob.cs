using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

[DisallowConcurrentExecution]
public class ChatInactivityCleanupJob : IJob
{
    private readonly IChatService _chatService;
    private readonly SchedulingSettings _schedulingSettings;

    public ChatInactivityCleanupJob(IChatService chatService, SchedulingSettings schedulingSettings)
    {
        _chatService = chatService;
        _schedulingSettings = schedulingSettings;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var activity = RootSpan.OfJob();
        activity?.SetAlwaysSample();
        activity?.SetTag(
            ServiceTelemetry.Attributes.ChatCleanup.RetentionDays,
            _schedulingSettings.ChatInactivityCleanup.RetentionDays
        );

        try
        {
            int deletedCount = await _chatService.DeleteInactiveThreadsAsync(context.CancellationToken);
            activity?.SetTag(ServiceTelemetry.Attributes.ChatCleanup.ThreadsDeleted, deletedCount);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
    }
}
