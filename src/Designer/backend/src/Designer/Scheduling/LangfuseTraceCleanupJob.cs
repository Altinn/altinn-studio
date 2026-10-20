using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces.Assistant;
using Altinn.Studio.Designer.Telemetry;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

[DisallowConcurrentExecution]
public class LangfuseTraceCleanupJob : IJob
{
    private readonly IAssistantServiceClient _assistantClient;

    public LangfuseTraceCleanupJob(IAssistantServiceClient assistantAgentClient)
    {
        _assistantClient = assistantAgentClient;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        var activity = RootSpan.OfJob();
        activity?.SetAlwaysSample();

        try
        {
            await _assistantClient.TriggerTraceCleanupAsync(context.CancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
    }
}
