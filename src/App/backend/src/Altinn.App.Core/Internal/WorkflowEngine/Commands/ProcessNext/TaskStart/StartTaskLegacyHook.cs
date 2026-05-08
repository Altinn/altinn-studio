using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

#pragma warning disable CS0618 // Type or member is obsolete

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

/// <summary>
/// Payload for the StartTaskLegacyHook command.
/// </summary>
/// <param name="Prefill">Prefill data for the initial task start. Null for subsequent task transitions.</param>
internal sealed record StartTaskLegacyHookPayload(Dictionary<string, string>? Prefill) : CommandRequestPayload;

/// <summary>
/// Run the legacy IProcessTaskStart implementations defined in the app. No unit of work and rollback support.
/// </summary>
internal sealed class StartTaskLegacyHook : WorkflowEngineCommandBase<StartTaskLegacyHookPayload>
{
    public static string Key => "StartTaskLegacyHook";

    public override string GetKey() => Key;

    private readonly AppImplementationFactory _appImplementationFactory;

    public StartTaskLegacyHook(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        StartTaskLegacyHookPayload payload
    )
    {
        Instance instance = context.InstanceDataMutator.Instance;
        string? taskId = instance.Process.CurrentTask.ElementId;

        try
        {
            IEnumerable<IProcessTaskStart> handlers = _appImplementationFactory.GetAll<IProcessTaskStart>();

            foreach (IProcessTaskStart processTaskStarts in handlers)
            {
                await processTaskStarts.Start(taskId, instance, payload.Prefill);
            }
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }

        return new SuccessfulProcessEngineCommandResult();
    }
}
