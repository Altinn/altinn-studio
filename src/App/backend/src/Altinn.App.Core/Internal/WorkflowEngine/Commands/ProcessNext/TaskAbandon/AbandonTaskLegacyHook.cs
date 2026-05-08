using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;

/// <summary>
/// Run the legacy IProcessTaskAbandon implementations defined in the app. No unit of work and rollback support.
/// </summary>
internal sealed class AbandonTaskLegacyHook : IWorkflowEngineCommand
{
    public static string Key => "AbandonTaskLegacyHook";

    public string GetKey() => Key;

    private readonly AppImplementationFactory _appImplementationFactory;

    public AbandonTaskLegacyHook(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;
        string taskId = instance.Process.CurrentTask.ElementId;

        try
        {
            var handlers = _appImplementationFactory.GetAll<IProcessTaskAbandon>();
            foreach (IProcessTaskAbandon handler in handlers)
            {
                await handler.Abandon(taskId, instance);
            }

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
