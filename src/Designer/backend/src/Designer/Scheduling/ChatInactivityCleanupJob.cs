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
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(ChatInactivityCleanupJob)}.{nameof(Execute)}",
            ActivityKind.Internal
        );
        activity?.SetAlwaysSample();
        activity?.SetTag("retention.days", _schedulingSettings.ChatInactivityCleanup.RetentionDays);

        try
        {
            int deletedCount = await _chatService.DeleteInactiveThreadsAsync(context.CancellationToken);
            activity?.SetTag("threads.deleted", deletedCount);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
    }
}
