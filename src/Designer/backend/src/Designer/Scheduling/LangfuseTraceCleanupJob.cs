using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;
using Altinn.Studio.Designer.Telemetry;
using Quartz;

namespace Altinn.Studio.Designer.Scheduling;

[DisallowConcurrentExecution]
public class LangfuseTraceCleanupJob : IJob
{
    private readonly IAltinityAgentClient _altinityAgentClient;

    public LangfuseTraceCleanupJob(IAltinityAgentClient altinityAgentClient)
    {
        _altinityAgentClient = altinityAgentClient;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        using var activity = ServiceTelemetry.Source.StartActivity(
            $"{nameof(LangfuseTraceCleanupJob)}.{nameof(Execute)}",
            ActivityKind.Internal
        );
        activity?.SetAlwaysSample();

        try
        {
            await _altinityAgentClient.TriggerTraceCleanupAsync(context.CancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            activity?.SetStatus(ActivityStatusCode.Error);
            activity?.AddException(ex);
            throw;
        }
    }
}
